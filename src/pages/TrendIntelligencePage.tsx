import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NASA_VARIABLES } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  EmptyState,
  KpiCard,
  PanelCard,
  SectionHeader,
  TrendIndicatorLabel,
} from '../components/ui/Primitives';
import type { NasaVariableId } from '../types/orbitera';

export function TrendIntelligencePage() {
  const { activeInvestigation, setActiveTab } = useOrbitera();
  const chartTheme = useChartTheme();
  const [selectedVar, setSelectedVar] = useState<NasaVariableId>(
    activeInvestigation?.dataset.variables[0] ?? 'T2M'
  );

  useEffect(() => {
    if (
      activeInvestigation &&
      !activeInvestigation.dataset.variables.includes(selectedVar)
    ) {
      setSelectedVar(activeInvestigation.dataset.variables[0]);
    }
  }, [activeInvestigation, selectedVar]);

  if (!activeInvestigation) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Trend Intelligence Center"
          subtitle="Quantify decadal slopes, Mann-Kendall significance, Sen’s median slopes, and regression confidence bounds."
        />
        <EmptyState
          title="No Investigation Active"
          description="Run an investigation to compute OLS regression, Mann-Kendall statistics, and Sen's slope trajectories."
          actionLabel="Start Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      </div>
    );
  }

  const trend = activeInvestigation.statistics.trends[selectedVar];
  const anomalyMap = new Map(
    activeInvestigation.statistics.anomalies
      .filter((a) => a.variable === selectedVar)
      .map((a) => [a.dateKey, a.observed])
  );

  const chartData =
    trend?.regressionSeries.map((pt) => ({
      ...pt,
      anomalyPoint: anomalyMap.get(pt.dateKey) ?? null,
    })) ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trend Intelligence Center"
        subtitle={`${activeInvestigation.config.locationName} (${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear}) · OLS Regression + Mann-Kendall Non-Parametric Significance + Sen's Slope`}
        action={
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1">
            {activeInvestigation.dataset.variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedVar(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedVar === v
                    ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                }`}
              >
                {NASA_VARIABLES[v].shortLabel}
              </button>
            ))}
          </div>
        }
      />

      {trend && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Trend Classification"
              value={trend.category}
              trendIndicator={<TrendIndicatorLabel category={trend.category} />}
              detail={`MK α = 0.05 threshold (|Z| ≥ 1.96)`}
            />
            <KpiCard
              label="OLS Slope / Decade"
              value={`${trend.olsSlopePerDecade >= 0 ? '+' : ''}${trend.olsSlopePerDecade}`}
              unit={`${trend.unit}/dec`}
              detail={`95% CI [${trend.slopeConfidenceInterval95[0]}, ${trend.slopeConfidenceInterval95[1]}]`}
            />
            <KpiCard
              label="Sen’s Median Slope"
              value={`${trend.sensSlopePerDecade >= 0 ? '+' : ''}${trend.sensSlopePerDecade}`}
              unit={`${trend.unit}/dec`}
              detail="Non-parametric robust estimator"
            />
            <KpiCard
              label="Mann-Kendall Test"
              value={`Z = ${trend.mannKendallZ}`}
              detail={`p = ${trend.mannKendallPValue} · S = ${trend.mannKendallS}`}
            />
            <KpiCard
              label="Sample Coverage"
              value={trend.sampleCount}
              unit="obs"
              detail={`${trend.missingCount} missing · R² = ${trend.rSquared}`}
            />
          </div>

          <PanelCard
            title={`${NASA_VARIABLES[selectedVar].label} — Historical Series & Regression Fit`}
            subtitle={`Period ${trend.startPeriod} to ${trend.endPeriod} · Mean ${trend.mean} ${trend.unit} (Range ${trend.min}–${trend.max} ${trend.unit})`}
            rightSlot={<TrendIndicatorLabel category={trend.category} />}
          >
            <div className="h-[370px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="dateKey" tick={{ fontSize: 11, fill: chartTheme.tickFill }} minTickGap={30} />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                    domain={['auto', 'auto']}
                    unit={` ${trend.unit}`}
                  />
                  <Tooltip contentStyle={chartTheme.tooltipStyle} />
                  <Legend wrapperStyle={chartTheme.legendStyle} />
                  <Line
                    type="monotone"
                    dataKey="observed"
                    name={`Observed (${trend.unit})`}
                    stroke="#38BDF8"
                    strokeWidth={1.75}
                    dot={false}
                  />
                  <Line
                    type="linear"
                    dataKey="trendLine"
                    name="OLS Regression Line"
                    stroke="#F87171"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Scatter
                    dataKey="anomalyPoint"
                    name="Seasonal Anomaly (|Z| ≥ 2σ)"
                    fill="#F59E0B"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard
            title="All Analyzed Variables — Statistical Summary Table"
            subtitle="Thresholds: Increasing/Decreasing requires Mann-Kendall p < 0.05 and |Z| ≥ 1.96; p < 0.15 classified as Uncertain; N < 6 classified as Insufficient Data."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8]">
                    <th className="py-2.5 pr-4 font-medium">Variable</th>
                    <th className="py-2.5 pr-4 font-medium">Category</th>
                    <th className="py-2.5 pr-4 font-medium text-right">OLS Slope / Dec</th>
                    <th className="py-2.5 pr-4 font-medium text-right">Sen’s Slope / Dec</th>
                    <th className="py-2.5 pr-4 font-medium text-right">MK Z-Score</th>
                    <th className="py-2.5 pr-4 font-medium text-right">p-Value</th>
                    <th className="py-2.5 pr-4 font-medium text-right">R²</th>
                    <th className="py-2.5 font-medium text-right">Samples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
                  {Object.values(activeInvestigation.statistics.trends)
                    .filter((t): t is NonNullable<typeof t> => Boolean(t))
                    .map((t) => (
                      <tr key={t.variable} className="hover:bg-[#F5F9FF]/40 dark:hover:bg-[#111C38]/70">
                        <td className="py-3 pr-4 font-medium text-[#101828] dark:text-[#F1F5F9]">
                          {NASA_VARIABLES[t.variable].label} ({t.variable})
                        </td>
                        <td className="py-3 pr-4">
                          <TrendIndicatorLabel category={t.category} />
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {t.olsSlopePerDecade >= 0 ? '+' : ''}
                          {t.olsSlopePerDecade} {t.unit}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {t.sensSlopePerDecade >= 0 ? '+' : ''}
                          {t.sensSlopePerDecade} {t.unit}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{t.mannKendallZ}</td>
                        <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {t.mannKendallPValue}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{t.rSquared}</td>
                        <td className="py-3 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{t.sampleCount}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </>
      )}
    </div>
  );
}
