import { AGENT_DEFINITIONS, NASA_VARIABLES } from '../config/nasaCatalog';
import {
  fetchNasaPowerData,
  runAnalyticalAgents,
  runEarthScoutAgent,
} from './api';
import { runScientificComputationEngine } from './statistics';
import type {
  AgentId,
  AgentRecord,
  ComputedStatisticsBundle,
  InvestigationConfig,
  InvestigationRecord,
  NasaDatasetResponse,
  NextInvestigationRecommendation,
  ScientificReport,
} from '../types/orbitera';

export function createInitialAgents(): AgentRecord[] {
  return AGENT_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    role: def.role,
    mission: def.mission,
    status: 'Idle',
    progress: 0,
    currentTask: 'Awaiting investigation launch',
  }));
}

function buildScientificReport(
  config: InvestigationConfig,
  dataset: NasaDatasetResponse,
  statistics: ComputedStatisticsBundle,
  synthesis: Awaited<ReturnType<typeof runAnalyticalAgents>>['synthesis']
): ScientificReport {
  const trendEntries = Object.values(statistics.trends).filter(Boolean);
  const varLabels = config.variables.map(
    (v) => `${NASA_VARIABLES[v].label} (${v}, ${NASA_VARIABLES[v].unit})`
  );

  const executiveSummary =
    synthesis.executiveSummary ||
    `This investigation examines ${varLabels.join(', ')} for ${config.locationName} (${config.latitude.toFixed(
      4
    )}°, ${config.longitude.toFixed(4)}°) from ${config.startYear} to ${config.endYear} using ${
      dataset.sourceName
    }. ${synthesis.trendDetective.summary}`;

  const recommendations: NextInvestigationRecommendation[] = (
    synthesis.recommendations ?? []
  ).map((r) => ({
    title: r.title,
    rationale: r.rationale,
    category: (r.category as NextInvestigationRecommendation['category']) || 'Variable Expansion',
    suggestedQuery: r.suggestedQuery,
  }));

  return {
    investigationTitle: config.title,
    executiveSummary,
    geographicRegion: `${config.locationName}${config.regionLabel ? ` — ${config.regionLabel}` : ''}`,
    coordinates: `${config.latitude.toFixed(4)}° N/S, ${config.longitude.toFixed(4)}° E/W${
      dataset.elevationMeters !== null ? ` · Elevation ${dataset.elevationMeters.toFixed(0)} m` : ''
    }`,
    investigationPeriod: `${config.startYear}–${config.endYear} (${config.resolution} resolution, ${dataset.observations.length} records)`,
    environmentalVariables: varLabels,
    nasaDataSources: [
      `${dataset.sourceName} (${dataset.datasetVersion})`,
      `Retrieved: ${new Date(dataset.retrievedAt).toUTCString()}`,
      'Supplementary context: NASA Worldview (GIBS), NASA Giovanni, NASA Earthdata',
    ],
    methodology:
      'Programmatic time-series validation (filtering -999 fill sentinels), Ordinary Least Squares (OLS) linear trend estimation with 95% confidence intervals, non-parametric Mann-Kendall significance testing (α = 0.05, |Z| ≥ 1.96), Sen’s median slope estimator, month-of-year seasonal baseline Z-score anomaly detection, and Pearson/Spearman cross-variable correlation analysis.',
    trendFindings:
      synthesis.trendDetective.summary ||
      trendEntries
        .map(
          (t) =>
            `${t!.variable}: ${t!.category} (${t!.olsSlopePerDecade} ${t!.unit}/decade, MK p=${t!.mannKendallPValue})`
        )
        .join(' '),
    anomalyFindings: synthesis.anomalyHunter.summary,
    correlationFindings: synthesis.correlationIntelligence.summary,
    scientificInterpretation: synthesis.earthExplainer.scientificMode,
    simplifiedInterpretation: synthesis.earthExplainer.simplifiedMode,
    environmentalImplications: synthesis.earthExplainer.environmentalImplications,
    limitations: [
      ...dataset.limitations,
      synthesis.earthExplainer.uncertaintyStatement,
      'AI-generated narratives summarize computed statistics and are not official NASA agency conclusions.',
    ],
    recommendedFollowUp: recommendations,
    references: [
      'NASA Langley Research Center (LaRC) POWER Project API v2 — https://power.larc.nasa.gov/',
      'NASA MERRA-2 Global Atmospheric Reanalysis — https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/',
      'NASA CERES SYN1deg Surface Radiation — https://ceres.larc.nasa.gov/',
      'NASA Worldview / GIBS Earth Imagery — https://worldview.earthdata.nasa.gov/',
      'Kendall, M.G. (1975) Rank Correlation Methods; Sen, P.K. (1968) Estimates of the Regression Coefficient.',
    ],
    generatedAt: new Date().toISOString(),
  };
}

export interface OrchestrationCallbacks {
  onAgentsUpdate: (agents: AgentRecord[]) => void;
  onStageMessage: (msg: string) => void;
}

export async function executeInvestigationPipeline(
  config: InvestigationConfig,
  callbacks: OrchestrationCallbacks,
  signal?: AbortSignal
): Promise<InvestigationRecord> {
  let agents: AgentRecord[] = createInitialAgents().map((a) => ({
    ...a,
    status: 'Queued',
    currentTask: 'Queued in orchestration pipeline',
  }));
  callbacks.onAgentsUpdate(agents);

  const updateAgent = (id: AgentId, patch: Partial<AgentRecord>) => {
    agents = agents.map((a) => (a.id === id ? { ...a, ...patch } : a));
    callbacks.onAgentsUpdate(agents);
  };

  // STEP 1: Agent 1 — Earth Scout
  const scoutStart = Date.now();
  callbacks.onStageMessage('Agent 1 (Earth Scout) identifying NASA datasets and parameters...');
  updateAgent('earth_scout', {
    status: 'Running',
    progress: 35,
    startedAt: new Date().toISOString(),
    currentTask: `Evaluating NASA POWER parameters for ${config.locationName}`,
    inputsSummary: `${config.variables.join(', ')} · ${config.startYear}–${config.endYear}`,
  });

  let scoutResult: { output: Record<string, unknown>; usedGemini: boolean };
  try {
    scoutResult = await runEarthScoutAgent(config, signal);
    updateAgent('earth_scout', {
      status: 'Completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - scoutStart,
      currentTask: 'Dataset discovery complete',
      outputSummary: String(
        scoutResult.output.summary ?? 'Identified NASA POWER MERRA-2 & CERES parameters.'
      ),
      structuredOutput: scoutResult.output,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    updateAgent('earth_scout', {
      status: 'Failed',
      progress: 100,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - scoutStart,
      currentTask: 'Discovery step failed',
      errorMessage: err instanceof Error ? err.message : 'Earth Scout error',
    });
    throw err;
  }

  // STEP 2: NASA POWER Data Retrieval + Validation + Computation Engine
  callbacks.onStageMessage('Retrieving live NASA POWER satellite/reanalysis measurements...');
  updateAgent('trend_detective', {
    status: 'Running',
    progress: 20,
    startedAt: new Date().toISOString(),
    currentTask: 'Awaiting validated NASA POWER observations',
  });
  updateAgent('anomaly_hunter', {
    status: 'Running',
    progress: 20,
    startedAt: new Date().toISOString(),
    currentTask: 'Awaiting validated NASA POWER observations',
  });
  updateAgent('correlation_intelligence', {
    status: config.variables.length >= 2 ? 'Running' : 'Skipped',
    progress: config.variables.length >= 2 ? 20 : 100,
    startedAt: new Date().toISOString(),
    currentTask:
      config.variables.length >= 2
        ? 'Awaiting paired variable series'
        : 'Skipped (single-variable investigation)',
    outputSummary:
      config.variables.length < 2
        ? 'Requires ≥ 2 environmental variables to compute cross-variable correlations.'
        : undefined,
  });

  const dataset = await fetchNasaPowerData(
    {
      latitude: config.latitude,
      longitude: config.longitude,
      startYear: config.startYear,
      endYear: config.endYear,
      resolution: config.resolution,
      variables: config.variables,
    },
    signal
  );

  callbacks.onStageMessage(
    `Validated ${dataset.observations.length} NASA records. Executing statistical engine...`
  );

  const compStart = Date.now();
  const statistics = runScientificComputationEngine(dataset);
  const compDuration = Math.max(12, Date.now() - compStart);

  // STEP 3: Agents 2–6 Gemini Coordinated Synthesis grounded strictly in statistics
  callbacks.onStageMessage(
    'Coordinating Trend Detective, Anomaly Hunter, Correlation Intelligence, Earth Explainer & Mission Reporter...'
  );

  updateAgent('trend_detective', {
    progress: 65,
    currentTask: 'Computing OLS slopes, Mann-Kendall Z & Sen’s slope',
  });
  updateAgent('anomaly_hunter', {
    progress: 65,
    currentTask: 'Evaluating seasonal baseline Z-score deviations',
  });
  if (config.variables.length >= 2) {
    updateAgent('correlation_intelligence', {
      progress: 65,
      currentTask: 'Computing Pearson r & Spearman ρ matrices',
    });
  }
  updateAgent('earth_explainer', {
    status: 'Running',
    progress: 45,
    startedAt: new Date().toISOString(),
    currentTask: 'Synthesizing Scientific & Simplified Gen Z interpretations',
  });
  updateAgent('mission_reporter', {
    status: 'Running',
    progress: 30,
    startedAt: new Date().toISOString(),
    currentTask: 'Preparing 16-section scientific investigation report',
  });

  const synthStart = Date.now();
  const analysisRes = await runAnalyticalAgents(
    { config, dataset, statistics },
    signal
  );
  const synthDuration = Date.now() - synthStart;
  const nowIso = new Date().toISOString();

  const trendList = Object.values(statistics.trends).filter(Boolean);
  updateAgent('trend_detective', {
    status: 'Completed',
    progress: 100,
    completedAt: nowIso,
    durationMs: compDuration + Math.round(synthDuration * 0.35),
    currentTask: 'Trend classification complete',
    inputsSummary: `${dataset.observations.length} observations across ${config.variables.length} variable(s)`,
    outputSummary: analysisRes.synthesis.trendDetective.summary,
    structuredOutput: {
      trends: trendList.map((t) => ({
        variable: t!.variable,
        category: t!.category,
        olsSlopePerDecade: t!.olsSlopePerDecade,
        mannKendallZ: t!.mannKendallZ,
        pValue: t!.mannKendallPValue,
      })),
    },
  });

  updateAgent('anomaly_hunter', {
    status: 'Completed',
    progress: 100,
    completedAt: nowIso,
    durationMs: compDuration + Math.round(synthDuration * 0.3),
    currentTask: 'Anomaly screening complete',
    inputsSummary: `${dataset.resolution} seasonal baseline analysis`,
    outputSummary: analysisRes.synthesis.anomalyHunter.summary,
    structuredOutput: {
      anomalyCount: statistics.anomalies.length,
      topAnomalies: statistics.anomalies.slice(0, 5),
    },
  });

  if (config.variables.length >= 2) {
    updateAgent('correlation_intelligence', {
      status: 'Completed',
      progress: 100,
      completedAt: nowIso,
      durationMs: compDuration + Math.round(synthDuration * 0.3),
      currentTask: 'Correlation matrix complete',
      inputsSummary: `${statistics.correlations.length} variable pair(s)`,
      outputSummary: analysisRes.synthesis.correlationIntelligence.summary,
      structuredOutput: {
        correlations: statistics.correlations.map((c) => ({
          pair: `${c.varA} vs ${c.varB}`,
          pearsonR: c.pearsonR,
          spearmanRho: c.spearmanRho,
          strength: c.strengthLabel,
        })),
      },
    });
  }

  updateAgent('earth_explainer', {
    status: 'Completed',
    progress: 100,
    completedAt: nowIso,
    durationMs: Math.round(synthDuration * 0.6),
    currentTask: 'Dual-mode explanation ready',
    inputsSummary: `Earth Signal Score: ${statistics.earthSignalScore.overallScore}/100`,
    outputSummary: analysisRes.synthesis.earthExplainer.simplifiedMode,
    structuredOutput: analysisRes.synthesis.earthExplainer,
  });

  const report = buildScientificReport(config, dataset, statistics, analysisRes.synthesis);

  updateAgent('mission_reporter', {
    status: 'Completed',
    progress: 100,
    completedAt: nowIso,
    durationMs: Math.round(synthDuration * 0.4),
    currentTask: '16-section report compiled',
    inputsSummary: 'Consolidated outputs from Agents 1–5 + NASA POWER metadata',
    outputSummary: report.executiveSummary,
    structuredOutput: {
      sectionsCount: 16,
      followUpCount: report.recommendedFollowUp.length,
      generatedAt: report.generatedAt,
    },
  });

  return {
    id: config.id,
    createdAt: new Date().toISOString(),
    config,
    dataset,
    statistics,
    agents,
    report,
    aiGroundedByGemini: Boolean(scoutResult.usedGemini || analysisRes.usedGemini),
  };
}
