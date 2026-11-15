import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GitCompare, RefreshCw } from 'lucide-react';
import { CURATED_LOCATIONS, NASA_VARIABLE_LIST, NASA_VARIABLES } from '../config/nasaCatalog';
import { fetchNasaPowerData } from '../services/api';
import { runScientificComputationEngine } from '../services/statistics';
import { LeafletEarthMap } from '../components/map/LeafletEarthMap';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  ErrorBanner,
  LoadingSkeleton,
  PanelCard,
  SectionHeader,
  TrendIndicatorLabel,
} from '../components/ui/Primitives';
import type {
  ComputedStatisticsBundle,
  NasaDatasetResponse,
  NasaVariableId,
} from '../types/orbitera';

interface RegionResult {
  name: string;
  dataset: NasaDatasetResponse;
  stats: ComputedStatisticsBundle;
}

const COMPARISON_PRESETS = [
  { label: 'Bengaluru vs. Chennai', a: 'Bengaluru', b: 'Chennai' },
  { label: 'Mumbai vs. Delhi', a: 'Mumbai', b: 'Delhi' },
  { label: 'Karnataka vs. Tamil Nadu', a: 'Karnataka Plateau', b: 'Tamil Nadu Interior' },
  { label: 'California vs. Bengaluru', a: 'California Central Valley', b: 'Bengaluru' },
];

export function RegionalComparisonPage() {
  const chartTheme = useChartTheme();
  const [regionAName, setRegionAName] = useState('Bengaluru');
  const [regionBName, setRegionBName] = useState('Chennai');
  const [variable, setVariable] = useState<NasaVariableId>('T2M');
  const [startYear, setStartYear] = useState(2001);
  const [endYear, setEndYear] = useState(2024);

  const [resultA, setResultA] = useState<RegionResult | null>(null);
  const [resultB, setResultB] = useState<RegionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (locA = regionAName, locB = regionBName) => {
    const metaA = CURATED_LOCATIONS.find((l) => l.name === locA) ?? CURATED_LOCATIONS[0];
    const metaB = CURATED_LOCATIONS.find((l) => l.name === locB) ?? CURATED_LOCATIONS[1];

    setLoading(true);
    setError(null);
    try {
      const [dataA, dataB] = await Promise.all([
        fetchNasaPowerData({
          latitude: metaA.latitude,
          longitude: metaA.longitude,
          startYear,
          endYear,
          resolution: 'monthly',
          variables: [variable],
        }),
        fetchNasaPowerData({
          latitude: metaB.latitude,
          longitude: metaB.longitude,
          startYear,
          endYear,
          resolution: 'monthly',
          variables: [variable],
        }),
      ]);

      setResultA({
        name: metaA.name,
        dataset: dataA,
        stats: runScientificComputationEngine(dataA),
      });
      setResultB({
        name: metaB.name,
        dataset: dataB,
        stats: runScientificComputationEngine(dataB),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compare regional datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runComparison();
  }, []);

  const mergedSeries = React.useMemo(() => {
    if (!resultA || !resultB) return [];
    const mapB = new Map(
      resultB.dataset.observations.map((o) => [o.dateKey, o.values[variable] ?? null])
    );
    return resultA.dataset.observations.map((o) => ({
      dateKey: o.dateKey,
      regionA: o.values[variable] ?? null,
      regionB: mapB.get(o.dateKey) ?? null,
    }));
  }, [resultA, resultB, variable]);

  const trendA = resultA?.stats.trends[variable];
  const trendB = resultB?.stats.trends[variable];
  const metaA = CURATED_LOCATIONS.find((l) => l.name === regionAName) ?? CURATED_LOCATIONS[0];
  const metaB = CURATED_LOCATIONS.find((l) => l.name === regionBName) ?? CURATED_LOCATIONS[1];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Regional Comparison Workspace"
        subtitle="Compare synchronized NASA POWER time-series, decadal trend slopes, and seasonal anomalies across two geographic locations."
        action={
          <button
            type="button"
            onClick={() => void runComparison()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Compare Regions
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void runComparison()} />}

      {/* Controls */}
      <PanelCard title="Comparison Configuration">
        <div className="flex flex-wrap gap-2 mb-4">
          {COMPARISON_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setRegionAName(p.a);
                setRegionBName(p.b);
                void runComparison(p.a, p.b);
              }}
              className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] px-3 py-1.5 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:border-[#155EEF]/40"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="reg-a" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Region A
            </label>
            <select
              id="reg-a"
              value={regionAName}
              onChange={(e) => setRegionAName(e.target.value)}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              {CURATED_LOCATIONS.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name} ({l.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-b" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Region B
            </label>
            <select
              id="reg-b"
              value={regionBName}
              onChange={(e) => setRegionBName(e.target.value)}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              {CURATED_LOCATIONS.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name} ({l.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-var" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Variable
            </label>
            <select
              id="reg-var"
              value={variable}
              onChange={(e) => setVariable(e.target.value as NasaVariableId)}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              {NASA_VARIABLE_LIST.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-start" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Start Year
            </label>
            <input
              id="reg-start"
              type="number"
              min={1981}
              max={2024}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="reg-end" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              End Year
            </label>
            <input
              id="reg-end"
              type="number"
              min={1982}
              max={2026}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>
        </div>
      </PanelCard>

      {loading ? (
        <PanelCard title="Synchronizing Dual NASA POWER Datasets">
          <LoadingSkeleton rows={5} />
        </PanelCard>
      ) : (
        resultA &&
        resultB &&
        trendA &&
        trendB && (
          <>
            {/* Side-by-Side Regional Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {[
                { label: 'Region A', res: resultA, trend: trendA, color: '#38BDF8' },
                { label: 'Region B', res: resultB, trend: trendB, color: '#06B6D4' },
              ].map((item) => (
                <PanelCard
                  key={item.label}
                  title={`${item.label}: ${item.res.name}`}
                  subtitle={`${item.res.dataset.latitude.toFixed(2)}°, ${item.res.dataset.longitude.toFixed(2)}° · ${NASA_VARIABLES[variable].label}`}
                  rightSlot={<TrendIndicatorLabel category={item.trend.category} />}
                >
                  <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Mean Value</span>
                      <span className="font-mono text-base font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {item.trend.mean} {item.trend.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Slope / Decade</span>
                      <span className="font-mono text-base font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {item.trend.olsSlopePerDecade >= 0 ? '+' : ''}
                        {item.trend.olsSlopePerDecade}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">MK Z / p-Val</span>
                      <span className="font-mono text-base font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {item.trend.mannKendallZ} / {item.trend.mannKendallPValue}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Anomalies</span>
                      <span className="font-mono text-base font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {item.res.stats.anomalies.length}
                      </span>
                    </div>
                  </div>
                </PanelCard>
              ))}
            </div>

            {/* Overlaid Chart + Map */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <PanelCard
                className="xl:col-span-8"
                title={`Synchronized Comparison: ${resultA.name} vs. ${resultB.name}`}
                subtitle={`${NASA_VARIABLES[variable].label} (${NASA_VARIABLES[variable].unit}) · ${startYear}–${endYear}`}
              >
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis dataKey="dateKey" tick={{ fontSize: 11, fill: chartTheme.tickFill }} minTickGap={28} />
                      <YAxis
                        tick={{ fontSize: 11, fill: chartTheme.tickFill }}
                        unit={` ${NASA_VARIABLES[variable].unit}`}
                      />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Legend wrapperStyle={chartTheme.legendStyle} />
                      <Line
                        type="monotone"
                        dataKey="regionA"
                        name={resultA.name}
                        stroke="#38BDF8"
                        strokeWidth={1.75}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="regionB"
                        name={resultB.name}
                        stroke="#F59E0B"
                        strokeWidth={1.75}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                className="xl:col-span-4"
                title="Geographic Separation & Synthesis"
              >
                <LeafletEarthMap
                  centerLat={(metaA.latitude + metaB.latitude) / 2}
                  centerLon={(metaA.longitude + metaB.longitude) / 2}
                  zoom={4}
                  heightClass="h-[220px]"
                  markers={[
                    {
                      id: 'a',
                      label: metaA.name,
                      sublabel: 'Region A',
                      latitude: metaA.latitude,
                      longitude: metaA.longitude,
                      active: true,
                    },
                    {
                      id: 'b',
                      label: metaB.name,
                      sublabel: 'Region B',
                      latitude: metaB.latitude,
                      longitude: metaB.longitude,
                    },
                  ]}
                />
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3.5 text-xs text-[#101828] dark:text-[#CBD5E1]">
                  <GitCompare className="mt-0.5 h-4 w-4 shrink-0 text-[#155EEF] dark:text-[#38BDF8]" />
                  <p className="leading-relaxed">
                    Over {startYear}–{endYear}, {resultA.name} exhibits a{' '}
                    {trendA.category.toLowerCase()} slope of {trendA.olsSlopePerDecade}{' '}
                    {trendA.unit}/decade (mean {trendA.mean} {trendA.unit}), compared to{' '}
                    {resultB.name} at {trendB.olsSlopePerDecade} {trendB.unit}/decade (mean{' '}
                    {trendB.mean} {trendB.unit}).
                  </p>
                </div>
              </PanelCard>
            </div>
          </>
        )
      )}
    </div>
  );
}
