import React from 'react';
import {
  Activity,
  CloudRain,
  Compass,
  Droplets,
  Flame,
  Gauge,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useOrbitera } from '../../context/OrbiteraContext';
import { useChartTheme } from '../ui/chartTheme';
import { PanelCard } from '../ui/Primitives';
import type { LiveEarthEvent } from '../../types/orbitera';

export function LiveTelemetryPanel() {
  const {
    liveStreamStatus,
    liveTelemetry,
    liveEvents,
    liveStations,
    lastLiveUpdateAt,
    liveUpdateCount,
    liveRefreshing,
    toggleLiveUpdates,
    refreshLiveNow,
    setDraftConfig,
    setActiveTab,
  } = useOrbitera();
  const chartTheme = useChartTheme();

  const handleInvestigateEvent = (ev: LiveEarthEvent) => {
    setDraftConfig((prev) => ({
      ...prev,
      id: `inv-${Date.now()}`,
      title: `${ev.title} — Environmental Signal Investigation`,
      query: `Investigate long-term temperature, precipitation, and humidity anomalies near ${ev.title} (${ev.latitude.toFixed(2)}, ${ev.longitude.toFixed(2)}) from 2001 to 2026.`,
      locationName: ev.title.slice(0, 48),
      regionLabel: `${ev.category} · NASA EONET`,
      latitude: ev.latitude,
      longitude: ev.longitude,
      variables: ['T2M', 'PRECTOTCORR', 'RH2M'],
      endYear: 2026,
      investigationType: 'Environmental Anomaly Investigation',
    }));
    setActiveTab('new-investigation');
  };

  const statusMeta =
    liveStreamStatus === 'live'
      ? {
          label: 'SSE Live Stream Active',
          dot: 'bg-[#16A34A] dark:bg-[#4ADE80] animate-pulse',
          text: 'text-[#15803D] dark:text-[#4ADE80]',
        }
      : liveStreamStatus === 'connecting'
      ? {
          label: 'Connecting Live Stream...',
          dot: 'bg-[#155EEF] dark:bg-[#38BDF8] animate-pulse',
          text: 'text-[#155EEF] dark:text-[#38BDF8]',
        }
      : liveStreamStatus === 'error'
      ? {
          label: 'Reconnecting Stream...',
          dot: 'bg-[#DC2626] animate-pulse',
          text: 'text-[#DC2626] dark:text-[#F87171]',
        }
      : {
          label: 'Live Stream Paused',
          dot: 'bg-[#94A3B8]',
          text: 'text-[#667085] dark:text-[#94A3B8]',
        };

  return (
    <PanelCard
      title="Live Data 2 · Real-Time Atmospheric Telemetry & NASA EONET Stream"
      subtitle={
        liveTelemetry
          ? `${liveTelemetry.locationName} (${liveTelemetry.latitude.toFixed(2)}°, ${liveTelemetry.longitude.toFixed(2)}°) · Observed ${new Date(liveTelemetry.observedAt).toUTCString()} · Auto-updates every 30s`
          : 'Connecting to Open-Meteo Real-Time Atmospheric, CAMS Air Quality, and NASA EONET v3 streams...'
      }
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.text}`}>
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} aria-hidden="true" />
            {statusMeta.label}
          </span>
          {lastLiveUpdateAt && (
            <span className="hidden sm:inline font-mono text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
              · #{liveUpdateCount} @ {new Date(lastLiveUpdateAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={toggleLiveUpdates}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-1.5 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
          >
            {liveStreamStatus === 'paused' ? (
              <>
                <Play className="h-3 w-3 text-[#16A34A] dark:text-[#4ADE80]" aria-hidden="true" />
                Resume Live
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                Pause
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void refreshLiveNow()}
            disabled={liveRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1149C2] disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`h-3 w-3 ${liveRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Sync Now
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 7 Cols: Point Telemetry Readout + 24h Curve */}
        <div className="space-y-4 xl:col-span-7">
          {liveTelemetry ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Thermometer className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    Live Temp (2m)
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.temperatureC !== null
                      ? `${liveTelemetry.current.temperatureC}°C`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    Feels{' '}
                    {liveTelemetry.current.apparentTempC !== null
                      ? `${liveTelemetry.current.apparentTempC}°C`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Droplets className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden="true" />
                    Humidity
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.humidityPercent !== null
                      ? `${liveTelemetry.current.humidityPercent}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    Cloud{' '}
                    {liveTelemetry.current.cloudCoverPercent !== null
                      ? `${liveTelemetry.current.cloudCoverPercent}%`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Wind className="h-3.5 w-3.5 text-[#818CF8]" aria-hidden="true" />
                    Wind (10m)
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.windSpeedKmh !== null
                      ? `${liveTelemetry.current.windSpeedKmh} km/h`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    Dir{' '}
                    {liveTelemetry.current.windDirectionDeg !== null
                      ? `${liveTelemetry.current.windDirectionDeg}°`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Activity className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
                    Air Quality
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.airQuality?.usAqi !== null &&
                    liveTelemetry.airQuality?.usAqi !== undefined
                      ? `AQI ${liveTelemetry.airQuality.usAqi}`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    PM2.5{' '}
                    {liveTelemetry.airQuality?.pm25 !== null &&
                    liveTelemetry.airQuality?.pm25 !== undefined
                      ? `${liveTelemetry.airQuality.pm25} µg/m³`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <CloudRain className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    Precip (Now)
                  </div>
                  <p className="mt-1 font-mono text-base font-semibold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.precipitationMm !== null
                      ? `${liveTelemetry.current.precipitationMm} mm`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Gauge className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    Pressure
                  </div>
                  <p className="mt-1 font-mono text-base font-semibold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.surfacePressureHpa !== null
                      ? `${liveTelemetry.current.surfacePressureHpa} hPa`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Sun className="h-3.5 w-3.5 text-[#FBBF24]" aria-hidden="true" />
                    Solar SW
                  </div>
                  <p className="mt-1 font-mono text-base font-semibold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.current.solarIrradianceWm2 !== null
                      ? `${liveTelemetry.current.solarIrradianceWm2} W/m²`
                      : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    <Radio className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    Ozone (O₃)
                  </div>
                  <p className="mt-1 font-mono text-base font-semibold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                    {liveTelemetry.airQuality?.ozone !== null &&
                    liveTelemetry.airQuality?.ozone !== undefined
                      ? `${liveTelemetry.airQuality.ozone} µg/m³`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Live 24-Hour Atmospheric Curve */}
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D]/70 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#101828] dark:text-[#F1F5F9]">
                    24-Hour Live Atmospheric Trajectory (UTC)
                  </span>
                  <span className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                    {liveTelemetry.sourceName}
                  </span>
                </div>
                <div className="h-[195px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={liveTelemetry.hourly24h}
                      margin={{ top: 6, right: 12, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: chartTheme.tickFill }}
                        minTickGap={22}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: chartTheme.tickFill }}
                        domain={['auto', 'auto']}
                        unit="°C"
                      />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="temperatureC"
                        name="Live Temp (°C)"
                        stroke="#38BDF8"
                        fill="#38BDF8"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D] p-8 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
              Synchronizing live Open-Meteo &amp; CAMS atmospheric telemetry for active coordinates...
            </div>
          )}
        </div>

        {/* Right 5 Cols: Global Station Pulse + NASA EONET Live Events */}
        <div className="space-y-4 xl:col-span-5">
          {/* Global Station Pulse */}
          <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D]/70 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-display text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                Global Reference Pulse (Live)
              </span>
              <span className="font-mono text-[11px] text-[#155EEF] dark:text-[#38BDF8] tabular-nums">
                {liveStations.length} stations
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {liveStations.map((st) => (
                <div
                  key={st.name}
                  className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-2.5 py-2 text-xs"
                >
                  <p className="font-medium text-[#101828] dark:text-[#F1F5F9] truncate">
                    {st.name.split(' ')[0]}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-[#155EEF] dark:text-[#38BDF8] tabular-nums">
                    {st.temperatureC !== null ? `${st.temperatureC}°C` : '—'}
                  </p>
                  <p className="text-[10px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    {st.humidityPercent ?? '—'}% RH · {st.windSpeedKmh ?? '—'} km/h
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* NASA EONET Live Natural Events */}
          <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0D162D]/70 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                <Flame className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
                NASA EONET Live Natural Events
              </span>
              <span className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                {liveEvents.length} active
              </span>
            </div>
            <div className="max-h-[205px] space-y-2 overflow-y-auto pr-1">
              {liveEvents.length > 0 ? (
                liveEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#101828] dark:text-[#F1F5F9] truncate">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] truncate">
                        <span className="text-[#F59E0B] font-medium">{ev.category}</span>
                        {' · '}
                        <span className="font-mono tabular-nums">
                          {ev.latitude.toFixed(2)}°, {ev.longitude.toFixed(2)}°
                        </span>
                        {' · '}
                        {new Date(ev.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInvestigateEvent(ev)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#111C38] px-2 py-1 text-[11px] font-medium text-[#155EEF] dark:text-[#38BDF8] hover:border-[#155EEF]/50 shrink-0"
                      title="Investigate this NASA EONET coordinate"
                    >
                      <Compass className="h-3 w-3" aria-hidden="true" />
                      Inspect
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-[#667085] dark:text-[#94A3B8]">
                  Loading active NASA Earth Observatory events...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
