import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Compass, Database, FileText, RefreshCw } from 'lucide-react';
import { NASA_VARIABLES } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { LiveTelemetryPanel } from '../components/live/LiveTelemetryPanel';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  AgentStatusIndicator,
  EmptyState,
  ErrorBanner,
  KpiCard,
  LoadingSkeleton,
  PanelCard,
  SectionHeader,
  TrendIndicatorLabel,
} from '../components/ui/Primitives';

export function OverviewPage() {
  const {
    investigations,
    activeInvestigation,
    setActiveInvestigationId,
    setActiveTab,
    isRunning,
    pipelineStage,
    pipelineError,
    runInvestigation,
    agents,
    explanationMode,
  } = useOrbitera();
  const chartTheme = useChartTheme();

  const [periodFilter, setPeriodFilter] = useState<'all' | '10y' | '5y'>('all');

  const computedKpis = useMemo(() => {
    const totalInvestigations = investigations.length;
    const trendsDetected = investigations.reduce((acc, inv) => {
      const sigCount = Object.values(inv.statistics.trends).filter(
        (t) => t && (t.category === 'Increasing' || t.category === 'Decreasing')
      ).length;
      return acc + sigCount;
    }, 0);
    const anomaliesIdentified = investigations.reduce(
      (acc, inv) => acc + inv.statistics.anomalies.length,
      0
    );
    const uniqueVars = new Set<string>();
    const uniqueSources = new Set<string>();
    investigations.forEach((inv) => {
      inv.config.variables.forEach((v) => uniqueVars.add(v));
      uniqueSources.add(inv.dataset.sourceName);
    });
    return {
      totalInvestigations,
      trendsDetected,
      anomaliesIdentified,
      variablesCount: uniqueVars.size,
      sourcesCount: uniqueSources.size || 1,
    };
  }, [investigations]);

  const filteredObservations = useMemo(() => {
    if (!activeInvestigation) return [];
    const obs = activeInvestigation.dataset.observations;
    if (periodFilter === 'all') return obs;
    const maxYear = activeInvestigation.config.endYear;
    const cutoff = periodFilter === '5y' ? maxYear - 4 : maxYear - 9;
    return obs.filter((o) => o.year >= cutoff);
  }, [activeInvestigation, periodFilter]);

  const tempSeries = useMemo(() => {
    const tempVar = activeInvestigation?.dataset.variables.find((v) => v.startsWith('T2M'));
    if (!tempVar || !activeInvestigation) return [];
    const trend = activeInvestigation.statistics.trends[tempVar];
    const regMap = new Map(trend?.regressionSeries.map((r) => [r.dateKey, r.trendLine]) ?? []);
    return filteredObservations.map((o) => ({
      dateKey: o.dateKey,
      value: o.values[tempVar] ?? null,
      trend: regMap.get(o.dateKey) ?? null,
    }));
  }, [activeInvestigation, filteredObservations]);

  const precipSeries = useMemo(() => {
    if (!activeInvestigation?.dataset.variables.includes('PRECTOTCORR')) return [];
    return filteredObservations.map((o) => ({
      dateKey: o.dateKey,
      precipitation: o.values.PRECTOTCORR ?? null,
    }));
  }, [activeInvestigation, filteredObservations]);

  const timelineEvents = useMemo(() => {
    if (!activeInvestigation) return [];
    const anomalies = activeInvestigation.statistics.anomalies.slice(0, 5).map((a) => ({
      id: a.id,
      date: a.dateKey,
      title: `${NASA_VARIABLES[a.variable].shortLabel} ${a.severity}`,
      detail: `Observed ${a.observed} ${a.unit} vs baseline ${a.baselineMean} ${a.unit} (Z = ${a.zScore}σ)`,
    }));
    const trendStarts = Object.values(activeInvestigation.statistics.trends)
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({
        id: `trend-${t.variable}`,
        date: `${t.startPeriod} → ${t.endPeriod}`,
        title: `${NASA_VARIABLES[t.variable].label}: ${t.category}`,
        detail: `OLS ${t.olsSlopePerDecade >= 0 ? '+' : ''}${t.olsSlopePerDecade} ${t.unit}/decade · Mann-Kendall p = ${t.mannKendallPValue}`,
      }));
    return [...trendStarts, ...anomalies];
  }, [activeInvestigation]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Earth Intelligence Overview"
        subtitle="Explore environmental signals, investigate detected trends, and discover how Earth's systems are changing."
        action={
          <>
            <button
              type="button"
              onClick={() => setActiveTab('new-investigation')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              New Investigation
            </button>
            {activeInvestigation && (
              <button
                type="button"
                onClick={() => void runInvestigation(activeInvestigation.config)}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh NASA Feed
              </button>
            )}
          </>
        }
      />

      {pipelineError && (
        <ErrorBanner
          message={pipelineError}
          onRetry={
            activeInvestigation
              ? () => void runInvestigation(activeInvestigation.config)
              : () => setActiveTab('new-investigation')
          }
        />
      )}

      {/* Horizontal Desktop KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Investigations"
          value={computedKpis.totalInvestigations}
          detail="Saved in workspace"
        />
        <KpiCard
          label="Trends Detected"
          value={computedKpis.trendsDetected}
          detail="Statistically significant (p < 0.05)"
        />
        <KpiCard
          label="Anomalies Identified"
          value={computedKpis.anomaliesIdentified}
          detail="Seasonal baseline |Z| ≥ 2.0σ"
        />
        <KpiCard
          label="Variables Analyzed"
          value={computedKpis.variablesCount}
          detail="NASA POWER parameters"
        />
        <KpiCard
          label="NASA Data Sources"
          value={computedKpis.sourcesCount}
          detail="MERRA-2 · CERES · GIBS"
        />
      </div>

      {isRunning && !activeInvestigation ? (
        <PanelCard
          title="Retrieving Live NASA POWER Baseline"
          subtitle={pipelineStage || 'Coordinating Earth Scout and statistical computation...'}
        >
          <LoadingSkeleton rows={5} />
        </PanelCard>
      ) : !activeInvestigation ? (
        <EmptyState
          title="No Investigation Loaded Yet"
          description="Launch a natural-language Earth-system investigation to retrieve live NASA POWER telemetry and compute trends, anomalies, and correlations."
          actionLabel="Start First Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      ) : (
        <>
          {/* Active Investigation Spotlight + Period Selector */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085] dark:text-[#94A3B8]">
                <span className="font-medium text-[#155EEF] dark:text-[#38BDF8]">Active Signal</span>
                <span aria-hidden="true">·</span>
                <span>{activeInvestigation.config.locationName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeInvestigation.config.latitude.toFixed(2)}°,{' '}
                  {activeInvestigation.config.longitude.toFixed(2)}°
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeInvestigation.config.startYear}–{activeInvestigation.config.endYear}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#101828] dark:text-[#CBD5E1] max-w-4xl leading-relaxed">
                {explanationMode === 'simplified'
                  ? activeInvestigation.report.simplifiedInterpretation
                  : activeInvestigation.report.scientificInterpretation}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1 shrink-0 self-start lg:self-center">
              {(
                [
                  ['all', 'Full Span'],
                  ['10y', 'Last 10Y'],
                  ['5y', 'Last 5Y'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriodFilter(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    periodFilter === key
                      ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                      : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Wide Desktop Analytical Charts Row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <PanelCard
              className="xl:col-span-6"
              title="Temperature Trend Overview"
              subtitle={
                tempSeries.length > 0
                  ? `${activeInvestigation.config.locationName} · NASA POWER MERRA-2 (°C)`
                  : 'Add a temperature variable (T2M, T2M_MAX, T2M_MIN) to view temperature trajectory'
              }
              rightSlot={
                activeInvestigation.statistics.trends.T2M && (
                  <TrendIndicatorLabel
                    category={activeInvestigation.statistics.trends.T2M.category}
                  />
                )
              }
            >
              {tempSeries.length > 0 ? (
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tempSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateKey"
                        tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                        minTickGap={28}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                        domain={['auto', 'auto']}
                        unit="°C"
                      />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Legend wrapperStyle={chartTheme.legendStyle} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Observed (°C)"
                        stroke="#38BDF8"
                        strokeWidth={1.75}
                        dot={false}
                      />
                      <Line
                        type="linear"
                        dataKey="trend"
                        name="OLS Trend Line"
                        stroke="#F87171"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
                  No temperature parameter included in the active dataset.
                </p>
              )}
            </PanelCard>

            <PanelCard
              className="xl:col-span-6"
              title="Precipitation Trend Overview"
              subtitle={
                precipSeries.length > 0
                  ? `${activeInvestigation.config.locationName} · Bias-corrected PRECTOTCORR (mm/day)`
                  : 'Add PRECTOTCORR to view precipitation dynamics'
              }
              rightSlot={
                activeInvestigation.statistics.trends.PRECTOTCORR && (
                  <TrendIndicatorLabel
                    category={activeInvestigation.statistics.trends.PRECTOTCORR.category}
                  />
                )
              }
            >
              {precipSeries.length > 0 ? (
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={precipSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateKey"
                        tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                        minTickGap={28}
                      />
                      <YAxis tick={{ fontSize: 11, fill: chartTheme.tickFill }} unit=" mm" />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Legend wrapperStyle={chartTheme.legendStyle} />
                      <Area
                        type="monotone"
                        dataKey="precipitation"
                        name="Precipitation (mm/day)"
                        stroke="#06B6D4"
                        fill="#38BDF8"
                        fillOpacity={0.22}
                        strokeWidth={1.75}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
                  No precipitation parameter included in the active dataset.
                </p>
              )}
            </PanelCard>
          </div>

          {/* Live Data 2: Real-Time Atmospheric & NASA EONET Feed */}
          <LiveTelemetryPanel />

          {/* Second Row: Environmental Change Timeline + Anomaly Overview + Agent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <PanelCard
              className="lg:col-span-5"
              title="Environmental Change Timeline"
              subtitle="Detected trend phases & top seasonal baseline deviations"
            >
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {timelineEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/50 dark:bg-[#0D162D] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#101828] dark:text-[#F1F5F9]">{ev.title}</span>
                      <span className="font-mono text-[#155EEF] dark:text-[#38BDF8] tabular-nums shrink-0">{ev.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#667085] dark:text-[#94A3B8]">{ev.detail}</p>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard
              className="lg:col-span-4"
              title="Anomaly Overview"
              subtitle="Highest Z-score departures from calendar-month baselines"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setActiveTab('anomaly-detection')}
                  className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
                >
                  Inspect All
                </button>
              }
            >
              {activeInvestigation.statistics.anomalies.length > 0 ? (
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activeInvestigation.statistics.anomalies.slice(0, 8)}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis dataKey="dateKey" tick={{ fontSize: 10, fill: chartTheme.tickFill }} />
                      <YAxis tick={{ fontSize: 10, fill: chartTheme.tickFill }} unit="σ" />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Bar dataKey="zScore" name="Z-Score (σ)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
                  No observations exceeded ±2.0σ seasonal thresholds.
                </p>
              )}
            </PanelCard>

            <PanelCard
              className="lg:col-span-3"
              title="Agent Workflow Activity"
              subtitle="Live multi-agent execution status"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setActiveTab('agent-center')}
                  className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
                >
                  Mission Center
                </button>
              }
            >
              <div className="space-y-2.5">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] dark:bg-[#0D162D]/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#101828] dark:text-[#F1F5F9] truncate">{agent.name}</p>
                      <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] truncate">{agent.currentTask}</p>
                    </div>
                    <AgentStatusIndicator status={agent.status} />
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>

          {/* Third Row: Recent Investigations & Regional Investigation Summary */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <PanelCard
              className="lg:col-span-7"
              title="Recent Investigations"
              subtitle="Switch active workspace context across your saved investigations"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setActiveTab('saved-investigations')}
                  className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
                >
                  Manage All
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8]">
                      <th className="py-2.5 pr-4 font-medium">Investigation</th>
                      <th className="py-2.5 pr-4 font-medium">Coordinates</th>
                      <th className="py-2.5 pr-4 font-medium">Span</th>
                      <th className="py-2.5 pr-4 font-medium text-right">Signal Score</th>
                      <th className="py-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
                    {investigations.slice(0, 5).map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F5F9FF]/50 dark:hover:bg-[#111C38]/70">
                        <td className="py-3 pr-4 font-medium text-[#101828] dark:text-[#F1F5F9]">
                          {inv.config.locationName}
                          <span className="block text-[11px] font-normal text-[#667085] dark:text-[#94A3B8]">
                            {inv.config.variables.join(', ')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-[#667085] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                          {inv.config.latitude.toFixed(2)}°, {inv.config.longitude.toFixed(2)}°
                        </td>
                        <td className="py-3 pr-4 font-mono text-[#667085] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                          {inv.config.startYear}–{inv.config.endYear}
                        </td>
                        <td className="py-3 pr-4 font-mono font-semibold text-[#101828] dark:text-[#F1F5F9] text-right tabular-nums">
                          {inv.statistics.earthSignalScore.overallScore}/100
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveInvestigationId(inv.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
                          >
                            {inv.id === activeInvestigation.id ? 'Active' : 'Load'}
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>

            <PanelCard
              className="lg:col-span-5"
              title="Regional Investigation Summary"
              subtitle="Source provenance, data completeness & report readiness"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-2.5">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Data Source</span>
                  <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">NASA POWER v2</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-2.5">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Records Retrieved</span>
                  <span className="font-mono font-semibold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {activeInvestigation.dataset.observations.length} ({activeInvestigation.config.resolution})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-2.5">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Earth Signal Score</span>
                  <span className="font-mono font-semibold text-[#155EEF] dark:text-[#38BDF8] tabular-nums">
                    {activeInvestigation.statistics.earthSignalScore.overallScore}/100 ·{' '}
                    {activeInvestigation.statistics.earthSignalScore.label}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Missing Sentinel Filter</span>
                  <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {activeInvestigation.dataset.quality.missingSentinelCount} filtered
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('data-explorer')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] px-3 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#EBF4FF] dark:hover:bg-[#111C38]"
                  >
                    <Database className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                    Inspect Raw Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-2 text-xs font-medium text-white hover:bg-[#1149C2]"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Open 16-Section Report
                  </button>
                </div>
              </div>
            </PanelCard>
          </div>
        </>
      )}
    </div>
  );
}
