import React, { useEffect, useRef, useState } from 'react';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import {
  Compass,
  Globe,
  Layers,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Satellite,
  Search,
} from 'lucide-react';
import { CURATED_LOCATIONS } from '../../config/nasaCatalog';
import { useOrbitera } from '../../context/OrbiteraContext';
import { fetchLiveTelemetry, searchLocations } from '../../services/api';
import type { GeoLocationOption, LiveTelemetrySnapshot } from '../../types/orbitera';

setWorkerUrl(maplibreWorkerUrl);

const ROUTES_VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const SATELLITE_HYBRID_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri World Imagery',
      maxzoom: 18,
    },
    'carto-labels': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap · CARTO',
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'esri-satellite',
    },
    {
      id: 'routes-areas-labels',
      type: 'raster',
      source: 'carto-labels',
    },
  ],
};

function generateOrbitalArc(inclinationDeg: number, phaseOffsetDeg: number) {
  const coords: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    const rad = ((lon + phaseOffsetDeg) * Math.PI) / 180;
    const lat = Math.sin(rad) * inclinationDeg;
    coords.push([lon, lat]);
  }
  return coords;
}

export function OrbitalEarthCanvas({
  onInvestigateLocation,
}: {
  onInvestigateLocation: (loc: GeoLocationOption) => void;
}) {
  const featuredSites = CURATED_LOCATIONS.slice(0, 8);
  const [selectedSite, setSelectedSite] = useState<GeoLocationOption>(featuredSites[0]);
  const [layerMode, setLayerMode] = useState<'routes' | 'satellite'>('routes');
  const [isSpinning, setIsSpinning] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return true;
  });
  const [zoomLevel, setZoomLevel] = useState(1.65);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocationOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [siteLive, setSiteLive] = useState<LiveTelemetrySnapshot | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const isUserInteractingRef = useRef(false);
  const isSpinningRef = useRef(isSpinning);

  const { settings } = useOrbitera();
  const isDarkRef = useRef(settings.theme === 'dark');

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveTelemetry(
      {
        latitude: selectedSite.latitude,
        longitude: selectedSite.longitude,
        locationName: selectedSite.name,
      },
      controller.signal
    )
      .then((snap) => setSiteLive(snap))
      .catch(() => {
        // Ignore network errors on landing globe
      });
    return () => controller.abort();
  }, [selectedSite.latitude, selectedSite.longitude, selectedSite.name]);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    const isDark = settings.theme === 'dark';
    isDarkRef.current = isDark;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      map.setSky(
        isDark
          ? {
              'sky-color': '#050814',
              'horizon-color': '#0C1E42',
              'atmosphere-blend': 0.72,
            }
          : {
              'sky-color': '#EEF5FF',
              'horizon-color': '#DCEAFF',
              'atmosphere-blend': 0.85,
            }
      );
    } catch {
      // Ignore during style reload
    }
  }, [settings.theme]);

  const attachGlobeOverlays = (map: MapLibreMap) => {
    try {
      map.setProjection({ type: 'globe' });
      map.setSky(
        isDarkRef.current
          ? {
              'sky-color': '#050814',
              'horizon-color': '#0C1E42',
              'atmosphere-blend': 0.72,
            }
          : {
              'sky-color': '#EEF5FF',
              'horizon-color': '#DCEAFF',
              'atmosphere-blend': 0.85,
            }
      );
    } catch {
      // Fallback safely if style loads partially
    }

    const orbit1 = generateOrbitalArc(48, 20);
    const orbit2 = generateOrbitalArc(62, -95);

    if (!map.getSource('orbital-tracks')) {
      map.addSource('orbital-tracks', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { track: 'MERRA-2 / Aura Track' },
              geometry: { type: 'LineString', coordinates: orbit1 },
            },
            {
              type: 'Feature',
              properties: { track: 'MODIS Terra Sun-Sync' },
              geometry: { type: 'LineString', coordinates: orbit2 },
            },
          ],
        },
      });
    }

    if (!map.getLayer('orbital-tracks-line')) {
      map.addLayer({
        id: 'orbital-tracks-line',
        type: 'line',
        source: 'orbital-tracks',
        paint: {
          'line-color': '#155EEF',
          'line-width': 1.4,
          'line-opacity': 0.45,
          'line-dasharray': [3, 3],
        },
      });
    }

    if (!map.getSource('moving-satellites')) {
      map.addSource('moving-satellites', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Orbital Sensor A' },
              geometry: { type: 'Point', coordinates: orbit1[0] },
            },
            {
              type: 'Feature',
              properties: { name: 'Orbital Sensor B' },
              geometry: { type: 'Point', coordinates: orbit2[30] },
            },
          ],
        },
      });
    }

    if (!map.getLayer('moving-satellites-dot')) {
      map.addLayer({
        id: 'moving-satellites-dot',
        type: 'circle',
        source: 'moving-satellites',
        paint: {
          'circle-radius': 5,
          'circle-color': '#06B6D4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: ROUTES_VECTOR_STYLE,
      center: [selectedSite.longitude, selectedSite.latitude],
      zoom: 1.65,
      minZoom: 0.8,
      maxZoom: 18,
      pitch: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('style.load', () => {
      attachGlobeOverlays(map);
    });

    map.on('zoom', () => {
      setZoomLevel(Number(map.getZoom().toFixed(2)));
    });

    const pauseInteraction = () => {
      isUserInteractingRef.current = true;
    };
    const resumeInteraction = () => {
      isUserInteractingRef.current = false;
    };

    map.on('mousedown', pauseInteraction);
    map.on('touchstart', pauseInteraction);
    map.on('wheel', pauseInteraction);
    map.on('dragstart', pauseInteraction);
    map.on('mouseup', resumeInteraction);
    map.on('touchend', resumeInteraction);
    map.on('moveend', resumeInteraction);

    map.on('click', (e: MapMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(4));
      const lon = Number(e.lngLat.lng.toFixed(4));
      setSelectedSite({
        name: `Target (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        region: 'Selected Globe Coordinate',
        country: 'Global Navigation',
        latitude: lat,
        longitude: lon,
        climateZone: 'Zoom in to inspect street routes & local areas',
      });
    });

    // Add interactive monitoring markers
    markersRef.current = featuredSites.map((site) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `Fly to ${site.name}`);
      el.className =
        'h-3.5 w-3.5 rounded-full border-2 border-white bg-[#155EEF] shadow-md transition-transform hover:scale-125 cursor-pointer';
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelectedSite(site);
        map.flyTo({
          center: [site.longitude, site.latitude],
          zoom: Math.max(map.getZoom(), 9.5),
          pitch: 30,
          duration: 1400,
        });
      });

      return new Marker({ element: el })
        .setLngLat([site.longitude, site.latitude])
        .addTo(map);
    });

    // Continuous smooth motion animation loop (globe rotation + moving orbital satellites)
    let animId = 0;
    let lastTime = performance.now();
    let satStep = 0;

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        // Animate satellite sensors along orbital paths
        satStep = (satStep + dt * 18) % 360;
        const satSource = mapRef.current.getSource('moving-satellites') as
          | GeoJSONSource
          | undefined;
        if (satSource) {
          const lon1 = ((satStep - 180 + 360) % 360) - 180;
          const lat1 = Math.sin(((lon1 + 20) * Math.PI) / 180) * 48;
          const lon2 = (((satStep + 140) % 360) - 180);
          const lat2 = Math.sin(((lon2 - 95) * Math.PI) / 180) * 62;
          satSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: 'Orbital Sensor A' },
                geometry: { type: 'Point', coordinates: [lon1, lat1] },
              },
              {
                type: 'Feature',
                properties: { name: 'Orbital Sensor B' },
                geometry: { type: 'Point', coordinates: [lon2, lat2] },
              },
            ],
          });
        }

        // Smooth Earth globe spin when auto-spin is active & not zoomed into street navigation
        if (
          isSpinningRef.current &&
          !isUserInteractingRef.current &&
          mapRef.current.getZoom() < 5
        ) {
          const center = mapRef.current.getCenter();
          center.lng = ((center.lng + dt * 5.2 + 180) % 360) - 180;
          mapRef.current.setCenter(center);
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleToggleLayer = (mode: 'routes' | 'satellite') => {
    setLayerMode(mode);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mode === 'routes' ? ROUTES_VECTOR_STYLE : SATELLITE_HYBRID_STYLE);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await searchLocations(q);
      setSearchResults(results);
      if (results[0] && mapRef.current) {
        const target = results[0];
        setSelectedSite({
          ...target,
          climateZone: 'Street routes & regional boundaries visible',
        });
        setIsSpinning(false);
        mapRef.current.flyTo({
          center: [target.longitude, target.latitude],
          zoom: 12.2,
          pitch: 35,
          duration: 1500,
        });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleResetGlobe = () => {
    if (!mapRef.current) return;
    setIsSpinning(true);
    setSearchResults([]);
    mapRef.current.flyTo({
      center: [selectedSite.longitude, selectedSite.latitude],
      zoom: 1.65,
      pitch: 12,
      bearing: 0,
      duration: 1100,
    });
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#080E20]/90 p-4 lg:h-full">
      {/* Header Metadata & Layer Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-3 text-xs text-[#667085] dark:text-[#94A3B8]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#101828] dark:text-[#F1F5F9]">
          <Satellite className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
          Interactive 3D Earth Globe · Routes &amp; Areas
        </span>

        <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] p-0.5">
          <button
            type="button"
            onClick={() => handleToggleLayer('routes')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              layerMode === 'routes'
                ? 'bg-[#155EEF] text-white'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Compass className="h-3 w-3" aria-hidden="true" />
            Routes &amp; Areas
          </button>
          <button
            type="button"
            onClick={() => handleToggleLayer('satellite')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              layerMode === 'satellite'
                ? 'bg-[#155EEF] text-white'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Layers className="h-3 w-3" aria-hidden="true" />
            Satellite + Routes
          </button>
        </div>
      </div>

      {/* Interactive 3D Globe Stage */}
      <div className="relative my-3 h-[370px] w-full overflow-hidden rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#EAF2FF] dark:bg-[#050814]">
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          aria-label="Interactive rotating 3D Earth globe with zoomable Google Maps style routes, roads, and geographic areas"
        />

        {/* Top-Left Navigation Search Overlay */}
        <form
          onSubmit={handleSearch}
          className="absolute left-3 top-3 z-10 w-[230px] sm:w-[260px]"
        >
          <div className="relative flex items-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 shadow-sm backdrop-blur-xs">
            <Search className="pointer-events-none ml-2.5 h-3.5 w-3.5 text-[#667085] dark:text-[#94A3B8]" />
            <label htmlFor="globe-area-search" className="sr-only">
              Search city, area, or route on the globe
            </label>
            <input
              id="globe-area-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, city, or street..."
              className="w-full bg-transparent px-2 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="mr-1 rounded-md bg-[#155EEF] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#1149C2]"
            >
              Go
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-1 shadow-md">
              {searchResults.map((r) => (
                <button
                  key={`${r.name}-${r.latitude}`}
                  type="button"
                  onClick={() => {
                    setSelectedSite({
                      ...r,
                      climateZone: 'Street routes & local areas active',
                    });
                    setSearchResults([]);
                    setIsSpinning(false);
                    mapRef.current?.flyTo({
                      center: [r.longitude, r.latitude],
                      zoom: 12.5,
                      pitch: 35,
                      duration: 1300,
                    });
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                >
                  <span className="truncate font-medium">
                    {r.name}
                    {r.country ? `, ${r.country}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Right-Side Google Maps Style Zoom & Motion Controls */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setIsSpinning((s) => !s)}
            title={isSpinning ? 'Pause Globe Motion' : 'Resume Globe Motion'}
            aria-label={isSpinning ? 'Pause Globe Motion' : 'Resume Globe Motion'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 text-[#101828] dark:text-[#F1F5F9] shadow-sm hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
          >
            {isSpinning ? (
              <Pause className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" />
            ) : (
              <Play className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn({ duration: 350 })}
            title="Zoom In (See Routes & Areas)"
            aria-label="Zoom In"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 text-[#101828] dark:text-[#F1F5F9] shadow-sm hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut({ duration: 350 })}
            title="Zoom Out (Global View)"
            aria-label="Zoom Out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 text-[#101828] dark:text-[#F1F5F9] shadow-sm hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetGlobe}
            title="Reset to Orbital 3D Globe"
            aria-label="Reset to Orbital 3D Globe"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 text-[#101828] dark:text-[#F1F5F9] shadow-sm hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bottom-Left Live Zoom Telemetry Hint */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/90 dark:bg-[#0B1224]/90 px-2.5 py-1 text-[11px] text-[#667085] dark:text-[#94A3B8] backdrop-blur-xs">
          <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">Zoom {zoomLevel}x</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>
            {zoomLevel < 4
              ? 'Drag or scroll in to inspect highways & local areas'
              : zoomLevel < 10
              ? 'Regional corridors & city areas visible'
              : 'Street-level navigation routes active'}
          </span>
        </div>
      </div>

      {/* Selected Site Inspector Footer */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085] dark:text-[#94A3B8]">
            <Globe className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
            <span>
              {selectedSite.region}
              {selectedSite.country ? `, ${selectedSite.country}` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {selectedSite.latitude.toFixed(2)}°, {selectedSite.longitude.toFixed(2)}°
            </span>
          </div>
          <p className="mt-1 font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
            {selectedSite.name}
            {selectedSite.climateZone ? ` — ${selectedSite.climateZone}` : ''}
          </p>
          {siteLive && (
            <p className="mt-1 inline-flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#15803D] dark:text-[#4ADE80] tabular-nums">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] animate-pulse" />
              <span>
                LIVE: {siteLive.current.temperatureC ?? '—'}°C ·{' '}
                {siteLive.current.humidityPercent ?? '—'}% RH ·{' '}
                {siteLive.current.windSpeedKmh ?? '—'} km/h
                {siteLive.airQuality?.usAqi !== null && siteLive.airQuality?.usAqi !== undefined
                  ? ` · AQI ${siteLive.airQuality.usAqi}`
                  : ''}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onInvestigateLocation(selectedSite)}
          className="rounded-lg bg-[#155EEF] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap shrink-0"
        >
          Investigate Site
        </button>
      </div>
    </div>
  );
}
