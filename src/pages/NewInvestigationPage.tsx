import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileText,
  Info,
  Loader2,
  MapPin,
  Play,
  Search,
  Sparkles,
  StopCircle,
} from 'lucide-react';
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
import {
  CURATED_LOCATIONS,
  EXAMPLE_QUERIES,
  INVESTIGATION_TYPES,
  NASA_VARIABLE_LIST,
  NASA_VARIABLES,
} from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { parseInvestigationQuery, searchLocations } from '../services/api';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  AgentStatusIndicator,
  ErrorBanner,
  PanelCard,
  SectionHeader,
  TrendIndicatorLabel,
} from '../components/ui/Primitives';
import type { GeoLocationOption, NasaVariableId, TemporalResolution } from '../types/orbitera';

export function NewInvestigationPage() {
  const {
    draftConfig,
    setDraftConfig,
    runInvestigation,
    cancelInvestigation,
    isRunning,
    pipelineStage,
    pipelineError,
    agents,
    activeInvestigation,
    explanationMode,
    setExplanationMode,
    setActiveTab,
    launchFromNaturalLanguage,
  } = useOrbitera();
  const chartTheme = useChartTheme();

  const [nlQuery, setNlQuery] = useState(draftConfig.query);
  const [parsing, setParsing] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationMatches, setLocationMatches] = useState<GeoLocationOption[]>([]);

  const handleParseQuery = async () => {
    if (!nlQuery.trim()) return;
    setParsing(true);
    try {
      const res = await parseInvestigationQuery(nlQuery);
      setDraftConfig((prev) => ({
        ...prev,
        ...res.config,
        id: `inv-${Date.now()}`,
        query: nlQuery,
      }));
    } finally {
      setParsing(false);
    }
  };

  const handleLocationSearch = async (q: string) => {
    setLocationQuery(q);
    if (q.trim().length < 2) {
      setLocationMatches([]);
      return;
    }
    const results = await searchLocations(q).catch(() => []);
    setLocationMatches(results);
  };

  const toggleVariable = (varId: NasaVariableId) => {
    setDraftConfig((prev) => {
      const exists = prev.variables.includes(varId);
      const next = exists
        ? prev.variables.filter((v) => v !== varId)
        : [...prev.variables, varId];
      return {
        ...prev,
        variables: next.length > 0 ? next : [varId],
      };
    });
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runInvestigation({
      ...draftConfig,
      id: `inv-${Date.now()}`,
      query: nlQuery || draftConfig.query,
    });
  };

  const activeTrends = activeInvestigation
    ? Object.values(activeInvestigation.statistics.trends).filter(
        (t): t is NonNullable<typeof t> => Boolean(t)
      )
    : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="New Earth-System Investigation"
        subtitle="Let's investigate what Earth's data is telling us. Describe a trend in natural language or configure exact NASA POWER coordinates and variables."
        action={
          activeInvestigation && (
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-4 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
              View Investigation Report
            </button>
          )
        }
      />

      {pipelineError && (
        <ErrorBanner
          message={pipelineError}
          onRetry={() =>
            void runInvestigation({
              ...draftConfig,
              id: `inv-${Date.now()}`,
              query: nlQuery,
            })
          }
        />
      )}

      {/* Natural-Language Query Bar + Configuration Form */}
      <form onSubmit={handleLaunch} className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <PanelCard
          className="xl:col-span-7"
          title="1. Natural-Language Investigation Query"
          subtitle="Enter a scientific question and let ORBITERA configure coordinates, variables, and dates."
        >
          <label htmlFor="nl-investigation-input" className="sr-only">
            Describe the Earth-system trend you want to investigate
          </label>
          <textarea
            id="nl-investigation-input"
            rows={3}
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="Describe the Earth-system trend you want to investigate..."
            className="w-full rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D] p-4 text-sm text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:bg-white dark:focus:bg-[#111C38] focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleParseQuery()}
              disabled={parsing || !nlQuery.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] disabled:opacity-50 whitespace-nowrap"
            >
              {parsing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#155EEF] dark:text-[#38BDF8]" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" />
              )}
              Parse Query into Parameters
            </button>

            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  type="button"
                  onClick={cancelInvestigation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626]/40 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 px-4 py-2 text-xs font-medium text-[#DC2626] dark:text-[#FCA5A5] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/50 whitespace-nowrap"
                >
                  <StopCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel Run
                </button>
              ) : (
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#155EEF] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Launch Investigation
                </button>
              )}
            </div>
          </div>

          {/* Example Prompts */}
          <div className="mt-5 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-4">
            <p className="text-xs font-medium text-[#667085] dark:text-[#94A3B8] mb-2">Example investigations:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setNlQuery(ex.query);
                    void launchFromNaturalLanguage(ex.query, 'new-investigation');
                  }}
                  className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9] hover:border-[#155EEF]/50 hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </PanelCard>

        {/* Structured Investigation Parameters */}
        <PanelCard
          className="xl:col-span-5"
          title="2. Structured NASA POWER Parameters"
          subtitle="Fine-tune target coordinates, time horizon, and environmental variables"
        >
          <div className="space-y-4">
            {/* Location Preset + Search */}
            <div className="relative">
              <label htmlFor="loc-search-input" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                Geographic Location Search
              </label>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#667085] dark:text-[#94A3B8]" />
                <input
                  id="loc-search-input"
                  type="text"
                  value={locationQuery}
                  onChange={(e) => void handleLocationSearch(e.target.value)}
                  placeholder={`Current: ${draftConfig.locationName} (type to search global cities)`}
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] py-2 pl-8 pr-3 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:outline-none"
                />
              </div>
              {locationMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-1.5 shadow-lg z-20 max-h-48 overflow-y-auto">
                  {locationMatches.map((loc) => (
                    <button
                      key={`${loc.name}-${loc.latitude}`}
                      type="button"
                      onClick={() => {
                        setDraftConfig((prev) => ({
                          ...prev,
                          locationName: loc.name,
                          regionLabel: `${loc.region}, ${loc.country}`,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                          title: `${loc.name} Earth System Investigation`,
                        }));
                        setLocationQuery('');
                        setLocationMatches([]);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">
                        {loc.name} · {loc.country}
                      </span>
                      <span className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                        {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Location Select + Coordinates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="preset-loc" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  Quick Region
                </label>
                <select
                  id="preset-loc"
                  value={
                    CURATED_LOCATIONS.some((l) => l.name === draftConfig.locationName)
                      ? draftConfig.locationName
                      : ''
                  }
                  onChange={(e) => {
                    const found = CURATED_LOCATIONS.find((l) => l.name === e.target.value);
                    if (found) {
                      setDraftConfig((prev) => ({
                        ...prev,
                        locationName: found.name,
                        regionLabel: `${found.region}, ${found.country}`,
                        latitude: found.latitude,
                        longitude: found.longitude,
                        title: `${found.name} Earth System Investigation`,
                      }));
                    }
                  }}
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
                >
                  <option value="">Custom Coordinates</option>
                  {CURATED_LOCATIONS.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name} ({l.country})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lat-input" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  Latitude
                </label>
                <input
                  id="lat-input"
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={draftConfig.latitude}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, latitude: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="lon-input" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  Longitude
                </label>
                <input
                  id="lon-input"
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={draftConfig.longitude}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, longitude: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
            </div>

            {/* Dates & Resolution */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="start-year" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  Start Year
                </label>
                <input
                  id="start-year"
                  type="number"
                  min={1981}
                  max={2024}
                  value={draftConfig.startYear}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, startYear: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="end-year" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  End Year
                </label>
                <input
                  id="end-year"
                  type="number"
                  min={1982}
                  max={2026}
                  value={draftConfig.endYear}
                  onChange={(e) =>
                    setDraftConfig((p) => ({ ...p, endYear: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="res-select" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                  Resolution
                </label>
                <select
                  id="res-select"
                  value={draftConfig.resolution}
                  onChange={(e) =>
                    setDraftConfig((p) => ({
                      ...p,
                      resolution: e.target.value as TemporalResolution,
                    }))
                  }
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="daily">Daily (≤3 yr)</option>
                </select>
              </div>
            </div>

            {/* Investigation Type */}
            <div>
              <label htmlFor="inv-type" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
                Investigation Type
              </label>
              <select
                id="inv-type"
                value={draftConfig.investigationType}
                onChange={(e) =>
                  setDraftConfig((p) => ({
                    ...p,
                    investigationType: e.target.value as typeof p.investigationType,
                  }))
                }
                className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
              >
                {INVESTIGATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Environmental Variables */}
            <div>
              <span className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1.5">
                Environmental Variables (NASA POWER)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {NASA_VARIABLE_LIST.map((v) => {
                  const selected = draftConfig.variables.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVariable(v.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        selected
                          ? 'border-[#155EEF] bg-[#155EEF] text-white'
                          : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                      }`}
                    >
                      {v.shortLabel} ({v.unit})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PanelCard>
      </form>

      {/* Live Multi-Agent Execution Strip */}
      <PanelCard
        title="Multi-Agent Execution Pipeline"
        subtitle={pipelineStage || 'Real-time status across ORBITERA’s six specialized scientific agents'}
        rightSlot={
          <button
            type="button"
            onClick={() => setActiveTab('agent-center')}
            className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
          >
            Inspect Agent JSON Outputs
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {agents.map((a) => (
            <div key={a.id} className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-semibold text-[#101828] dark:text-[#F1F5F9] truncate">
                  {a.name}
                </span>
              </div>
              <div className="mt-1.5">
                <AgentStatusIndicator status={a.status} />
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E4EAF2] dark:bg-[#1E2B48]">
                <div
                  className={`h-full transition-all duration-300 ${
                    a.status === 'Failed'
                      ? 'bg-[#DC2626]'
                      : a.status === 'Completed'
                      ? 'bg-[#16A34A]'
                      : 'bg-[#155EEF]'
                  }`}
                  style={{ width: `${a.progress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#667085] dark:text-[#94A3B8] line-clamp-2">{a.currentTask}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Results Area: Innovation Features A–F + Evidence */}
      {activeInvestigation && (
        <>
          {/* Feature D: What Changed? Explorer + Dual-Mode Interpretation */}
          <PanelCard
            title="Signal Detected: What Changed? Explorer"
            subtitle={`${activeInvestigation.config.locationName} · ${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear} · ${activeInvestigation.dataset.sourceName}`}
            rightSlot={
              <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1">
                <button
                  type="button"
                  onClick={() => setExplanationMode('scientific')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    explanationMode === 'scientific'
                      ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                      : 'text-[#667085] dark:text-[#94A3B8]'
                  }`}
                >
                  Scientific Mode
                </button>
                <button
                  type="button"
                  onClick={() => setExplanationMode('simplified')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    explanationMode === 'simplified'
                      ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                      : 'text-[#667085] dark:text-[#94A3B8]'
                  }`}
                >
                  Simplified Mode
                </button>
              </div>
            }
          >
            <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-4 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">
              {explanationMode === 'simplified'
                ? activeInvestigation.report.simplifiedInterpretation
                : activeInvestigation.report.scientificInterpretation}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {activeTrends.map((t) => (
                <div key={t.variable} className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D]/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                      {NASA_VARIABLES[t.variable].label}
                    </span>
                    <TrendIndicatorLabel category={t.category} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Rate / Decade</span>
                      <span className="font-mono font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {t.olsSlopePerDecade >= 0 ? '+' : ''}
                        {t.olsSlopePerDecade} {t.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Total Span Δ</span>
                      <span className="font-mono font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {t.totalEstimatedChange >= 0 ? '+' : ''}
                        {t.totalEstimatedChange} {t.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Mann-Kendall Z</span>
                      <span className="font-mono text-[#101828] dark:text-[#CBD5E1] tabular-nums">
                        {t.mannKendallZ} (p={t.mannKendallPValue})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#667085] dark:text-[#94A3B8] block">Sen’s Slope</span>
                      <span className="font-mono text-[#101828] dark:text-[#CBD5E1] tabular-nums">
                        {t.sensSlopePerDecade} {t.unit}/dec
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Primary Multi-Variable Time-Series Chart */}
          <PanelCard
            title="Primary NASA POWER Time-Series Evidence"
            subtitle="Interactive visual comparison across selected environmental variables"
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeInvestigation.dataset.observations.map((o) => ({
                    dateKey: o.dateKey,
                    ...o.values,
                  }))}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="dateKey" tick={{ fontSize: 11, fill: chartTheme.tickFill }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11, fill: chartTheme.tickFill }} />
                  <Tooltip contentStyle={chartTheme.tooltipStyle} />
                  <Legend wrapperStyle={chartTheme.legendStyle} />
                  {activeInvestigation.dataset.variables.map((v) => (
                    <Line
                      key={v}
                      type="monotone"
                      dataKey={v}
                      name={`${NASA_VARIABLES[v].shortLabel} (${NASA_VARIABLES[v].unit})`}
                      stroke={NASA_VARIABLES[v].color}
                      strokeWidth={1.75}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          {/* Feature A (Earth Signal Score), Feature B (Convergence), Feature F (Confidence Explainer) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PanelCard
              title="Earth Signal Score"
              subtitle="Documented composite statistical detectability indicator (0–100)"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-3xl font-bold text-[#155EEF] dark:text-[#38BDF8] tabular-nums">
                  {activeInvestigation.statistics.earthSignalScore.overallScore}
                  <span className="text-sm font-normal text-[#667085] dark:text-[#94A3B8]"> / 100</span>
                </span>
                <span className="text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                  {activeInvestigation.statistics.earthSignalScore.label}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                {[
                  ['Mann-Kendall Significance', activeInvestigation.statistics.earthSignalScore.factors.significanceScore, 40],
                  ['Explained Variance (R²)', activeInvestigation.statistics.earthSignalScore.factors.varianceScore, 25],
                  ['NASA Data Completeness', activeInvestigation.statistics.earthSignalScore.factors.completenessScore, 20],
                  ['Anomaly Density', activeInvestigation.statistics.earthSignalScore.factors.anomalyFactorScore, 15],
                ].map(([label, val, max]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#94A3B8]">{label}</span>
                    <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                      {val} / {max}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-3 text-[11px] leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                {activeInvestigation.statistics.earthSignalScore.formulaSummary}
              </p>
            </PanelCard>

            <PanelCard
              title="Trend Convergence Detector"
              subtitle="Simultaneous multi-variable directional shift assessment"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                <CheckCircle2
                  className={`h-4 w-4 ${
                    activeInvestigation.statistics.convergence.hasConvergence
                      ? 'text-[#16A34A] dark:text-[#4ADE80]'
                      : 'text-[#667085] dark:text-[#94A3B8]'
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {activeInvestigation.statistics.convergence.hasConvergence
                    ? 'Multi-Variable Convergence Detected'
                    : 'Single / Non-Convergent Pattern'}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#101828] dark:text-[#CBD5E1]">
                {activeInvestigation.statistics.convergence.summary}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                {activeInvestigation.statistics.convergence.statisticalBasis}
              </p>
              <p className="mt-3 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-3 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                {activeInvestigation.statistics.convergence.limitationNote}
              </p>
            </PanelCard>

            <PanelCard
              title="Scientific Confidence Explainer"
              subtitle="Evidence basis, grid constraints & uncertainty disclosures"
            >
              <div className="space-y-2.5 text-xs text-[#667085] dark:text-[#94A3B8]">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-[#155EEF] dark:text-[#38BDF8] mt-0.5" aria-hidden="true" />
                  <p>{activeInvestigation.dataset.spatialResolutionNote}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#06B6D4] mt-0.5" aria-hidden="true" />
                  <p>
                    Retrieved {activeInvestigation.dataset.observations.length} points on{' '}
                    {new Date(activeInvestigation.dataset.retrievedAt).toLocaleString()}. Missing
                    sentinel values removed: {activeInvestigation.dataset.quality.missingSentinelCount}.
                  </p>
                </div>
                <p className="border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-3 text-[11px]">
                  {activeInvestigation.report.limitations[activeInvestigation.report.limitations.length - 1]}
                </p>
              </div>
            </PanelCard>
          </div>

          {/* Feature E: Next Investigation Recommender */}
          <PanelCard
            title="Next Investigation Recommender"
            subtitle="Scientifically grounded follow-up paths based on current evidence"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {activeInvestigation.report.recommendedFollowUp.map((rec) => (
                <div
                  key={rec.title}
                  className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D] p-4"
                >
                  <div>
                    <span className="text-[11px] font-medium text-[#155EEF] dark:text-[#38BDF8]">{rec.category}</span>
                    <h3 className="mt-1 font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
                      {rec.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">{rec.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNlQuery(rec.suggestedQuery);
                      void launchFromNaturalLanguage(rec.suggestedQuery, 'new-investigation');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline"
                  >
                    <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                    Run Follow-Up <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </PanelCard>
        </>
      )}
    </div>
  );
}
