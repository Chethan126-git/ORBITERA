import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarkerItem {
  id: string;
  label: string;
  sublabel?: string;
  latitude: number;
  longitude: number;
  active?: boolean;
  color?: string;
}

function getRecentGibsDate(): string {
  const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function LeafletEarthMap({
  centerLat,
  centerLon,
  zoom = 5,
  markers = [],
  layerMode = 'osm',
  heightClass = 'h-[420px]',
  onSelectCoordinates,
  onSelectMarker,
}: {
  centerLat: number;
  centerLon: number;
  zoom?: number;
  markers?: MapMarkerItem[];
  layerMode?: 'osm' | 'nasa-gibs';
  heightClass?: string;
  onSelectCoordinates?: (lat: number, lon: number) => void;
  onSelectMarker?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLon],
      zoom,
      zoomControl: true,
    });

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onSelectCoordinates) {
        onSelectCoordinates(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
      }
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onSelectCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([centerLat, centerLon], map.getZoom(), { animate: true });
  }, [centerLat, centerLon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (layerMode === 'nasa-gibs') {
      // NASA GIBS MODIS Terra True Color (dynamic recent operational imagery date)
      const gibsDate = getRecentGibsDate();
      tileLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        {
          attribution: 'NASA EOSDIS GIBS / Worldview',
          maxNativeZoom: 9,
          maxZoom: 14,
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }
      ).addTo(map);
    }
  }, [layerMode]);

  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // Selected coordinate ring
    L.circle([centerLat, centerLon], {
      radius: 45000,
      color: '#155EEF',
      weight: 1.5,
      fillColor: '#38BDF8',
      fillOpacity: 0.14,
    }).addTo(group);

    L.circleMarker([centerLat, centerLon], {
      radius: 7,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#155EEF',
      fillOpacity: 1,
    })
      .bindTooltip(`Active Target (${centerLat.toFixed(2)}°, ${centerLon.toFixed(2)}°)`)
      .addTo(group);

    markers.forEach((m) => {
      const marker = L.circleMarker([m.latitude, m.longitude], {
        radius: m.active ? 8 : 6,
        color: '#FFFFFF',
        weight: 2,
        fillColor: m.active ? '#155EEF' : m.color ?? '#06B6D4',
        fillOpacity: 0.95,
      }).addTo(group);

      marker.bindTooltip(`${m.label}${m.sublabel ? ` · ${m.sublabel}` : ''}`);
      if (onSelectMarker) {
        marker.on('click', () => onSelectMarker(m.id));
      }
    });
  }, [centerLat, centerLon, markers, onSelectMarker]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] overflow-hidden ${heightClass}`}
      aria-label="Interactive Earth geographic map"
    />
  );
}
