import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
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
  NASA_EXTERNAL_RESOURCES,
  NASA_VARIABLE_LIST,
  NASA_VARIABLES,
} from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { fetchLiveTelemetry, fetchNasaPowerData } from '../services/api';
import { LeafletEarthMap } from '../components/map/LeafletEarthMap';
import { useChartTheme } from '../components/ui/chartTheme';
import {
  ErrorBanner,
  LoadingSkeleton,
  PanelCard,
  SectionHeader,
} from '../components/ui/Primitives';
import type {
  LiveTelemetrySnapshot,
  NasaDatasetResponse,
  NasaVariableId,
  TemporalResolution,
} from '../types/orbitera';

export function DataExplorerPage() {
  const { activeInvestigation } = useOrbitera();
  const chartTheme = useChartTheme();

  const [latitude, setLatitude] = useState(
    activeInvestigation?.config.latitude ?? CURATED_LOCATIONS[0].latitude
  );
  const [longitude, setLongitude] = useState(
    activeInvestigation?.config.longitude ?? CURATED_LOCATIONS[0].longitude
  );
  const [locationLabel, setLocationLabel] = useState(
    activeInvestigation?.config.locationName ?? CURATED_LOCATIONS[0].name
  );
  const [startYear, setStartYear] = useState(activeInvestigation?.config.startYear ?? 2010);
  const [endYear, setEndYear] = useState(activeInvestigation?.config.endYear ?? 2024);
  const [resolution, setResolution] = useState<TemporalResolution>('monthly');
  const [selectedVars, setSelectedVars] = useState<NasaVariableId[]>(['T2M', 'PRECTOTCORR', 'RH2M']);
  const [dataset, setDataset] = useState<NasaDatasetResponse | null>(
    activeInvestigation?.dataset ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveTelemetrySnapshot | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setPage(0);
    try {
      const [data, live] = await Promise.all([
        fetchNasaPowerData({
          latitude,
          longitude,
          startYear,
          endYear,
          resolution,
          variables: selectedVars,
        }),
        fetchLiveTelemetry({ latitude, longitude, locationName: locationLabel }).catch(() => null),
      ]);
      setDataset(data);
      if (live) setLiveSnapshot(live);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch NASA POWER dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveTelemetry(
      { latitude, longitude, locationName: locationLabel },
      controller.signal
    )
      .then((snap) => setLiveSnapshot(snap))
      .catch(() => {});
    return () => controller.abort();
  }, [latitude, longitude, locationLabel]);

  useEffect(() => {
    if (!dataset) {
      void loadData();
    }
  }, []);

  const toggleVar = (v: NasaVariableId) => {
    setSelectedVars((prev) => {
      const exists = prev.includes(v);
      const next = exists ? prev.filter((x) => x !== v) : [...prev, v];
      return next.length > 0 ? next : [v];
    });
  };

  const downloadCsv = () => {
    if (!dataset) return;
    const header = ['date_key', 'year', 'month', ...dataset.variables].join(',');
    const rows = dataset.observations.map((o) =>
      [o.dateKey, o.year, o.month ?? '', ...dataset.variables.map((v) => o.values[v] ?? '')].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa-power-${locationLabel.toLowerCase().replace(/\s+/g, '-')}-${startYear}-${endYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageSize = 24;
  const rows = dataset?.observations ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Earth Data Explorer"
        subtitle="Inspect live NASA POWER measurements, dataset metadata, missing-data quality indicators, and download raw observation tables before launching investigations."
        action={
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!dataset}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-4 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
            Download CSV
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void loadData()} />}

      {/* Controls Bar */}
      <PanelCard title="NASA POWER Query Configuration">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div>
            <label htmlFor="explorer-location" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Location Preset
            </label>
            <select
              id="explorer-location"
              value={locationLabel}
              onChange={(e) => {
                const loc = CURATED_LOCATIONS.find((l) => l.name === e.target.value);
                if (loc) {
                  setLocationLabel(loc.name);
                  setLatitude(loc.latitude);
                  setLongitude(loc.longitude);
                }
              }}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
            >
              {CURATED_LOCATIONS.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="explorer-lat" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Latitude
            </label>
            <input
              id="explorer-lat"
              type="number"
              step="0.01"
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="explorer-lon" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Longitude
            </label>
            <input
              id="explorer-lon"
              type="number"
              step="0.01"
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="explorer-start" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              Start Year
            </label>
            <input
              id="explorer-start"
              type="number"
              min={1981}
              max={2024}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="explorer-end" className="block text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-1">
              End Year
            </label>
            <input
              id="explorer-end"
              type="number"
              min={1982}
              max={2026}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 font-mono text-xs text-[#101828] dark:text-[#F1F5F9] tabular-nums"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Fetch NASA Data
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-4">
          <div className="flex flex-wrap gap-1.5">
            {NASA_VARIABLE_LIST.map((v) => {
              const active = selectedVars.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVar(v.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#155EEF] bg-[#155EEF] text-white'
                      : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                  }`}
                >
                  {v.id} · {v.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1">
            {(['monthly', 'annual', 'daily'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResolution(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                  resolution === r
                    ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#94A3B8]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </PanelCard>

      {loading ? (
        <PanelCard title="Fetching NASA POWER Observations">
          <LoadingSkeleton rows={6} />
        </PanelCard>
      ) : (
        dataset && (
          <>
            {/* Chart + Mini Map */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <PanelCard
                className="xl:col-span-8"
                title={`Time-Series Explorer · ${locationLabel}`}
                subtitle={`${dataset.observations.length} observations (${dataset.resolution}) · Retrieved ${new Date(dataset.retrievedAt).toLocaleString()}`}
              >
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dataset.observations.map((o) => ({ dateKey: o.dateKey, ...o.values }))}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis dataKey="dateKey" tick={{ fontSize: 11, fill: chartTheme.tickFill }} minTickGap={28} />
                      <YAxis tick={{ fontSize: 11, fill: chartTheme.tickFill }} />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Legend wrapperStyle={chartTheme.legendStyle} />
                      {dataset.variables.map((v) => (
                        <Line
                          key={v}
                          type="monotone"
                          dataKey={v}
                          name={`${v} (${NASA_VARIABLES[v].unit})`}
                          stroke={NASA_VARIABLES[v].color}
                          strokeWidth={1.75}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                className="xl:col-span-4"
                title="Grid Point Context & Quality"
                subtitle="Click map to reposition target coordinates"
              >
                <LeafletEarthMap
                  centerLat={latitude}
                  centerLon={longitude}
                  zoom={5}
                  heightClass="h-[220px]"
                  onSelectCoordinates={(lat, lon) => {
                    setLatitude(lat);
                    setLongitude(lon);
                    setLocationLabel('Custom Target');
                  }}
                />
                <div className="mt-4 space-y-2 text-xs">
                  {dataset.variables.map((v) => (
                    <div key={v} className="flex items-center justify-between">
                      <span className="text-[#667085] dark:text-[#94A3B8]">
                        {v} ({NASA_VARIABLES[v].unit})
                      </span>
                      <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                        {dataset.quality.completenessPercentByVariable[v]}% complete (
                        {dataset.quality.missingPointsByVariable[v]} missing)
                      </span>
                    </div>
                  ))}
                  {liveSnapshot && (
                    <div className="mt-3 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-2.5 space-y-1">
                      <span className="text-[11px] font-medium text-[#15803D] dark:text-[#4ADE80] block">
                        Live Atmospheric Feed (Now)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[#667085] dark:text-[#94A3B8]">Temp / Humidity</span>
                        <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {liveSnapshot.current.temperatureC ?? '—'}°C ·{' '}
                          {liveSnapshot.current.humidityPercent ?? '—'}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#667085] dark:text-[#94A3B8]">Wind / Pressure</span>
                        <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {liveSnapshot.current.windSpeedKmh ?? '—'} km/h ·{' '}
                          {liveSnapshot.current.surfacePressureHpa ?? '—'} hPa
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </PanelCard>
            </div>

            {/* Raw Data Table */}
            <PanelCard
              title="Observation Matrix"
              subtitle="Verified measurements with -999 fill sentinels explicitly flagged as Missing"
              rightSlot={
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded-md border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1 text-[#101828] dark:text-[#F1F5F9] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-mono text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    Page {page + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    className="rounded-md border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1 text-[#101828] dark:text-[#F1F5F9] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8]">
                      <th className="py-2.5 pr-4 font-medium">Period</th>
                      {dataset.variables.map((v) => (
                        <th key={v} className="py-2.5 pr-4 font-medium text-right">
                          {v} ({NASA_VARIABLES[v].unit})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
                    {visibleRows.map((row) => (
                      <tr key={row.dateKey} className="hover:bg-[#F5F9FF]/40 dark:hover:bg-[#111C38]/70">
                        <td className="py-2 pr-4 font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                          {row.dateKey}
                        </td>
                        {dataset.variables.map((v) => {
                          const val = row.values[v];
                          return (
                            <td
                              key={v}
                              className="py-2 pr-4 font-mono text-right tabular-nums text-[#101828] dark:text-[#F1F5F9]"
                            >
                              {val === null || val === undefined ? (
                                <span className="text-[#F59E0B]">Missing</span>
                              ) : (
                                val.toFixed(2)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>

            {/* Supplementary NASA Portals */}
            <PanelCard
              title="Supplementary NASA Earth Science Portals"
              subtitle="Cross-check satellite imagery and gridded atmospheric collections"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {NASA_EXTERNAL_RESOURCES.map((res) => (
                  <a
                    key={res.name}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D] p-4 hover:border-[#155EEF]/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">{res.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                        {res.description}
                      </p>
                    </div>
                    <span className="mt-3 font-mono text-[11px] text-[#155EEF] dark:text-[#38BDF8]">
                      {res.integratedProgrammatically ? 'Programmatic API' : 'External Reference'}
                    </span>
                  </a>
                ))}
              </div>
            </PanelCard>
          </>
        )
      )}
    </div>
  );
}
