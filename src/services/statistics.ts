import { NASA_VARIABLES } from '../config/nasaCatalog';
import type {
  AnomalyRecord,
  ComputedStatisticsBundle,
  CorrelationPairResult,
  EarthSignalScoreResult,
  NasaDatasetResponse,
  NasaVariableId,
  TrendAnalysisResult,
  TrendCategory,
  TrendConvergenceResult,
} from '../types/orbitera';

/**
 * Normal CDF approximation (Abramowitz & Stegun 7.1.26) for two-tailed p-value estimation.
 */
function normalCdf(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

function twoTailedPFromZ(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
}

/**
 * Mann-Kendall non-parametric trend test with tie correction.
 */
function computeMannKendall(values: number[]): {
  s: number;
  z: number;
  pValue: number;
} {
  const n = values.length;
  if (n < 4) return { s: 0, z: 0, pValue: 1 };

  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
    }
  }

  // Tie correction
  const freq = new Map<number, number>();
  for (const v of values) {
    const rounded = Math.round(v * 1e6) / 1e6;
    freq.set(rounded, (freq.get(rounded) ?? 0) + 1);
  }
  let tieCorrection = 0;
  for (const count of freq.values()) {
    if (count > 1) {
      tieCorrection += count * (count - 1) * (2 * count + 5);
    }
  }

  const varS = (n * (n - 1) * (2 * n + 5) - tieCorrection) / 18;
  if (varS <= 0) return { s, z: 0, pValue: 1 };

  let z = 0;
  if (s > 0) z = (s - 1) / Math.sqrt(varS);
  else if (s < 0) z = (s + 1) / Math.sqrt(varS);

  const pValue = twoTailedPFromZ(z);
  return { s, z, pValue };
}

/**
 * Sen's slope estimator: median of all pairwise slopes (per unit x).
 */
function computeSensSlope(xs: number[], ys: number[]): number {
  const slopes: number[] = [];
  const n = ys.length;
  // Cap pairwise count for very large daily series by subsampling evenly if n > 400
  const step = n > 400 ? Math.ceil(n / 400) : 1;
  const sampledIndices: number[] = [];
  for (let i = 0; i < n; i += step) sampledIndices.push(i);

  for (let a = 0; a < sampledIndices.length - 1; a++) {
    for (let b = a + 1; b < sampledIndices.length; b++) {
      const i = sampledIndices[a];
      const j = sampledIndices[b];
      const dx = xs[j] - xs[i];
      if (dx !== 0) {
        slopes.push((ys[j] - ys[i]) / dx);
      }
    }
  }
  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0
    ? (slopes[mid - 1] + slopes[mid]) / 2
    : slopes[mid];
}

function classifyTrend(
  n: number,
  z: number,
  pValue: number,
  slopePerDecade: number,
  stdDev: number
): TrendCategory {
  if (n < 6) return 'Insufficient Data';
  // Documented threshold: two-tailed alpha = 0.05 (|Z| >= 1.96)
  if (pValue < 0.05 && Math.abs(z) >= 1.96) {
    return slopePerDecade > 0 ? 'Increasing' : 'Decreasing';
  }
  // If p < 0.15, directional tendency exists but statistical significance is borderline
  if (pValue < 0.15) {
    return 'Uncertain';
  }
  // Otherwise, if slope magnitude over the span is negligible relative to noise, Stable
  if (stdDev > 0 && Math.abs(slopePerDecade) < stdDev * 0.15) {
    return 'Stable';
  }
  return 'Uncertain';
}

export function analyzeVariableTrend(
  dataset: NasaDatasetResponse,
  variable: NasaVariableId
): TrendAnalysisResult {
  const meta = NASA_VARIABLES[variable];
  const validRows = dataset.observations
    .map((obs) => ({
      dateKey: obs.dateKey,
      x: obs.decimalYear,
      y: obs.values[variable] ?? null,
    }))
    .filter((r): r is { dateKey: string; x: number; y: number } =>
      r.y !== null && Number.isFinite(r.y)
    );

  const missingCount = dataset.observations.length - validRows.length;
  const n = validRows.length;

  if (n < 2) {
    return {
      variable,
      unit: meta.unit,
      sampleCount: n,
      missingCount,
      startPeriod: validRows[0]?.dateKey ?? String(dataset.startYear),
      endPeriod: validRows[n - 1]?.dateKey ?? String(dataset.endYear),
      mean: validRows[0]?.y ?? 0,
      min: validRows[0]?.y ?? 0,
      max: validRows[0]?.y ?? 0,
      stdDev: 0,
      olsSlopePerYear: 0,
      olsSlopePerDecade: 0,
      olsIntercept: 0,
      slopeConfidenceInterval95: [0, 0],
      rSquared: 0,
      olsPValue: 1,
      sensSlopePerDecade: 0,
      mannKendallS: 0,
      mannKendallZ: 0,
      mannKendallPValue: 1,
      totalEstimatedChange: 0,
      percentChangeFromBaseline: null,
      category: 'Insufficient Data',
      isStatisticallySignificant: false,
      regressionSeries: [],
      methodologyNote: 'Fewer than 6 valid observations; trend computation cannot be established.',
    };
  }

  const xs = validRows.map((r) => r.x);
  const ys = validRows.map((r) => r.y);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let min = Infinity;
  let max = -Infinity;
  for (const y of ys) {
    if (y < min) min = y;
    if (y > max) max = y;
  }

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const stdDev = Math.sqrt(syy / Math.max(1, n - 1));
  const olsSlopePerYear = sxx > 0 ? sxy / sxx : 0;
  const olsIntercept = meanY - olsSlopePerYear * meanX;
  const olsSlopePerDecade = olsSlopePerYear * 10;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = olsSlopePerYear * xs[i] + olsIntercept;
    sse += (ys[i] - pred) ** 2;
  }
  const rSquared = syy > 0 ? Math.max(0, Math.min(1, 1 - sse / syy)) : 0;
  const residualStdErr = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  const slopeStdErr = sxx > 0 ? residualStdErr / Math.sqrt(sxx) : 0;
  const tStat = slopeStdErr > 0 ? olsSlopePerYear / slopeStdErr : 0;
  const olsPValue = twoTailedPFromZ(tStat);
  const ciMarginPerDecade = 1.96 * slopeStdErr * 10;

  const mk = computeMannKendall(ys);
  const sensPerYear = computeSensSlope(xs, ys);
  const sensSlopePerDecade = sensPerYear * 10;

  const spanYears = Math.max(0.1, xs[n - 1] - xs[0]);
  const totalEstimatedChange = olsSlopePerYear * spanYears;

  const firstSlice = ys.slice(0, Math.min(12, Math.max(1, Math.floor(n / 5))));
  const baselineMean = firstSlice.reduce((a, b) => a + b, 0) / firstSlice.length;
  const percentChangeFromBaseline =
    Math.abs(baselineMean) > 0.5 && meta.unit !== '°C'
      ? (totalEstimatedChange / Math.abs(baselineMean)) * 100
      : null;

  const category = classifyTrend(n, mk.z, mk.pValue, olsSlopePerDecade, stdDev);
  const isStatisticallySignificant = mk.pValue < 0.05 && Math.abs(mk.z) >= 1.96;

  const regressionSeries = validRows.map((r) => ({
    dateKey: r.dateKey,
    observed: Number(r.y.toFixed(3)),
    trendLine: Number((olsSlopePerYear * r.x + olsIntercept).toFixed(3)),
  }));

  return {
    variable,
    unit: meta.unit,
    sampleCount: n,
    missingCount,
    startPeriod: validRows[0].dateKey,
    endPeriod: validRows[n - 1].dateKey,
    mean: Number(meanY.toFixed(3)),
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    stdDev: Number(stdDev.toFixed(3)),
    olsSlopePerYear: Number(olsSlopePerYear.toFixed(4)),
    olsSlopePerDecade: Number(olsSlopePerDecade.toFixed(3)),
    olsIntercept: Number(olsIntercept.toFixed(3)),
    slopeConfidenceInterval95: [
      Number((olsSlopePerDecade - ciMarginPerDecade).toFixed(3)),
      Number((olsSlopePerDecade + ciMarginPerDecade).toFixed(3)),
    ],
    rSquared: Number(rSquared.toFixed(4)),
    olsPValue: Number(olsPValue.toFixed(4)),
    sensSlopePerDecade: Number(sensSlopePerDecade.toFixed(3)),
    mannKendallS: mk.s,
    mannKendallZ: Number(mk.z.toFixed(3)),
    mannKendallPValue: Number(mk.pValue.toFixed(4)),
    totalEstimatedChange: Number(totalEstimatedChange.toFixed(3)),
    percentChangeFromBaseline:
      percentChangeFromBaseline !== null
        ? Number(percentChangeFromBaseline.toFixed(1))
        : null,
    category,
    isStatisticallySignificant,
    regressionSeries,
    methodologyNote:
      'OLS linear regression + non-parametric Mann-Kendall test (α = 0.05, |Z| ≥ 1.96) + Sen’s median slope estimator.',
  };
}

/**
 * Seasonal-baseline Z-score anomaly detection.
 * For monthly/daily data, computes separate mean & stdDev per calendar month so seasonal cycles
 * (e.g. summer vs monsoon) are NOT mistaken for anomalies.
 */
export function detectVariableAnomalies(
  dataset: NasaDatasetResponse,
  variable: NasaVariableId
): AnomalyRecord[] {
  const meta = NASA_VARIABLES[variable];
  const validObs = dataset.observations.filter(
    (o) => typeof o.values[variable] === 'number' && Number.isFinite(o.values[variable] as number)
  );

  if (validObs.length < 6) return [];

  const isSeasonal = dataset.resolution !== 'annual';
  const buckets = new Map<number, number[]>();

  for (const obs of validObs) {
    const key = isSeasonal && obs.month ? obs.month : 0;
    const val = obs.values[variable] as number;
    const arr = buckets.get(key) ?? [];
    arr.push(val);
    buckets.set(key, arr);
  }

  const statsByBucket = new Map<number, { mean: number; stdDev: number }>();
  for (const [key, arr] of buckets.entries()) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance =
      arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, arr.length - 1);
    statsByBucket.set(key, { mean, stdDev: Math.sqrt(variance) });
  }

  const thresholdModerate = isSeasonal ? 2.0 : 1.5;
  const thresholdNotable = isSeasonal ? 2.5 : 2.0;

  const anomalies: AnomalyRecord[] = [];
  for (const obs of validObs) {
    const key = isSeasonal && obs.month ? obs.month : 0;
    const bucketStats = statsByBucket.get(key);
    if (!bucketStats || bucketStats.stdDev < 1e-6) continue;

    const val = obs.values[variable] as number;
    const deviation = val - bucketStats.mean;
    const zScore = deviation / bucketStats.stdDev;

    if (Math.abs(zScore) >= thresholdModerate) {
      anomalies.push({
        id: `${variable}-${obs.dateKey}`,
        variable,
        unit: meta.unit,
        dateKey: obs.dateKey,
        year: obs.year,
        month: obs.month,
        observed: Number(val.toFixed(3)),
        baselineMean: Number(bucketStats.mean.toFixed(3)),
        baselineStdDev: Number(bucketStats.stdDev.toFixed(3)),
        deviation: Number(deviation.toFixed(3)),
        zScore: Number(zScore.toFixed(2)),
        direction: deviation >= 0 ? 'Above Baseline' : 'Below Baseline',
        severity:
          Math.abs(zScore) >= thresholdNotable
            ? 'Notable Deviation'
            : 'Moderate Deviation',
        detectionMethod: isSeasonal
          ? 'Month-of-Year Seasonal Baseline Z-Score (|Z| ≥ 2.0σ)'
          : 'Full-Period Annual Baseline Z-Score (|Z| ≥ 1.5σ)',
      });
    }
  }

  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return anomalies;
}

function rankArray(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function pearsonCorrelation(xs: number[], ys: number[]): { r: number; pValue: number } | null {
  const n = xs.length;
  if (n < 3) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den < 1e-9) return null;
  const r = Math.max(-1, Math.min(1, num / den));
  const t = Math.abs(r) >= 0.9999 ? 10 : (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  return { r, pValue: twoTailedPFromZ(t) };
}

export function computeVariableCorrelation(
  dataset: NasaDatasetResponse,
  varA: NasaVariableId,
  varB: NasaVariableId
): CorrelationPairResult {
  const pairs = dataset.observations
    .map((obs) => ({
      dateKey: obs.dateKey,
      x: obs.values[varA] ?? null,
      y: obs.values[varB] ?? null,
    }))
    .filter(
      (p): p is { dateKey: string; x: number; y: number } =>
        p.x !== null && p.y !== null && Number.isFinite(p.x) && Number.isFinite(p.y)
    );

  const warnings: string[] = [];
  if (pairs.length < 12) {
    warnings.push(
      `Small sample size (N = ${pairs.length}). Correlations on fewer than 12 paired observations have elevated sampling variance.`
    );
  }
  if (dataset.resolution === 'monthly') {
    warnings.push(
      'Monthly series include shared seasonal cycles; co-movement may reflect synchronous monsoon or solar seasonality rather than direct forcing.'
    );
  }

  if (pairs.length < 4) {
    return {
      varA,
      varB,
      sampleCount: pairs.length,
      pearsonR: null,
      pearsonPValue: null,
      spearmanRho: null,
      spearmanPValue: null,
      strengthLabel: 'Insufficient Data',
      directionLabel: 'None',
      warnings: [...warnings, 'At least 4 paired valid observations are required.'],
      scatterPoints: pairs,
    };
  }

  const xs = pairs.map((p) => p.x);
  const ys = pairs.map((p) => p.y);
  const pearson = pearsonCorrelation(xs, ys);
  const spearman = pearsonCorrelation(rankArray(xs), rankArray(ys));

  const primaryR = pearson?.r ?? spearman?.r ?? 0;
  const absR = Math.abs(primaryR);
  const strengthLabel =
    absR >= 0.7
      ? 'Strong'
      : absR >= 0.4
      ? 'Moderate'
      : absR >= 0.2
      ? 'Weak'
      : 'Negligible';

  return {
    varA,
    varB,
    sampleCount: pairs.length,
    pearsonR: pearson ? Number(pearson.r.toFixed(3)) : null,
    pearsonPValue: pearson ? Number(pearson.pValue.toFixed(4)) : null,
    spearmanRho: spearman ? Number(spearman.r.toFixed(3)) : null,
    spearmanPValue: spearman ? Number(spearman.pValue.toFixed(4)) : null,
    strengthLabel,
    directionLabel: absR < 0.1 ? 'None' : primaryR > 0 ? 'Positive' : 'Negative',
    warnings,
    scatterPoints: pairs.map((p) => ({
      dateKey: p.dateKey,
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
    })),
  };
}

/**
 * FEATURE A — EARTH SIGNAL SCORE
 * Transparent, documented composite indicator (0–100) derived strictly from computed statistics:
 * - Significance Factor (0..40): min(40, (|Z_MK| / 3.5) * 40) across primary variables
 * - Variance Explained (0..25): max R^2 * 25 across analyzed variables
 * - Data Completeness (0..20): average completeness % * 0.20
 * - Anomaly Density (0..15): min(15, (anomalies / totalObs) * 150)
 */
export function computeEarthSignalScore(
  dataset: NasaDatasetResponse,
  trends: Partial<Record<NasaVariableId, TrendAnalysisResult>>,
  anomalies: AnomalyRecord[]
): EarthSignalScoreResult {
  const trendList = Object.values(trends).filter((t): t is TrendAnalysisResult => Boolean(t));
  if (trendList.length === 0 || trendList.every((t) => t.category === 'Insufficient Data')) {
    return {
      overallScore: 0,
      label: 'Insufficient Data',
      factors: {
        significanceScore: 0,
        varianceScore: 0,
        completenessScore: 0,
        anomalyFactorScore: 0,
      },
      formulaSummary:
        'Composite index = Significance (40) + R² Variance (25) + Data Completeness (20) + Anomaly Density (15).',
      limitations: 'Insufficient valid NASA observations to compute signal strength.',
    };
  }

  const maxAbsZ = Math.max(...trendList.map((t) => Math.abs(t.mannKendallZ)));
  const maxR2 = Math.max(...trendList.map((t) => t.rSquared));
  const completenessVals = Object.values(dataset.quality.completenessPercentByVariable).filter(
    (v): v is number => typeof v === 'number'
  );
  const avgCompleteness =
    completenessVals.length > 0
      ? completenessVals.reduce((a, b) => a + b, 0) / completenessVals.length
      : 100;

  const totalObs = Math.max(1, dataset.observations.length * dataset.variables.length);
  const anomalyRate = anomalies.length / totalObs;

  const significanceScore = Number(Math.min(40, (maxAbsZ / 3.5) * 40).toFixed(1));
  const varianceScore = Number(Math.min(25, maxR2 * 25).toFixed(1));
  const completenessScore = Number(((avgCompleteness / 100) * 20).toFixed(1));
  const anomalyFactorScore = Number(Math.min(15, anomalyRate * 150).toFixed(1));

  const overallScore = Math.round(
    significanceScore + varianceScore + completenessScore + anomalyFactorScore
  );

  const label =
    overallScore >= 70
      ? 'Strong Signal'
      : overallScore >= 45
      ? 'Moderate Signal'
      : overallScore >= 25
      ? 'Emerging Signal'
      : 'Weak / Unclear Signal';

  return {
    overallScore,
    label,
    factors: {
      significanceScore,
      varianceScore,
      completenessScore,
      anomalyFactorScore,
    },
    formulaSummary:
      '40 × min(1, |Z_MK|/3.5) + 25 × max(R²) + 20 × (Completeness%) + 15 × min(1, 10 × AnomalyRate). Purely statistical; not a predictive risk index.',
    limitations:
      'Reflects statistical detectability of historical change within this dataset and grid cell; high seasonality can keep R² modest even when Mann-Kendall Z is significant.',
  };
}

/**
 * FEATURE B — TREND CONVERGENCE DETECTOR
 */
export function detectTrendConvergence(
  dataset: NasaDatasetResponse,
  trends: Partial<Record<NasaVariableId, TrendAnalysisResult>>,
  correlations: CorrelationPairResult[]
): TrendConvergenceResult {
  const trendList = Object.values(trends).filter((t): t is TrendAnalysisResult => Boolean(t));
  const significant = trendList.filter(
    (t) => t.category === 'Increasing' || t.category === 'Decreasing'
  );
  const period = `${dataset.startYear}–${dataset.endYear}`;

  if (significant.length >= 2) {
    const desc = significant
      .map(
        (t) =>
          `${NASA_VARIABLES[t.variable].shortLabel} (${t.category}, ${
            t.olsSlopePerDecade >= 0 ? '+' : ''
          }${t.olsSlopePerDecade} ${t.unit}/decade, p=${t.mannKendallPValue})`
      )
      .join('; ');
    const strongCorr = correlations.find(
      (c) => c.strengthLabel === 'Strong' || c.strengthLabel === 'Moderate'
    );
    return {
      hasConvergence: true,
      convergingVariables: significant.map((t) => t.variable),
      overlappingPeriod: period,
      summary: `Simultaneous statistically significant directional shifts detected across ${significant.length} variables during ${period}: ${desc}.`,
      statisticalBasis: strongCorr
        ? `${NASA_VARIABLES[strongCorr.varA].shortLabel} & ${NASA_VARIABLES[strongCorr.varB].shortLabel} show a ${strongCorr.strengthLabel.toLowerCase()} ${strongCorr.directionLabel.toLowerCase()} association (Pearson r=${strongCorr.pearsonR}, Spearman ρ=${strongCorr.spearmanRho}).`
        : 'Multiple variables independently cross the α = 0.05 Mann-Kendall significance threshold over the same observation window.',
      limitationNote:
        'Simultaneous trends or statistical correlation do not establish direct causation; shared regional climate drivers or gridded assimilation effects may underlie both signals.',
    };
  }

  return {
    hasConvergence: false,
    convergingVariables: significant.map((t) => t.variable),
    overlappingPeriod: period,
    summary:
      significant.length === 1
        ? `Only ${NASA_VARIABLES[significant[0].variable].shortLabel} shows a statistically significant trend over ${period}; multi-variable convergence is not established.`
        : `No multi-variable simultaneous significant trend convergence was detected over ${period}.`,
    statisticalBasis:
      'Requires at least 2 environmental variables with p < 0.05 (|Z_MK| ≥ 1.96) over the overlapping time span.',
    limitationNote:
      'Seasonal variability or short observation windows may mask multi-variable co-evolution.',
  };
}

export function runScientificComputationEngine(
  dataset: NasaDatasetResponse
): ComputedStatisticsBundle {
  const trends: Partial<Record<NasaVariableId, TrendAnalysisResult>> = {};
  const allAnomalies: AnomalyRecord[] = [];

  for (const variable of dataset.variables) {
    trends[variable] = analyzeVariableTrend(dataset, variable);
    allAnomalies.push(...detectVariableAnomalies(dataset, variable));
  }

  allAnomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  const correlations: CorrelationPairResult[] = [];
  for (let i = 0; i < dataset.variables.length; i++) {
    for (let j = i + 1; j < dataset.variables.length; j++) {
      correlations.push(
        computeVariableCorrelation(dataset, dataset.variables[i], dataset.variables[j])
      );
    }
  }

  const earthSignalScore = computeEarthSignalScore(dataset, trends, allAnomalies);
  const convergence = detectTrendConvergence(dataset, trends, correlations);

  return {
    trends,
    anomalies: allAnomalies,
    correlations,
    earthSignalScore,
    convergence,
    computedAt: new Date().toISOString(),
  };
}
