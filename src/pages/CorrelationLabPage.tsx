import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Info } from 'lucide-react';
import { NASA_VARIABLES } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { computeVariableCorrelation } from '../services/statistics';
import { useChartTheme } from '../components/ui/chartTheme';
import { EmptyState, PanelCard, SectionHeader } from '../components/ui/Primitives';
import type { NasaVariableId } from '../types/orbitera';

export function CorrelationLabPage() {
  const { activeInvestigation, setActiveTab } = useOrbitera();
  const chartTheme = useChartTheme();
  const vars = activeInvestigation?.dataset.variables ?? [];
  const [varX, setVarX] = useState<NasaVariableId>(vars[0] ?? 'T2M');
  const [varY, setVarY] = useState<NasaVariableId>(vars[1] ?? vars[0] ?? 'PRECTOTCORR');
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');

  const pairResult = useMemo(() => {
    if (!activeInvestigation) return null;
    const effectiveX = vars.includes(varX) ? varX : vars[0];
    const effectiveY = vars.includes(varY) ? varY : vars[1] ?? vars[0];
    if (!effectiveX || !effectiveY) return null;
    return computeVariableCorrelation(activeInvestigation.dataset, effectiveX, effectiveY);
  }, [activeInvestigation, varX, varY, vars]);

  if (!activeInvestigation || vars.length < 2) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Correlation Lab"
          subtitle="Examine Pearson linear and Spearman rank relationships across NASA environmental variables."
        />
        <EmptyState
          title="Multi-Variable Dataset Required"
          description="Correlation Lab requires an active investigation with at least two environmental variables (e.g., Temperature + Precipitation or Humidity)."
          actionLabel="Configure Multi-Variable Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Correlation Lab"
        subtitle={`${activeInvestigation.config.locationName} (${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear}) · Pearson r & Spearman ρ Cross-Variable Matrix`}
        action={
          <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1">
            <button
              type="button"
              onClick={() => setMethod('pearson')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                method === 'pearson'
                  ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                  : 'text-[#667085] dark:text-[#94A3B8]'
              }`}
            >
              Pearson (Linear)
            </button>
            <button
              type="button"
              onClick={() => setMethod('spearman')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                method === 'spearman'
                  ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                  : 'text-[#667085] dark:text-[#94A3B8]'
              }`}
            >
              Spearman (Rank)
            </button>
          </div>
        }
      />

      {/* Causation Safeguard */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-4 text-xs text-[#667085] dark:text-[#CBD5E1]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
        <p>
          <strong className="text-[#101828] dark:text-[#F1F5F9]">Scientific Causation Safeguard:</strong> Statistical
          correlation quantifies shared variation between variables within the NASA POWER grid cell.
          Correlation never proves direct cause-and-effect, especially when variables share seasonal
          monsoon or solar cycles.
        </p>
      </div>

      {/* Pairwise Correlation Matrix */}
      <PanelCard
        title="Pairwise Correlation Matrix"
        subtitle="Computed across all variable pairs in the active NASA dataset"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8]">
                <th className="py-2.5 pr-4 font-medium">Variable Pair</th>
                <th className="py-2.5 pr-4 font-medium text-right">Pearson r</th>
                <th className="py-2.5 pr-4 font-medium text-right">Spearman ρ</th>
                <th className="py-2.5 pr-4 font-medium">Strength &amp; Direction</th>
                <th className="py-2.5 pr-4 font-medium text-right">Paired N</th>
                <th className="py-2.5 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
              {activeInvestigation.statistics.correlations.map((c) => (
                <tr key={`${c.varA}-${c.varB}`} className="hover:bg-[#F5F9FF]/40 dark:hover:bg-[#111C38]/70">
                  <td className="py-3 pr-4 font-medium text-[#101828] dark:text-[#F1F5F9]">
                    {NASA_VARIABLES[c.varA].shortLabel} ({c.varA}) vs.{' '}
                    {NASA_VARIABLES[c.varB].shortLabel} ({c.varB})
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {c.pearsonR !== null ? c.pearsonR : 'N/A'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {c.spearmanRho !== null ? c.spearmanRho : 'N/A'}
                  </td>
                  <td className="py-3 pr-4 text-[#101828] dark:text-[#CBD5E1]">
                    {c.strengthLabel} {c.directionLabel}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{c.sampleCount}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setVarX(c.varA);
                        setVarY(c.varB);
                      }}
                      className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline"
                    >
                      Plot Pair
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {/* Interactive Scatter Explorer */}
      {pairResult && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <PanelCard
            className="lg:col-span-8"
            title={`Scatter Relationship: ${NASA_VARIABLES[pairResult.varA].shortLabel} vs. ${NASA_VARIABLES[pairResult.varB].shortLabel}`}
            subtitle={`N = ${pairResult.sampleCount} paired observations`}
            rightSlot={
              <div className="flex items-center gap-2 text-xs">
                <select
                  aria-label="X axis variable"
                  value={pairResult.varA}
                  onChange={(e) => setVarX(e.target.value as NasaVariableId)}
                  className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9]"
                >
                  {vars.map((v) => (
                    <option key={v} value={v}>
                      X: {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Y axis variable"
                  value={pairResult.varB}
                  onChange={(e) => setVarY(e.target.value as NasaVariableId)}
                  className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9]"
                >
                  {vars.map((v) => (
                    <option key={v} value={v}>
                      Y: {v}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={pairResult.varA}
                    unit={` ${NASA_VARIABLES[pairResult.varA].unit}`}
                    tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={pairResult.varB}
                    unit={` ${NASA_VARIABLES[pairResult.varB].unit}`}
                    tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={chartTheme.tooltipStyle}
                  />
                  <Scatter
                    name="Observed Pair"
                    data={pairResult.scatterPoints}
                    fill="#38BDF8"
                    fillOpacity={0.72}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard
            className="lg:col-span-4"
            title="Statistical Context & Condition Warnings"
          >
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-4">
                <span className="text-[#667085] dark:text-[#94A3B8] block">
                  {method === 'pearson' ? 'Pearson Linear Coefficient (r)' : 'Spearman Rank Coefficient (ρ)'}
                </span>
                <span className="mt-1 block font-mono text-2xl font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                  {method === 'pearson'
                    ? pairResult.pearsonR ?? 'Insufficient'
                    : pairResult.spearmanRho ?? 'Insufficient'}
                </span>
                <span className="mt-1 block text-[#667085] dark:text-[#94A3B8]">
                  {pairResult.strengthLabel} {pairResult.directionLabel} · p ={' '}
                  {method === 'pearson' ? pairResult.pearsonPValue : pairResult.spearmanPValue}
                </span>
              </div>

              {pairResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-[#101828] dark:text-[#F1F5F9]">Methodological Notices</p>
                  {pairResult.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#FFFBEB] dark:bg-[#78350F]/30 p-3 text-[#92400E] dark:text-[#FDE68A]"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                      <p className="leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      )}
    </div>
  );
}
