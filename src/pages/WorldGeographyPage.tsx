import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  MapLibreMap,
  Marker,
  setWorkerUrl,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import {
  Compass,
  Globe,
  Grid,
  Layers,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  Satellite,
  Search,
} from 'lucide-react';
import { useOrbitera } from '../context/OrbiteraContext';
import { searchLocations } from '../services/api';
import { PanelCard, SectionHeader } from '../components/ui/Primitives';
import type { GeoLocationOption } from '../types/orbitera';

setWorkerUrl(maplibreWorkerUrl);

const ATLAS_VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const VOYAGER_CLEAN_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors · CARTO',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
    },
  ],
};

const SATELLITE_BORDERS_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-world': {
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
      id: 'esri-world-layer',
      type: 'raster',
      source: 'esri-world',
    },
    {
      id: 'carto-labels-layer',
      type: 'raster',
      source: 'carto-labels',
    },
  ],
};

interface WorldRegion {
  id: string;
  name: string;
  category: 'Continent' | 'Ocean';
  lat: number;
  lon: number;
  zoom: number;
  areaMillionKm2: string;
  keyFeature: string;
  climateSpan: string;
}

const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'asia',
    name: 'Asia',
    category: 'Continent',
    lat: 34.0,
    lon: 94.0,
    zoom: 2.3,
    areaMillionKm2: '44.58M km²',
    keyFeature: 'Himalayas · Tibetan Plateau · Indo-Gangetic Plains',
    climateSpan: 'Equatorial rainforest to Siberian Arctic tundra',
  },
  {
    id: 'africa',
    name: 'Africa',
    category: 'Continent',
    lat: 4.5,
    lon: 20.0,
    zoom: 2.5,
    areaMillionKm2: '30.37M km²',
    keyFeature: 'Sahara Desert · Congo Basin · East African Rift',
    climateSpan: 'Crosses Equator and both Tropics symmetrically',
  },
  {
    id: 'north-america',
    name: 'North America',
    category: 'Continent',
    lat: 44.0,
    lon: -100.0,
    zoom: 2.4,
    areaMillionKm2: '24.71M km²',
    keyFeature: 'Rocky Mountains · Great Plains · Hudson Bay',
    climateSpan: 'Arctic Archipelago to Central American tropics',
  },
  {
    id: 'south-america',
    name: 'South America',
    category: 'Continent',
    lat: -15.5,
    lon: -60.0,
    zoom: 2.6,
    areaMillionKm2: '17.84M km²',
    keyFeature: 'Amazon Basin · Andes Cordillera · Atacama Desert',
    climateSpan: 'Equatorial Amazonia to subpolar Patagonia',
  },
  {
    id: 'europe',
    name: 'Europe',
    category: 'Continent',
    lat: 50.5,
    lon: 14.0,
    zoom: 3.1,
    areaMillionKm2: '10.18M km²',
    keyFeature: 'Alps · North European Plain · Scandinavian Peninsula',
    climateSpan: 'Mediterranean basin to Arctic Fennoscandia',
  },
  {
    id: 'oceania',
    name: 'Oceania',
    category: 'Continent',
    lat: -23.0,
    lon: 136.0,
    zoom: 2.9,
    areaMillionKm2: '8.53M km²',
    keyFeature: 'Great Dividing Range · Outback · New Zealand Southern Alps',
    climateSpan: 'Arid interior, tropical monsoon north, temperate islands',
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    category: 'Continent',
    lat: -76.0,
    lon: 15.0,
    zoom: 2.1,
    areaMillionKm2: '14.20M km²',
    keyFeature: 'East Antarctic Ice Sheet · Transantarctic Mountains',
    climateSpan: 'Polar ice cap (strictly south of 60°S)',
  },
  {
    id: 'pacific',
    name: 'Pacific Ocean',
    category: 'Ocean',
    lat: 4.0,
    lon: -155.0,
    zoom: 1.8,
    areaMillionKm2: '165.25M km²',
    keyFeature: 'Mariana Trench · ENSO Equatorial Belt · Ring of Fire',
    climateSpan: 'Largest planetary heat and moisture reservoir',
  },
  {
    id: 'atlantic',
    name: 'Atlantic Ocean',
    category: 'Ocean',
    lat: 12.0,
    lon: -36.0,
    zoom: 2.0,
    areaMillionKm2: '106.46M km²',
    keyFeature: 'Mid-Atlantic Ridge · Gulf Stream / AMOC Corridor',
    climateSpan: 'Connects Arctic and Southern ocean basins',
  },
  {
    id: 'indian',
    name: 'Indian Ocean',
    category: 'Ocean',
    lat: -14.0,
    lon: 76.0,
    zoom: 2.3,
    areaMillionKm2: '70.56M km²',
    keyFeature: 'Monsoon Dipole Basin · Ninety East Ridge',
    climateSpan: 'Drives South Asian and East African monsoon dynamics',
  },
  {
    id: 'arctic',
    name: 'Arctic Ocean',
    category: 'Ocean',
    lat: 79.0,
    lon: 15.0,
    zoom: 2.2,
    areaMillionKm2: '15.56M km²',
    keyFeature: 'Lomonosov Ridge · Seasonal Sea-Ice Cryosphere',
    climateSpan: 'Polar amplification monitoring zone (>66.5°N)',
  },
  {
    id: 'southern',
    name: 'Southern Ocean',
    category: 'Ocean',
    lat: -60.0,
    lon: 45.0,
    zoom: 2.0,
    areaMillionKm2: '21.96M km²',
    keyFeature: 'Antarctic Circumpolar Current (ACC)',
    climateSpan: 'Encircles Antarctica south of 60°S latitude',
  },
];

function classifyClimateBelt(lat: number): string {
  const abs = Math.abs(lat);
  if (abs < 23.436) return 'Tropical Belt (Intertropical Zone)';
  if (abs < 35) return 'Subtropical Belt';
  if (abs < 66.564) return 'Temperate Mid-Latitudes';
  return 'Polar / Cryospheric Circle';
}

function buildReferenceGridGeoJson(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  const addParallel = (lat: number, kind: string, label: string) => {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      coords.push([lon, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind, label },
      geometry: { type: 'LineString', coordinates: coords },
    });
  };

  const addMeridian = (lon: number, kind: string, label: string) => {
    const coords: [number, number][] = [];
    for (let lat = -85; lat <= 85; lat += 4) {
      coords.push([lon, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind, label },
      geometry: { type: 'LineString', coordinates: coords },
    });
  };

  // Subtle 30-degree latitude & longitude graticules
  for (const lat of [-60, -30, 30, 60]) {
    addParallel(lat, 'graticule', `${Math.abs(lat)}°`);
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    if (lon === 0) continue;
    addMeridian(lon, 'graticule', `${lon}°`);
  }

  // Named primary astronomical & geographic parallels/meridians
  addParallel(0, 'equator', 'Equator (0°)');
  addParallel(23.436, 'tropic', 'Tropic of Cancer (23.4°N)');
  addParallel(-23.436, 'tropic', 'Tropic of Capricorn (23.4°S)');
  addParallel(66.564, 'polar', 'Arctic Circle (66.6°N)');
  addParallel(-66.564, 'polar', 'Antarctic Circle (66.6°S)');
  addMeridian(0, 'meridian', 'Prime Meridian (0°)');

  return { type: 'FeatureCollection', features };
}

function addReferenceGridLayers(map: MapLibreMap, visible: boolean) {
  const data = buildReferenceGridGeoJson();
  if (!map.getSource('world-geo-grid')) {
    map.addSource('world-geo-grid', { type: 'geojson', data });
  }

  const vis = visible ? 'visible' : 'none';

  const layerConfigs: {
    id: string;
    filter: ['==', ['get', 'kind'], string];
    color: string;
    width: number;
    opacity: number;
    dasharray?: number[];
  }[] = [
    {
      id: 'world-grid-graticules',
      filter: ['==', ['get', 'kind'], 'graticule'],
      color: '#64748B',
      width: 0.75,
      opacity: 0.25,
    },
    {
      id: 'world-grid-tropics',
      filter: ['==', ['get', 'kind'], 'tropic'],
      color: '#06B6D4',
      width: 1.5,
      opacity: 0.72,
      dasharray: [5, 4],
    },
    {
      id: 'world-grid-polar',
      filter: ['==', ['get', 'kind'], 'polar'],
      color: '#6366F1',
      width: 1.35,
      opacity: 0.68,
      dasharray: [3, 4],
    },
    {
      id: 'world-grid-meridian',
      filter: ['==', ['get', 'kind'], 'meridian'],
      color: '#0F172A',
      width: 1.3,
      opacity: 0.45,
      dasharray: [4, 3],
    },
    {
      id: 'world-grid-equator',
      filter: ['==', ['get', 'kind'], 'equator'],
      color: '#155EEF',
      width: 2.0,
      opacity: 0.85,
    },
  ];

  for (const cfg of layerConfigs) {
    if (!map.getLayer(cfg.id)) {
      map.addLayer({
        id: cfg.id,
        type: 'line',
        source: 'world-geo-grid',
        filter: cfg.filter,
        layout: {
          visibility: vis,
        },
        paint: {
          'line-color': cfg.color,
          'line-width': cfg.width,
          'line-opacity': cfg.opacity,
          ...(cfg.dasharray ? { 'line-dasharray': cfg.dasharray } : {}),
        },
      });
    } else {
      map.setLayoutProperty(cfg.id, 'visibility', vis);
    }
  }
}

export function WorldGeographyPage() {
  const { setDraftConfig, setActiveTab, settings } = useOrbitera();
  const isDark = settings.theme === 'dark';

  const [projectionMode, setProjectionMode] = useState<'mercator' | 'globe'>('mercator');
  const [layerMode, setLayerMode] = useState<'atlas' | 'voyager' | 'satellite'>('atlas');
  const [showGeoLines, setShowGeoLines] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<WorldRegion>(WORLD_REGIONS[0]);
  const [inspectedPoint, setInspectedPoint] = useState<{
    name: string;
    lat: number;
    lon: number;
    note: string;
  }>({
    name: 'Global Center Reference',
    lat: 18.0,
    lon: 12.0,
    note: 'Complete world view · Click anywhere on Earth or select a continent/ocean',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocationOption[]>([]);
  const [searching, setSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const showGeoLinesRef = useRef(showGeoLines);
  const projectionRef = useRef(projectionMode);
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    showGeoLinesRef.current = showGeoLines;
  }, [showGeoLines]);

  useEffect(() => {
    projectionRef.current = projectionMode;
  }, [projectionMode]);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: ATLAS_VECTOR_STYLE,
      center: [12, 18],
      zoom: 1.15,
      minZoom: 0.85,
      maxZoom: 16,
      attributionControl: false,
    });

    mapRef.current = map;

    const applyMapOverlays = () => {
      try {
        map.setProjection({ type: projectionRef.current });
        if (projectionRef.current === 'globe') {
          map.setSky(
            isDarkRef.current
              ? {
                  'sky-color': '#050814',
                  'horizon-color': '#0C1E42',
                  'fog-color': '#050814',
                  'atmosphere-blend': 0.55,
                }
              : {
                  'sky-color': '#EAF2FF',
                  'horizon-color': '#F5F9FF',
                  'fog-color': '#FFFFFF',
                  'atmosphere-blend': 0.5,
                }
          );
        }
      } catch {
        // Ignore transient style errors during rapid switches
      }
      addReferenceGridLayers(map, showGeoLinesRef.current);
    };

    map.on('style.load', applyMapOverlays);

    map.on('click', (e: MapMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(4));
      const lon = Number(e.lngLat.lng.toFixed(4));
      setInspectedPoint({
        name: `Selected Coordinates (${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'})`,
        lat,
        lon,
        note: classifyClimateBelt(lat),
      });
    });

    const markerEl = document.createElement('div');
    markerEl.style.width = '14px';
    markerEl.style.height = '14px';
    markerEl.style.borderRadius = '9999px';
    markerEl.style.background = '#155EEF';
    markerEl.style.border = '2.5px solid #FFFFFF';
    markerEl.style.boxShadow = '0 0 0 4px rgba(21, 94, 239, 0.22)';

    markerRef.current = new Marker({ element: markerEl })
      .setLngLat([inspectedPoint.lon, inspectedPoint.lat])
      .addTo(map);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map style when layerMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style =
      layerMode === 'atlas'
        ? ATLAS_VECTOR_STYLE
        : layerMode === 'voyager'
          ? VOYAGER_CLEAN_STYLE
          : SATELLITE_BORDERS_STYLE;
    map.setStyle(style);
  }, [layerMode]);

  // Update projection mode (Flat World Atlas vs 3D Globe) and sky atmosphere theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      map.setProjection({ type: projectionMode });
      if (projectionMode === 'globe') {
        map.setSky(
          isDark
            ? {
                'sky-color': '#050814',
                'horizon-color': '#0C1E42',
                'fog-color': '#050814',
                'atmosphere-blend': 0.55,
              }
            : {
                'sky-color': '#EAF2FF',
                'horizon-color': '#F5F9FF',
                'fog-color': '#FFFFFF',
                'atmosphere-blend': 0.5,
              }
        );
      }
    } catch {
      // Handled on next style.load if mid-transition
    }
  }, [projectionMode, isDark]);

  // Toggle geographic reference grid lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    addReferenceGridLayers(map, showGeoLines);
  }, [showGeoLines]);

  // Sync pin position cleanly
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([inspectedPoint.lon, inspectedPoint.lat]);
    }
  }, [inspectedPoint]);

  const flyToRegion = (region: WorldRegion) => {
    setSelectedRegion(region);
    setInspectedPoint({
      name: region.name,
      lat: region.lat,
      lon: region.lon,
      note: `${region.category} · ${region.climateSpan}`,
    });
    mapRef.current?.flyTo({
      center: [region.lon, region.lat],
      zoom: region.zoom,
      duration: 950,
    });
  };

  const resetFullWorldView = () => {
    setInspectedPoint({
      name: 'Complete Global Extent',
      lat: 18.0,
      lon: 12.0,
      note: 'Full planetary view showing all continents and ocean basins',
    });
    mapRef.current?.flyTo({
      center: [12, 18],
      zoom: 1.15,
      pitch: 0,
      bearing: 0,
      duration: 900,
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const found = await searchLocations(searchQuery);
      setSearchResults(found);
      if (found[0]) {
        const loc = found[0];
        setInspectedPoint({
          name: `${loc.name}${loc.country ? `, ${loc.country}` : ''}`,
          lat: loc.latitude,
          lon: loc.longitude,
          note: loc.climateZone || classifyClimateBelt(loc.latitude),
        });
        mapRef.current?.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: 4.5,
          duration: 900,
        });
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const launchInvestigationHere = () => {
    setDraftConfig((prev) => ({
      ...prev,
      id: `inv-${Date.now()}`,
      title: `${inspectedPoint.name} Earth System Investigation`,
      query: `Investigate temperature and precipitation trends at ${inspectedPoint.name} (${inspectedPoint.lat.toFixed(2)}, ${inspectedPoint.lon.toFixed(2)}) from 2001 to 2024.`,
      locationName: inspectedPoint.name.split(',')[0].trim(),
      regionLabel: `${inspectedPoint.lat.toFixed(2)}°, ${inspectedPoint.lon.toFixed(2)}°`,
      latitude: inspectedPoint.lat,
      longitude: inspectedPoint.lon,
    }));
    setActiveTab('new-investigation');
  };

  const continents = useMemo(
    () => WORLD_REGIONS.filter((r) => r.category === 'Continent'),
    []
  );
  const oceans = useMemo(() => WORLD_REGIONS.filter((r) => r.category === 'Ocean'), []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="World Geography"
        subtitle="Complete planetary atlas displaying all continents, oceans, borders, terrain, and major latitude parallels."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Projection Toggle */}
            <div
              className="inline-flex rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] p-0.5 text-xs"
              role="group"
              aria-label="World map projection"
            >
              <button
                type="button"
                onClick={() => setProjectionMode('mercator')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium whitespace-nowrap ${
                  projectionMode === 'mercator'
                    ? 'bg-[#155EEF] text-white'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Flat World
              </button>
              <button
                type="button"
                onClick={() => setProjectionMode('globe')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium whitespace-nowrap ${
                  projectionMode === 'globe'
                    ? 'bg-[#155EEF] text-white'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                }`}
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                3D Globe
              </button>
            </div>

            {/* Reference Grid Lines Toggle */}
            <button
              type="button"
              onClick={() => setShowGeoLines((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                showGeoLines
                  ? 'border-[#155EEF]/30 dark:border-[#38BDF8]/40 bg-[#F5F9FF] dark:bg-[#0D162D] text-[#155EEF] dark:text-[#38BDF8]'
                  : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Grid className="h-3.5 w-3.5" aria-hidden="true" />
              Equator &amp; Tropics
            </button>

            <button
              type="button"
              onClick={resetFullWorldView}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-1.5 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
              Full World
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Full-World Geographical Viewport */}
        <div className="lg:col-span-8">
          <PanelCard className="p-0 overflow-hidden">
            {/* Layer Switcher & Search Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#080E20] px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#667085] dark:text-[#94A3B8] mr-1">
                  <Layers className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                  Layer:
                </span>
                <button
                  type="button"
                  onClick={() => setLayerMode('atlas')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    layerMode === 'atlas'
                      ? 'bg-[#155EEF] text-white'
                      : 'bg-white dark:bg-[#0D162D] border border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  Borders &amp; Routes
                </button>
                <button
                  type="button"
                  onClick={() => setLayerMode('voyager')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    layerMode === 'voyager'
                      ? 'bg-[#155EEF] text-white'
                      : 'bg-white dark:bg-[#0D162D] border border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  Clean Atlas
                </button>
                <button
                  type="button"
                  onClick={() => setLayerMode('satellite')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    layerMode === 'satellite'
                      ? 'bg-[#155EEF] text-white'
                      : 'bg-white dark:bg-[#0D162D] border border-[#E4EAF2] dark:border-[#1E2B48] text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <Satellite className="h-3 w-3" aria-hidden="true" />
                  Satellite + Labels
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
                  aria-label="Zoom in world map"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
                  aria-label="Zoom out world map"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* MapLibre Canvas */}
            <div className="relative h-[420px] sm:h-[520px] lg:h-[580px] w-full bg-[#EAF2FF] dark:bg-[#050814]">
              <div
                ref={containerRef}
                className="h-full w-full"
                aria-label="Interactive complete world geographical map"
              />

              {/* Compact Bottom Legend */}
              {showGeoLines && (
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="pointer-events-auto inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#0B1224]/95 px-3 py-1.5 text-[11px] text-[#475467] dark:text-[#CBD5E1] shadow-sm backdrop-blur-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-[#155EEF]" /> Equator 0°
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 border-b-2 border-dashed border-[#06B6D4]" />{' '}
                      Tropics ±23.4°
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 border-b-2 border-dotted border-[#6366F1]" />{' '}
                      Polar Circles ±66.6°
                    </span>
                  </div>
                </div>
              )}
            </div>
          </PanelCard>
        </div>

        {/* Geographic Inspector & Continents / Oceans Directory */}
        <div className="lg:col-span-4 space-y-5">
          {/* Global Place Search + Coordinate Inspector */}
          <PanelCard title="Global Coordinate & Place Finder">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085] dark:text-[#94A3B8]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country, city, or region..."
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] py-2 pl-8 pr-3 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-[#155EEF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#124FD4] disabled:opacity-60 whitespace-nowrap"
              >
                {searching ? 'Finding...' : 'Locate'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] divide-y divide-[#E4EAF2] dark:divide-[#1E2B48]">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.name}-${i}`}
                    type="button"
                    onClick={() => {
                      setInspectedPoint({
                        name: `${r.name}${r.country ? `, ${r.country}` : ''}`,
                        lat: r.latitude,
                        lon: r.longitude,
                        note: r.climateZone || classifyClimateBelt(r.latitude),
                      });
                      mapRef.current?.flyTo({
                        center: [r.longitude, r.latitude],
                        zoom: 5,
                        duration: 900,
                      });
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                  >
                    <div className="font-medium text-[#101828] dark:text-[#F1F5F9]">{r.name}</div>
                    <div className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                      {r.country} · {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-3.5">
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#94A3B8]">Focused Geography</div>
              <div className="mt-0.5 font-display text-sm font-bold text-[#101828] dark:text-[#F1F5F9]">
                {inspectedPoint.name}
              </div>
              <div className="mt-1 font-mono text-xs text-[#155EEF] dark:text-[#38BDF8] tabular-nums">
                {Math.abs(inspectedPoint.lat).toFixed(3)}°{' '}
                {inspectedPoint.lat >= 0 ? 'N' : 'S'} ·{' '}
                {Math.abs(inspectedPoint.lon).toFixed(3)}°{' '}
                {inspectedPoint.lon >= 0 ? 'E' : 'W'}
              </div>
              <p className="mt-1.5 text-xs text-[#475467] dark:text-[#CBD5E1]">{inspectedPoint.note}</p>

              <button
                type="button"
                onClick={launchInvestigationHere}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#124FD4]"
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                Launch Investigation at Location
              </button>
            </div>
          </PanelCard>

          {/* Continents & Oceans Quick-Fly */}
          <PanelCard title="Continents & Major Ocean Basins">
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8]">
                  Continents (7)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {continents.map((region) => {
                    const active = selectedRegion.id === region.id;
                    return (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => flyToRegion(region)}
                        className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          active
                            ? 'border-[#155EEF] dark:border-[#38BDF8] bg-[#F5F9FF] dark:bg-[#111C38] text-[#155EEF] dark:text-[#38BDF8] font-semibold'
                            : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                        }`}
                      >
                        <div className="truncate">{region.name}</div>
                        <div className="font-mono text-[10px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                          {region.areaMillionKm2}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8]">
                  Oceans (5)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {oceans.map((region) => {
                    const active = selectedRegion.id === region.id;
                    return (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => flyToRegion(region)}
                        className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          active
                            ? 'border-[#155EEF] dark:border-[#38BDF8] bg-[#F5F9FF] dark:bg-[#111C38] text-[#155EEF] dark:text-[#38BDF8] font-semibold'
                            : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                        }`}
                      >
                        <div className="truncate">{region.name}</div>
                        <div className="font-mono text-[10px] text-[#667085] dark:text-[#94A3B8] tabular-nums">
                          {region.areaMillionKm2}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] p-3 text-xs">
                <div className="font-semibold text-[#101828] dark:text-[#F1F5F9]">
                  {selectedRegion.name} · {selectedRegion.areaMillionKm2}
                </div>
                <div className="mt-1 text-[#475467] dark:text-[#CBD5E1]">{selectedRegion.keyFeature}</div>
                <div className="mt-1 text-[11px] text-[#667085] dark:text-[#94A3B8]">{selectedRegion.climateSpan}</div>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
