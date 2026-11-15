import React, { useEffect, useState } from 'react';
import { Compass, Flame, Layers, Search } from 'lucide-react';
import { CURATED_LOCATIONS } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { fetchLiveTelemetry, searchLocations } from '../services/api';
import { LeafletEarthMap } from '../components/map/LeafletEarthMap';
import { PanelCard, SectionHeader } from '../components/ui/Primitives';
import type { GeoLocationOption, LiveTelemetrySnapshot } from '../types/orbitera';

export function EarthMapPage() {
  const {
    activeInvestigation,
    investigations,
    setActiveInvestigationId,
    setDraftConfig,
    setActiveTab,
    liveEvents,
  } = useOrbitera();

  const [targetLat, setTargetLat] = useState(
    activeInvestigation?.config.latitude ?? CURATED_LOCATIONS[0].latitude
  );
  const [targetLon, setTargetLon] = useState(
    activeInvestigation?.config.longitude ?? CURATED_LOCATIONS[0].longitude
  );
  const [targetName, setTargetName] = useState(
    activeInvestigation?.config.locationName ?? CURATED_LOCATIONS[0].name
  );
  const [layerMode, setLayerMode] = useState<'osm' | 'nasa-gibs'>('osm');
  const [showLiveEvents, setShowLiveEvents] = useState(true);
  const [targetLiveTelemetry, setTargetLiveTelemetry] = useState<LiveTelemetrySnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocationOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveTelemetry(
      { latitude: targetLat, longitude: targetLon, locationName: targetName },
      controller.signal
    )
      .then((snap) => setTargetLiveTelemetry(snap))
      .catch(() => {
        // Ignore abort/network errors cleanly
      });
    return () => controller.abort();
  }, [targetLat, targetLon, targetName]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const found = await searchLocations(query).catch(() => []);
    setResults(found);
    if (found[0]) {
      setTargetLat(found[0].latitude);
      setTargetLon(found[0].longitude);
      setTargetName(found[0].name);
    }
  };

  const launchAtCoordinates = () => {
    setDraftConfig((prev) => ({
      ...prev,
      id: `inv-${Date.now()}`,
      title: `${targetName} Earth System Investigation`,
      query: `Investigate temperature and precipitation trends at ${targetName} (${targetLat.toFixed(2)}, ${targetLon.toFixed(2)}) from 2001 to 2024.`,
      locationName: targetName,
      regionLabel: `${targetLat.toFixed(2)}°, ${targetLon.toFixed(2)}°`,
      latitude: targetLat,
      longitude: targetLon,
    }));
    setActiveTab('new-investigation');
  };

  const markers = [
    ...CURATED_LOCATIONS.map((l) => ({
      id: `preset-${l.name}`,
      label: l.name,
      sublabel: l.climateZone,
      latitude: l.latitude,
      longitude: l.longitude,
      active: false,
    })),
    ...investigations.map((inv) => ({
      id: inv.id,
      label: inv.config.locationName,
      sublabel: `Saved (${inv.config.startYear}–${inv.config.endYear})`,
      latitude: inv.config.latitude,
      longitude: inv.config.longitude,
      active: inv.id === activeInvestigation?.id,
    })),
    ...(showLiveEvents
      ? liveEvents.map((ev) => ({
          id: `eonet-${ev.id}`,
          label: ev.title,
          sublabel: `Live ${ev.category}`,
          latitude: ev.latitude,
          longitude: ev.longitude,
          color: '#F59E0B',
        }))
      : []),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Earth Intelligence Map"
        subtitle="Click anywhere on the globe to target NASA POWER grid coordinates, toggle NASA GIBS satellite reflectance imagery, or inspect live NASA EONET events."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLiveEvents((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                showLiveEvents
                  ? 'border-[#F59E0B]/40 bg-[#FFFBEB] dark:bg-[#451A03]/45 text-[#B45309] dark:text-[#FBBF24]'
                  : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8]'
              }`}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              Live EONET ({liveEvents.length})
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-1">
              <button
                type="button"
                onClick={() => setLayerMode('osm')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  layerMode === 'osm'
                    ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#94A3B8]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Vector Reference
              </button>
              <button
                type="button"
                onClick={() => setLayerMode('nasa-gibs')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  layerMode === 'nasa-gibs'
                    ? 'bg-white dark:bg-[#155EEF] text-[#101828] dark:text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#94A3B8]'
                }`}
              >
                <Layers
                  className={`h-3.5 w-3.5 ${
                    layerMode === 'nasa-gibs' ? 'text-white' : 'text-[#155EEF] dark:text-[#38BDF8]'
                  }`}
                  aria-hidden="true"
                />
                NASA Worldview GIBS
              </button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <LeafletEarthMap
            centerLat={targetLat}
            centerLon={targetLon}
            zoom={4}
            layerMode={layerMode}
            heightClass="h-[540px]"
            markers={markers}
            onSelectCoordinates={(lat, lon) => {
              setTargetLat(lat);
              setTargetLon(lon);
              setTargetName(`Coordinate (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`);
            }}
            onSelectMarker={(id) => {
              const saved = investigations.find((inv) => inv.id === id);
              if (saved) {
                setActiveInvestigationId(saved.id);
                setTargetLat(saved.config.latitude);
                setTargetLon(saved.config.longitude);
                setTargetName(saved.config.locationName);
                return;
              }
              const eonet = liveEvents.find((ev) => `eonet-${ev.id}` === id);
              if (eonet) {
                setTargetLat(eonet.latitude);
                setTargetLon(eonet.longitude);
                setTargetName(eonet.title);
                return;
              }
              const preset = CURATED_LOCATIONS.find((l) => `preset-${l.name}` === id);
              if (preset) {
                setTargetLat(preset.latitude);
                setTargetLon(preset.longitude);
                setTargetName(preset.name);
              }
            }}
          />
        </div>

        <div className="space-y-4 xl:col-span-3">
          <PanelCard title="Target Coordinate Inspector">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex items-center gap-2">
                <label htmlFor="map-search" className="sr-only">
                  Search geographic location
                </label>
                <input
                  id="map-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city or region..."
                  className="flex-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Search map location"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#155EEF] text-white"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
              {results.length > 0 && (
                <div className="space-y-1 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-2">
                  {results.map((r) => (
                    <button
                      key={`${r.name}-${r.latitude}`}
                      type="button"
                      onClick={() => {
                        setTargetLat(r.latitude);
                        setTargetLon(r.longitude);
                        setTargetName(r.name);
                      }}
                      className="block w-full rounded-md px-2 py-1 text-left text-xs text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      {r.name}, {r.country}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="mt-4 space-y-2 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-4 text-xs">
              <div>
                <span className="text-[#667085] dark:text-[#94A3B8] block">Selected Target</span>
                <span className="font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
                  {targetName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085] dark:text-[#94A3B8]">Latitude</span>
                <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{targetLat.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085] dark:text-[#94A3B8]">Longitude</span>
                <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{targetLon.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085] dark:text-[#94A3B8]">Active Tile Layer</span>
                <span className="font-medium text-[#155EEF] dark:text-[#38BDF8]">
                  {layerMode === 'nasa-gibs' ? 'MODIS Terra TrueColor' : 'OpenStreetMap'}
                </span>
              </div>
              {targetLiveTelemetry && (
                <div className="mt-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-2.5 space-y-1">
                  <span className="text-[11px] font-medium text-[#15803D] dark:text-[#4ADE80] block">
                    Live Telemetry (Now)
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[#667085] dark:text-[#94A3B8]">Temp / Humidity</span>
                    <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                      {targetLiveTelemetry.current.temperatureC ?? '—'}°C ·{' '}
                      {targetLiveTelemetry.current.humidityPercent ?? '—'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085] dark:text-[#94A3B8]">Wind / AQI</span>
                    <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                      {targetLiveTelemetry.current.windSpeedKmh ?? '—'} km/h · AQI{' '}
                      {targetLiveTelemetry.airQuality?.usAqi ?? '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={launchAtCoordinates}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#1149C2]"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Investigate Coordinates
            </button>
          </PanelCard>

          <PanelCard title="NASA Reference Markers" subtitle="Click to inspect saved or reference sites">
            <div className="max-h-[190px] space-y-1.5 overflow-y-auto pr-1 text-xs">
              {CURATED_LOCATIONS.map((l) => (
                <button
                  key={l.name}
                  type="button"
                  onClick={() => {
                    setTargetLat(l.latitude);
                    setTargetLon(l.longitude);
                    setTargetName(l.name);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] dark:bg-[#0D162D]/70 px-3 py-2 text-left hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                >
                  <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">{l.name}</span>
                  <span className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                    {l.latitude.toFixed(1)}, {l.longitude.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
