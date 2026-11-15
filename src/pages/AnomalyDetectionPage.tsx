import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info } from 'lucide-react';
import { NASA_VARIABLES } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  EmptyState,
  KpiCard,
  PanelCard,
  SectionHeader,
} from '../components/ui/Primitives';
import type { AnomalySeverity, NasaVariableId } from '../types/orbitera';

export function AnomalyDetectionPage() {
  const { activeInvestigation, setActiveTab } = useOrbitera();
  const chartTheme = useChartTheme();
  const [varFilter, setVarFilter] = useState<'ALL' | NasaVariableId>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AnomalySeverity>('ALL');

  const anomalies = useMemo(() => {
    if (!activeInvestigation) return [];
    return activeInvestigation.statistics.anomalies.filter((a) => {
      if (varFilter !== 'ALL' && a.variable !== varFilter) return false;
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      return true;
    });
  }, [activeInvestigation, varFilter, severityFilter]);

  if (!activeInvestigation) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Anomaly Detection Center"
          subtitle="Identify statistically unusual observations compared against calendar-month historical baselines."
        />
        <EmptyState
          title="No Investigation Loaded"
          description="Launch an investigation to screen NASA POWER records for seasonal baseline Z-score deviations."
          actionLabel="Start Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      </div>
    );
  }

  const notableCount = anomalies.filter((a) => a.severity === 'Notable Deviation').length;
  const maxAnomaly = anomalies[0] ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Anomaly Detection Center"
        subtitle={`${activeInvestigation.config.locationName} (${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear}) · Calendar-month seasonal baseline Z-score screening`}
      />

      {/* Non-Alarmist Scientific Framing */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-4 text-xs text-[#667085] dark:text-[#CBD5E1]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
        <p>
          ORBITERA is an exploratory scientific platform, not an official disaster prediction system.
          Seasonal anomaly detection compares each month against its own multi-year calendar-month
          baseline so normal summer or monsoon cycles are not mislabeled as anomalies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Deviations Detected"
          value={anomalies.length}
          detail="Threshold: |Z| ≥ 2.0σ (monthly)"
        />
        <KpiCard
          label="Notable Deviations"
          value={notableCount}
          detail="Threshold: |Z| ≥ 2.5σ"
        />
        <KpiCard
          label="Peak Z-Score Magnitude"
          value={maxAnomaly ? `${maxAnomaly.zScore > 0 ? '+' : ''}${maxAnomaly.zScore}σ` : '—'}
          detail={maxAnomaly ? `${maxAnomaly.variable} · ${maxAnomaly.dateKey}` : 'No deviations'}
        />
        <KpiCard
          label="Detection Method"
          value="Seasonal Z"
          detail="Month-of-year baseline normalization"
        />
      </div>

      {/* Filters */}
      <PanelCard
        title="Deviation Timeline"
        subtitle="Chronological Z-score departures across filtered environmental variables"
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="anom-var-filter" className="sr-only">
              Filter by variable
            </label>
            <select
              id="anom-var-filter"
              value={varFilter}
              onChange={(e) => setVarFilter(e.target.value as 'ALL' | NasaVariableId)}
              className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              <option value="ALL">All Variables</option>
              {activeInvestigation.dataset.variables.map((v) => (
                <option key={v} value={v}>
                  {v} · {NASA_VARIABLES[v].shortLabel}
                </option>
              ))}
            </select>

            <label htmlFor="anom-sev-filter" className="sr-only">
              Filter by severity
            </label>
            <select
              id="anom-sev-filter"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | AnomalySeverity)}
              className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              <option value="ALL">All Severities</option>
              <option value="Notable Deviation">Notable Deviation (|Z| ≥ 2.5σ)</option>
              <option value="Moderate Deviation">Moderate Deviation (2.0σ–2.5σ)</option>
            </select>
          </div>
        }
      >
        {anomalies.length === 0 ? (
          <p className="py-12 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
            No observations matched the selected anomaly filter criteria.
          </p>
        ) : (
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...anomalies].sort((a, b) => a.dateKey.localeCompare(b.dateKey))}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="dateKey" tick={{ fontSize: 11, fill: chartTheme.tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: chartTheme.tickFill }} unit="σ" />
                <ReferenceLine y={0} stroke={chartTheme.tickFill} />
                <ReferenceLine y={2} stroke="#F59E0B" strokeDasharray="4 4" />
                <ReferenceLine y={-2} stroke="#F59E0B" strokeDasharray="4 4" />
                <Tooltip contentStyle={chartTheme.tooltipStyle} />
                <Bar dataKey="zScore" name="Z-Score (σ)" radius={[4, 4, 0, 0]}>
                  {[...anomalies]
                    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                    .map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.zScore >= 0 ? '#EF4444' : '#38BDF8'}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>

      {/* Detailed Anomaly Table */}
      <PanelCard
        title="Detected Anomaly Register"
        subtitle="Ranked by absolute Z-score departure from historical baseline"
      >
        {anomalies.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#667085] dark:text-[#94A3B8]">No anomaly rows to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8]">
                  <th className="py-2.5 pr-4 font-medium">Period</th>
                  <th className="py-2.5 pr-4 font-medium">Variable</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Observed</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Seasonal Baseline</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Deviation</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Z-Score</th>
                  <th className="py-2.5 font-medium">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
                {anomalies.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F5F9FF]/40 dark:hover:bg-[#111C38]/70">
                    <td className="py-2.5 pr-4 font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{a.dateKey}</td>
                    <td className="py-2.5 pr-4 font-medium text-[#101828] dark:text-[#F1F5F9]">
                      {NASA_VARIABLES[a.variable].shortLabel} ({a.variable})
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                      {a.observed} {a.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[#667085] dark:text-[#94A3B8] tabular-nums">
                      {a.baselineMean} ± {a.baselineStdDev} {a.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                      {a.deviation >= 0 ? '+' : ''}
                      {a.deviation} {a.unit}
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right font-mono font-semibold tabular-nums ${
                        a.zScore >= 0 ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#155EEF] dark:text-[#38BDF8]'
                      }`}
                    >
                      {a.zScore >= 0 ? '+' : ''}
                      {a.zScore}σ
                    </td>
                    <td className="py-2.5 text-[#101828] dark:text-[#CBD5E1]">
                      {a.severity} · {a.direction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
