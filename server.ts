import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { CURATED_LOCATIONS, NASA_VARIABLES } from './src/config/nasaCatalog';
import type {
  ComputedStatisticsBundle,
  DataQualitySummary,
  InvestigationConfig,
  InvestigationType,
  LiveEarthEvent,
  LiveHourlyPoint,
  LiveStationReading,
  LiveTelemetrySnapshot,
  NasaDatasetResponse,
  NasaVariableId,
  ObservationPoint,
  TemporalResolution,
} from './src/types/orbitera';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const VALID_VARIABLES = new Set<NasaVariableId>([
  'T2M',
  'T2M_MAX',
  'T2M_MIN',
  'PRECTOTCORR',
  'RH2M',
  'ALLSKY_SFC_SW_DWN',
  'WS2M',
]);

// In-memory LRU cache for NASA POWER responses (up to 60 entries)
const nasaCache = new Map<string, { timestamp: number; data: NasaDatasetResponse }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const MAX_NASA_YEAR = Math.max(2026, new Date().getUTCFullYear());

// Short-TTL caches for Live Data 2 telemetry & NASA EONET streams
const liveTelemetryCache = new Map<string, { timestamp: number; data: LiveTelemetrySnapshot }>();
const LIVE_TELEMETRY_TTL_MS = 1000 * 25; // 25 seconds

let liveEonetCache: { timestamp: number; events: LiveEarthEvent[]; fetchedAt: string } | null = null;
const LIVE_EONET_TTL_MS = 1000 * 90; // 90 seconds

let livePulseCache: { timestamp: number; stations: LiveStationReading[]; fetchedAt: string } | null = null;
const LIVE_PULSE_TTL_MS = 1000 * 45; // 45 seconds

const PULSE_STATIONS = [
  CURATED_LOCATIONS[0], // Bengaluru
  CURATED_LOCATIONS[2], // Mumbai
  CURATED_LOCATIONS[6], // California Central Valley
  CURATED_LOCATIONS[8], // Svalbard
  CURATED_LOCATIONS[12], // Tokyo
  CURATED_LOCATIONS[13], // Zurich
];

async function fetchLiveTelemetry(
  latitude: number,
  longitude: number,
  locationName: string,
  forceRefresh = false
): Promise<LiveTelemetrySnapshot> {
  const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const cached = liveTelemetryCache.get(key);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < LIVE_TELEMETRY_TTL_MS) {
    return { ...cached.data, locationName };
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,shortwave_radiation` +
    `&hourly=temperature_2m,precipitation,relative_humidity_2m,shortwave_radiation` +
    `&past_days=1&forecast_days=1&timezone=UTC`;

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=UTC`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const [weatherRes, airRes] = await Promise.all([
      fetch(weatherUrl, { headers: { Accept: 'application/json' }, signal: controller.signal }),
      fetch(airUrl, { headers: { Accept: 'application/json' }, signal: controller.signal }).catch(
        () => null
      ),
    ]);

    if (!weatherRes.ok) {
      throw new Error(`Live atmospheric feed returned HTTP ${weatherRes.status}`);
    }

    const weatherJson = (await weatherRes.json()) as {
      elevation?: number;
      current?: Record<string, number | string | undefined>;
      hourly?: {
        time?: string[];
        temperature_2m?: (number | null)[];
        precipitation?: (number | null)[];
        relative_humidity_2m?: (number | null)[];
        shortwave_radiation?: (number | null)[];
      };
    };

    let airJson: { current?: Record<string, number | string | undefined> } | null = null;
    if (airRes && airRes.ok) {
      airJson = (await airRes.json()) as { current?: Record<string, number | string | undefined> };
    }

    const cur = weatherJson.current ?? {};
    const hourlyTimes = weatherJson.hourly?.time ?? [];
    const hourlyTemps = weatherJson.hourly?.temperature_2m ?? [];
    const hourlyPrecip = weatherJson.hourly?.precipitation ?? [];
    const hourlyHum = weatherJson.hourly?.relative_humidity_2m ?? [];
    const hourlySolar = weatherJson.hourly?.shortwave_radiation ?? [];

    const nowMs = Date.now();
    const allHourly: LiveHourlyPoint[] = hourlyTimes.map((t, idx) => {
      const iso = t.endsWith('Z') ? t : `${t}:00Z`;
      return {
        time: iso,
        label: t.slice(11, 16) + 'Z',
        temperatureC: typeof hourlyTemps[idx] === 'number' ? Number(hourlyTemps[idx]!.toFixed(1)) : null,
        precipitationMm: typeof hourlyPrecip[idx] === 'number' ? Number(hourlyPrecip[idx]!.toFixed(2)) : null,
        humidityPercent: typeof hourlyHum[idx] === 'number' ? Math.round(hourlyHum[idx]!) : null,
        solarWm2: typeof hourlySolar[idx] === 'number' ? Math.round(hourlySolar[idx]!) : null,
      };
    });

    // Keep trailing/upcoming 24h centered closely around current UTC hour
    let nearestIdx = allHourly.findIndex((p) => Date.parse(p.time) >= nowMs);
    if (nearestIdx < 0) nearestIdx = allHourly.length;
    const startIdx = Math.max(0, nearestIdx - 18);
    const hourly24h = allHourly.slice(startIdx, startIdx + 24);

    const numOrNull = (val: unknown, digits = 1): number | null =>
      typeof val === 'number' && Number.isFinite(val) ? Number(val.toFixed(digits)) : null;

    const snapshot: LiveTelemetrySnapshot = {
      latitude,
      longitude,
      locationName,
      elevationMeters: typeof weatherJson.elevation === 'number' ? weatherJson.elevation : null,
      observedAt: typeof cur.time === 'string' ? `${cur.time}:00Z` : new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      sourceName: 'Open-Meteo Real-Time Atmospheric & CAMS Air Quality',
      intervalSeconds: typeof cur.interval === 'number' ? cur.interval : 900,
      current: {
        temperatureC: numOrNull(cur.temperature_2m, 1),
        apparentTempC: numOrNull(cur.apparent_temperature, 1),
        humidityPercent: numOrNull(cur.relative_humidity_2m, 0),
        precipitationMm: numOrNull(cur.precipitation, 2),
        windSpeedKmh: numOrNull(cur.wind_speed_10m, 1),
        windDirectionDeg: numOrNull(cur.wind_direction_10m, 0),
        surfacePressureHpa: numOrNull(cur.surface_pressure, 1),
        cloudCoverPercent: numOrNull(cur.cloud_cover, 0),
        solarIrradianceWm2: numOrNull(cur.shortwave_radiation, 0),
      },
      airQuality: airJson?.current
        ? {
            observedAt:
              typeof airJson.current.time === 'string' ? `${airJson.current.time}:00Z` : null,
            usAqi: numOrNull(airJson.current.us_aqi, 0),
            pm25: numOrNull(airJson.current.pm2_5, 1),
            pm10: numOrNull(airJson.current.pm10, 1),
            ozone: numOrNull(airJson.current.ozone, 1),
            no2: numOrNull(airJson.current.nitrogen_dioxide, 1),
            sourceName: 'Open-Meteo CAMS Global Air Quality',
          }
        : null,
      hourly24h,
    };

    if (liveTelemetryCache.size > 40) {
      const oldest = liveTelemetryCache.keys().next().value;
      if (oldest) liveTelemetryCache.delete(oldest);
    }
    liveTelemetryCache.set(key, { timestamp: Date.now(), data: snapshot });
    return snapshot;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveEonetEvents(
  forceRefresh = false
): Promise<{ events: LiveEarthEvent[]; fetchedAt: string; sourceName: string }> {
  if (!forceRefresh && liveEonetCache && Date.now() - liveEonetCache.timestamp < LIVE_EONET_TTL_MS) {
    return {
      events: liveEonetCache.events,
      fetchedAt: liveEonetCache.fetchedAt,
      sourceName: 'NASA EONET v3 (Earth Observatory Natural Event Tracker)',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=25', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`NASA EONET returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      events?: {
        id: string;
        title: string;
        link: string;
        categories?: { id: string; title: string }[];
        sources?: { id: string; url: string }[];
        geometry?: {
          date: string;
          type: string;
          coordinates: unknown;
          magnitudeValue?: number | null;
          magnitudeUnit?: string | null;
        }[];
      }[];
    };

    const events: LiveEarthEvent[] = [];
    for (const ev of json.events ?? []) {
      const latestGeom = ev.geometry?.[ev.geometry.length - 1];
      if (!latestGeom || !Array.isArray(latestGeom.coordinates)) continue;
      let lon: number | null = null;
      let lat: number | null = null;
      if (
        latestGeom.type === 'Point' &&
        typeof latestGeom.coordinates[0] === 'number' &&
        typeof latestGeom.coordinates[1] === 'number'
      ) {
        lon = latestGeom.coordinates[0];
        lat = latestGeom.coordinates[1];
      } else if (
        Array.isArray(latestGeom.coordinates[0]) &&
        Array.isArray(latestGeom.coordinates[0][0]) &&
        typeof latestGeom.coordinates[0][0][0] === 'number'
      ) {
        lon = latestGeom.coordinates[0][0][0];
        lat = latestGeom.coordinates[0][0][1];
      }
      if (lon === null || lat === null || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      events.push({
        id: ev.id,
        title: ev.title,
        category: ev.categories?.[0]?.title || 'Earth Event',
        categoryId: ev.categories?.[0]?.id || 'other',
        date: latestGeom.date,
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
        magnitudeValue:
          typeof latestGeom.magnitudeValue === 'number' ? latestGeom.magnitudeValue : null,
        magnitudeUnit: latestGeom.magnitudeUnit ?? null,
        sourceUrl: ev.sources?.[0]?.url ?? null,
        eonetLink: ev.link,
      });
    }

    const fetchedAt = new Date().toISOString();
    liveEonetCache = { timestamp: Date.now(), events, fetchedAt };
    return {
      events,
      fetchedAt,
      sourceName: 'NASA EONET v3 (Earth Observatory Natural Event Tracker)',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveGlobalPulse(
  forceRefresh = false
): Promise<{ stations: LiveStationReading[]; fetchedAt: string }> {
  if (!forceRefresh && livePulseCache && Date.now() - livePulseCache.timestamp < LIVE_PULSE_TTL_MS) {
    return { stations: livePulseCache.stations, fetchedAt: livePulseCache.fetchedAt };
  }

  const lats = PULSE_STATIONS.map((s) => s.latitude).join(',');
  const lons = PULSE_STATIONS.map((s) => s.longitude).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=UTC`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Live station pulse returned HTTP ${res.status}`);
    }
    const raw = (await res.json()) as
      | { current?: Record<string, number | string | undefined> }[]
      | { current?: Record<string, number | string | undefined> };

    const items = Array.isArray(raw) ? raw : [raw];
    const stations: LiveStationReading[] = PULSE_STATIONS.map((meta, idx) => {
      const cur = items[idx]?.current ?? {};
      return {
        name: meta.name,
        country: meta.country,
        latitude: meta.latitude,
        longitude: meta.longitude,
        temperatureC:
          typeof cur.temperature_2m === 'number' ? Number(cur.temperature_2m.toFixed(1)) : null,
        humidityPercent:
          typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null,
        windSpeedKmh:
          typeof cur.wind_speed_10m === 'number' ? Number(cur.wind_speed_10m.toFixed(1)) : null,
        precipitationMm:
          typeof cur.precipitation === 'number' ? Number(cur.precipitation.toFixed(2)) : null,
        observedAt: typeof cur.time === 'string' ? `${cur.time}:00Z` : new Date().toISOString(),
      };
    });

    const fetchedAt = new Date().toISOString();
    livePulseCache = { timestamp: Date.now(), stations, fetchedAt };
    return { stations, fetchedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeText(input: unknown, maxLen = 600): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

/**
 * Deterministic query parser fallback when Gemini key is unavailable or fails.
 */
function deterministicParseQuery(rawQuery: string): Partial<InvestigationConfig> {
  const q = rawQuery.toLowerCase();

  // Match locations
  const matchedLocations = CURATED_LOCATIONS.filter(
    (loc) =>
      q.includes(loc.name.toLowerCase()) ||
      q.includes(loc.region.toLowerCase()) ||
      (loc.name.toLowerCase().includes('karnataka') && q.includes('karnataka')) ||
      (loc.name.toLowerCase().includes('tamil nadu') && q.includes('tamil nadu')) ||
      (loc.name.toLowerCase().includes('california') && q.includes('california')) ||
      (loc.name.toLowerCase().includes('svalbard') && q.includes('svalbard')) ||
      (loc.name.toLowerCase().includes('amazon') && q.includes('amazon'))
  );

  const primaryLoc =
    matchedLocations[0] ??
    CURATED_LOCATIONS.find((l) => l.name === 'Bengaluru') ??
    CURATED_LOCATIONS[0];

  const compareLocation = matchedLocations.length > 1 ? matchedLocations[1] : null;

  // Match variables
  const vars: NasaVariableId[] = [];
  if (q.includes('temp') || q.includes('heat') || q.includes('warm')) vars.push('T2M');
  if (q.includes('max temp') || q.includes('heatwave')) vars.push('T2M_MAX');
  if (q.includes('min temp') || q.includes('night')) vars.push('T2M_MIN');
  if (q.includes('rain') || q.includes('precip') || q.includes('drought') || q.includes('monsoon'))
    vars.push('PRECTOTCORR');
  if (q.includes('humid') || q.includes('moisture') || q.includes('drought')) vars.push('RH2M');
  if (q.includes('solar') || q.includes('irradiance') || q.includes('sun'))
    vars.push('ALLSKY_SFC_SW_DWN');
  if (q.includes('wind')) vars.push('WS2M');
  if (vars.length === 0) vars.push('T2M', 'PRECTOTCORR');

  // Match years
  const yearMatches = rawQuery.match(/\b(19[89]\d|20[0-2]\d)\b/g);
  let startYear = 2001;
  let endYear = 2024;
  if (yearMatches && yearMatches.length >= 2) {
    const yrs = yearMatches.map(Number).sort((a, b) => a - b);
    startYear = Math.max(1981, yrs[0]);
    endYear = Math.min(MAX_NASA_YEAR, yrs[yrs.length - 1]);
  } else if (yearMatches && yearMatches.length === 1) {
    startYear = Math.max(1981, Number(yearMatches[0]));
  }
  if (endYear <= startYear) endYear = Math.min(MAX_NASA_YEAR, startYear + 10);

  let investigationType: InvestigationType = 'Long-Term Trend Investigation';
  if (compareLocation || q.includes('compare') || q.includes(' vs ')) {
    investigationType = 'Regional Comparison';
  } else if (q.includes('anomal') || q.includes('unusual') || q.includes('extreme')) {
    investigationType = 'Environmental Anomaly Investigation';
  } else if (q.includes('relationship') || q.includes('correlat') || vars.length >= 2) {
    investigationType = 'Multi-Variable Relationship Investigation';
  } else if (q.includes('season')) {
    investigationType = 'Seasonal Pattern Investigation';
  }

  return {
    title: `${primaryLoc.name} ${vars.map((v) => NASA_VARIABLES[v].shortLabel).join(' & ')} Investigation`,
    query: rawQuery,
    locationName: primaryLoc.name,
    regionLabel: `${primaryLoc.region}, ${primaryLoc.country}`,
    latitude: primaryLoc.latitude,
    longitude: primaryLoc.longitude,
    variables: Array.from(new Set(vars)),
    startYear,
    endYear,
    resolution: 'monthly',
    investigationType,
    compareLocation,
  };
}

function parseNasaPowerMonthlyOrAnnual(
  rawJson: Record<string, unknown>,
  variables: NasaVariableId[],
  startYear: number,
  endYear: number,
  resolution: TemporalResolution,
  endpointUrl: string,
  latitude: number,
  longitude: number
): NasaDatasetResponse {
  const properties = (rawJson.properties ?? {}) as Record<string, unknown>;
  const parameterMap = (properties.parameter ?? {}) as Record<string, Record<string, number>>;
  const geometry = (rawJson.geometry ?? {}) as { coordinates?: number[] };
  const elevationMeters =
    Array.isArray(geometry.coordinates) && typeof geometry.coordinates[2] === 'number'
      ? geometry.coordinates[2]
      : null;

  const dateKeysSet = new Set<string>();
  for (const v of variables) {
    const series = parameterMap[v] ?? {};
    for (const key of Object.keys(series)) {
      dateKeysSet.add(key);
    }
  }

  const sortedKeys = Array.from(dateKeysSet).sort();
  const observations: ObservationPoint[] = [];
  const validPointsByVariable: Partial<Record<NasaVariableId, number>> = {};
  const missingPointsByVariable: Partial<Record<NasaVariableId, number>> = {};
  let missingSentinelCount = 0;

  for (const v of variables) {
    validPointsByVariable[v] = 0;
    missingPointsByVariable[v] = 0;
  }

  if (resolution === 'daily') {
    for (const rawKey of sortedKeys) {
      if (rawKey.length !== 8) continue;
      const year = Number(rawKey.slice(0, 4));
      const month = Number(rawKey.slice(4, 6));
      const day = Number(rawKey.slice(6, 8));
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const decimalYear = year + (month - 1) / 12 + (day - 1) / 365.25;

      const values: Partial<Record<NasaVariableId, number | null>> = {};
      for (const v of variables) {
        const val = parameterMap[v]?.[rawKey];
        if (typeof val !== 'number' || val <= -900 || !Number.isFinite(val)) {
          values[v] = null;
          missingPointsByVariable[v] = (missingPointsByVariable[v] ?? 0) + 1;
          if (typeof val === 'number' && val <= -900) missingSentinelCount++;
        } else {
          values[v] = Number(val.toFixed(3));
          validPointsByVariable[v] = (validPointsByVariable[v] ?? 0) + 1;
        }
      }
      observations.push({ dateKey, year, month, decimalYear, values });
    }
  } else if (resolution === 'annual') {
    // NASA POWER monthly endpoint includes MM=13 as annual mean!
    for (let yr = startYear; yr <= endYear; yr++) {
      const annualKey = `${yr}13`;
      const values: Partial<Record<NasaVariableId, number | null>> = {};
      for (const v of variables) {
        const directAnnual = parameterMap[v]?.[annualKey];
        if (typeof directAnnual === 'number' && directAnnual > -900 && Number.isFinite(directAnnual)) {
          values[v] = Number(directAnnual.toFixed(3));
          validPointsByVariable[v] = (validPointsByVariable[v] ?? 0) + 1;
        } else {
          // Compute mean across valid months 01..12
          const monthVals: number[] = [];
          for (let m = 1; m <= 12; m++) {
            const mk = `${yr}${String(m).padStart(2, '0')}`;
            const mv = parameterMap[v]?.[mk];
            if (typeof mv === 'number' && mv > -900 && Number.isFinite(mv)) {
              monthVals.push(mv);
            }
          }
          if (monthVals.length >= 6) {
            const avg = monthVals.reduce((a, b) => a + b, 0) / monthVals.length;
            values[v] = Number(avg.toFixed(3));
            validPointsByVariable[v] = (validPointsByVariable[v] ?? 0) + 1;
          } else {
            values[v] = null;
            missingPointsByVariable[v] = (missingPointsByVariable[v] ?? 0) + 1;
            missingSentinelCount++;
          }
        }
      }
      observations.push({
        dateKey: String(yr),
        year: yr,
        month: null,
        decimalYear: yr + 0.5,
        values,
      });
    }
  } else {
    // Monthly (skip MM=13 annual summary rows)
    for (const rawKey of sortedKeys) {
      if (rawKey.length !== 6) continue;
      const year = Number(rawKey.slice(0, 4));
      const month = Number(rawKey.slice(4, 6));
      if (month < 1 || month > 12) continue;
      const dateKey = `${year}-${String(month).padStart(2, '0')}`;
      const decimalYear = year + (month - 0.5) / 12;

      const values: Partial<Record<NasaVariableId, number | null>> = {};
      for (const v of variables) {
        const val = parameterMap[v]?.[rawKey];
        if (typeof val !== 'number' || val <= -900 || !Number.isFinite(val)) {
          values[v] = null;
          missingPointsByVariable[v] = (missingPointsByVariable[v] ?? 0) + 1;
          if (typeof val === 'number' && val <= -900) missingSentinelCount++;
        } else {
          values[v] = Number(val.toFixed(3));
          validPointsByVariable[v] = (validPointsByVariable[v] ?? 0) + 1;
        }
      }
      observations.push({ dateKey, year, month, decimalYear, values });
    }
  }

  const completenessPercentByVariable: Partial<Record<NasaVariableId, number>> = {};
  const totalObs = Math.max(1, observations.length);
  for (const v of variables) {
    completenessPercentByVariable[v] = Number(
      (((validPointsByVariable[v] ?? 0) / totalObs) * 100).toFixed(1)
    );
  }

  const quality: DataQualitySummary = {
    totalExpectedPoints: observations.length,
    validPointsByVariable,
    missingPointsByVariable,
    completenessPercentByVariable,
    missingSentinelCount,
  };

  return {
    sourceName: 'NASA POWER (Prediction Of Worldwide Energy Resources)',
    sourceEndpoint: endpointUrl,
    datasetVersion: 'POWER API v2 / MERRA-2 & CERES SYN1deg',
    isSimulated: false,
    retrievedAt: new Date().toISOString(),
    latitude,
    longitude,
    elevationMeters,
    resolution,
    startYear,
    endYear,
    variables,
    observations,
    quality,
    spatialResolutionNote:
      'Meteorological parameters derived from NASA MERRA-2 (0.5° × 0.625° grid); solar parameters from CERES SYN1deg (1.0° × 1.0° grid).',
    limitations: [
      'Gridded satellite/reanalysis values represent grid-cell averages and may smooth hyper-local urban heat islands or localized convective rainfall.',
      'Recent trailing months (especially current calendar year) may reflect preliminary assimilation or missing sentinel values (-999 filtered).',
      ...variables.map((v) => `${v}: ${NASA_VARIABLES[v].limitations}`),
    ],
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ORBITERA API',
      geminiConfigured: Boolean(getGeminiClient()),
      liveTelemetryEnabled: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Live Data 2: Real-Time Point Telemetry (Open-Meteo Forecast + CAMS Air Quality)
  app.get('/api/live/telemetry', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat ?? 12.9716);
    const lon = Number(req.query.lon ?? 77.5946);
    const label = sanitizeText(req.query.label, 80) || 'Target Coordinate';
    const force = req.query.force === '1';

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude for live telemetry.' });
    }

    try {
      const snapshot = await fetchLiveTelemetry(lat, lon, label, force);
      return res.json(snapshot);
    } catch (err) {
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to fetch live atmospheric telemetry.',
      });
    }
  });

  // Live Data 2: NASA EONET v3 Live Natural Events
  app.get('/api/live/events', async (req: Request, res: Response) => {
    const force = req.query.force === '1';
    try {
      const payload = await fetchLiveEonetEvents(force);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to fetch NASA EONET live events.',
      });
    }
  });

  // Live Data 2: Global Reference Stations Real-Time Pulse
  app.get('/api/live/pulse', async (req: Request, res: Response) => {
    const force = req.query.force === '1';
    try {
      const payload = await fetchLiveGlobalPulse(force);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to fetch live global station pulse.',
      });
    }
  });

  // Live Data 2: Server-Sent Events (SSE) Real-Time Stream
  app.get('/api/live/stream', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat ?? 12.9716);
    const lon = Number(req.query.lon ?? 77.5946);
    const label = sanitizeText(req.query.label, 80) || 'Active Target';

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid coordinates for live stream.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let closed = false;
    const sendEvent = (event: string, data: unknown) => {
      if (closed || res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', {
      latitude: lat,
      longitude: lon,
      locationName: label,
      connectedAt: new Date().toISOString(),
      refreshIntervalSeconds: 30,
    });

    const pushTelemetryAndPulse = async (force = false) => {
      try {
        const [telemetry, pulse] = await Promise.all([
          fetchLiveTelemetry(lat, lon, label, force),
          fetchLiveGlobalPulse(force),
        ]);
        sendEvent('telemetry:update', telemetry);
        sendEvent('pulse:update', pulse);
      } catch (err) {
        sendEvent('stream:warning', {
          message: err instanceof Error ? err.message : 'Live telemetry refresh delayed.',
          timestamp: new Date().toISOString(),
        });
      }
    };

    const pushEvents = async (force = false) => {
      try {
        const eventsPayload = await fetchLiveEonetEvents(force);
        sendEvent('events:update', eventsPayload);
      } catch (err) {
        sendEvent('stream:warning', {
          message: err instanceof Error ? err.message : 'NASA EONET refresh delayed.',
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Initial authoritative sync immediately on stream connect
    void Promise.all([pushTelemetryAndPulse(false), pushEvents(false)]);

    // Server-driven live polling ticks pushed to client
    const telemetryTimer = setInterval(() => {
      void pushTelemetryAndPulse(true);
    }, 30000);

    const eventsTimer = setInterval(() => {
      void pushEvents(true);
    }, 90000);

    const heartbeatTimer = setInterval(() => {
      if (!closed && !res.writableEnded) {
        sendEvent('heartbeat', { timestamp: new Date().toISOString() });
      }
    }, 15000);

    req.on('close', () => {
      closed = true;
      clearInterval(telemetryTimer);
      clearInterval(eventsTimer);
      clearInterval(heartbeatTimer);
    });
  });

  // Geocoding / location search
  app.get('/api/geocode', async (req: Request, res: Response) => {
    const q = sanitizeText(req.query.q, 120);
    if (!q) {
      return res.json({ results: CURATED_LOCATIONS });
    }
    const lower = q.toLowerCase();
    const localMatches = CURATED_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(lower) ||
        loc.region.toLowerCase().includes(lower) ||
        loc.country.toLowerCase().includes(lower)
    );
    if (localMatches.length > 0) {
      return res.json({ results: localMatches });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        {
          headers: { 'User-Agent': 'ORBITERA-NASA-SpaceApps/1.0' },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (!nomRes.ok) {
        return res.json({ results: [] });
      }
      const raw = (await nomRes.json()) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];
      const mapped = raw.map((item) => {
        const parts = item.display_name.split(',').map((s) => s.trim());
        return {
          name: parts[0] || q,
          region: parts[1] || '',
          country: parts[parts.length - 1] || '',
          latitude: Number(Number(item.lat).toFixed(4)),
          longitude: Number(Number(item.lon).toFixed(4)),
        };
      });
      return res.json({ results: mapped });
    } catch {
      return res.json({ results: [] });
    }
  });

  // Live NASA POWER Data Retrieval
  app.post('/api/nasa/power', async (req: Request, res: Response) => {
    try {
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);
      const startYear = Number(req.body.startYear);
      const endYear = Number(req.body.endYear);
      const resolution: TemporalResolution =
        req.body.resolution === 'daily' || req.body.resolution === 'annual'
          ? req.body.resolution
          : 'monthly';
      const rawVars: unknown[] = Array.isArray(req.body.variables)
        ? req.body.variables
        : ['T2M', 'PRECTOTCORR'];
      const variables: NasaVariableId[] = Array.from(
        new Set<NasaVariableId>(
          rawVars.filter(
            (v: unknown): v is NasaVariableId =>
              typeof v === 'string' && VALID_VARIABLES.has(v as NasaVariableId)
          )
        )
      );

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          error: 'Coordinates out of valid range. Latitude must be [-90, 90] and longitude [-180, 180].',
        });
      }

      if (variables.length === 0) {
        return res.status(400).json({
          error: 'Select at least one supported NASA POWER environmental variable.',
        });
      }

      const currentYear = MAX_NASA_YEAR;
      if (
        !Number.isInteger(startYear) ||
        !Number.isInteger(endYear) ||
        startYear < 1981 ||
        endYear > currentYear ||
        endYear < startYear
      ) {
        return res.status(400).json({
          error: `Date range must fall between 1981 and ${currentYear} with start year ≤ end year.`,
        });
      }

      // Daily NASA POWER endpoint works best on <= 3 year spans to keep payload crisp
      const effectiveStartYear =
        resolution === 'daily' && endYear - startYear > 3 ? endYear - 2 : startYear;

      const cacheKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${effectiveStartYear}:${endYear}:${resolution}:${variables.join(',')}`;
      const cached = nasaCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      const paramsStr = variables.join(',');
      const url =
        resolution === 'daily'
          ? `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${paramsStr}&community=RE&longitude=${longitude}&latitude=${latitude}&start=${effectiveStartYear}0101&end=${endYear}1231&format=JSON`
          : `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${paramsStr}&community=RE&longitude=${longitude}&latitude=${latitude}&start=${effectiveStartYear}&end=${endYear}&format=JSON`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);
      const nasaRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!nasaRes.ok) {
        return res.status(502).json({
          error: `NASA POWER service returned HTTP ${nasaRes.status}. Please adjust date bounds or retry.`,
        });
      }

      const rawJson = (await nasaRes.json()) as Record<string, unknown>;
      const parsed = parseNasaPowerMonthlyOrAnnual(
        rawJson,
        variables,
        effectiveStartYear,
        endYear,
        resolution,
        url,
        latitude,
        longitude
      );

      if (nasaCache.size > 60) {
        const oldestKey = nasaCache.keys().next().value;
        if (oldestKey) nasaCache.delete(oldestKey);
      }
      nasaCache.set(cacheKey, { timestamp: Date.now(), data: parsed });

      return res.json(parsed);
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return res.status(504).json({
        error: isTimeout
          ? 'NASA POWER API request timed out. Try a narrower year range or retry.'
          : 'Unable to retrieve measurements from NASA POWER API right now.',
      });
    }
  });

  // Query Parser Agent (Gemini 4 Hydrogen with structured JSON schema + deterministic fallback)
  app.post('/api/agents/parse-query', async (req: Request, res: Response) => {
    const rawQuery = sanitizeText(req.body.query, 500);
    if (!rawQuery) {
      return res.status(400).json({ error: 'Please enter an Earth-system question to investigate.' });
    }

    const fallback = deterministicParseQuery(rawQuery);
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ config: fallback, parsedByGemini: false });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Parse this Earth-system scientific investigation request into structured parameters for NASA POWER retrieval:
Query: "${rawQuery}"

Supported NASA POWER variables:
- T2M (Air Temperature 2m, °C)
- T2M_MAX (Max Temperature 2m, °C)
- T2M_MIN (Min Temperature 2m, °C)
- PRECTOTCORR (Bias-Corrected Precipitation, mm/day)
- RH2M (Relative Humidity 2m, %)
- ALLSKY_SFC_SW_DWN (Surface Solar Irradiance, kW-hr/m²/day)
- WS2M (Wind Speed 2m, m/s)

Note: Valid years are 1981 to ${MAX_NASA_YEAR}. Default to 2001–2024 if years are omitted. If two locations are compared, include compareLocationName, compareLatitude, compareLongitude.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are the ORBITERA Query Parser. Return accurate geographic coordinates, appropriate NASA POWER variable IDs, and clear scientific titles.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              locationName: { type: Type.STRING },
              regionLabel: { type: Type.STRING },
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER },
              variables: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              startYear: { type: Type.INTEGER },
              endYear: { type: Type.INTEGER },
              resolution: { type: Type.STRING },
              investigationType: { type: Type.STRING },
              compareLocationName: { type: Type.STRING },
              compareRegionLabel: { type: Type.STRING },
              compareLatitude: { type: Type.NUMBER },
              compareLongitude: { type: Type.NUMBER },
            },
            required: [
              'title',
              'locationName',
              'latitude',
              'longitude',
              'variables',
              'startYear',
              'endYear',
              'investigationType',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      const validVars = Array.isArray(parsed.variables)
        ? parsed.variables.filter((v): v is NasaVariableId => VALID_VARIABLES.has(v as NasaVariableId))
        : [];

      const startYear = Math.max(1981, Math.min(MAX_NASA_YEAR - 1, Number(parsed.startYear) || fallback.startYear || 2001));
      const endYear = Math.max(startYear, Math.min(MAX_NASA_YEAR, Number(parsed.endYear) || fallback.endYear || 2024));

      const config: Partial<InvestigationConfig> = {
        title: sanitizeText(parsed.title, 120) || fallback.title,
        query: rawQuery,
        locationName: sanitizeText(parsed.locationName, 80) || fallback.locationName,
        regionLabel: sanitizeText(parsed.regionLabel, 100) || fallback.regionLabel,
        latitude:
          typeof parsed.latitude === 'number' && Math.abs(parsed.latitude) <= 90
            ? Number(parsed.latitude.toFixed(4))
            : fallback.latitude,
        longitude:
          typeof parsed.longitude === 'number' && Math.abs(parsed.longitude) <= 180
            ? Number(parsed.longitude.toFixed(4))
            : fallback.longitude,
        variables: validVars.length > 0 ? validVars : fallback.variables,
        startYear,
        endYear,
        resolution:
          parsed.resolution === 'annual' || parsed.resolution === 'daily'
            ? parsed.resolution
            : 'monthly',
        investigationType: (parsed.investigationType as InvestigationType) || fallback.investigationType,
        compareLocation:
          typeof parsed.compareLocationName === 'string' &&
          parsed.compareLocationName.trim() &&
          typeof parsed.compareLatitude === 'number' &&
          typeof parsed.compareLongitude === 'number'
            ? {
                name: sanitizeText(parsed.compareLocationName, 80),
                region: sanitizeText(parsed.compareRegionLabel, 80),
                country: '',
                latitude: Number(parsed.compareLatitude.toFixed(4)),
                longitude: Number(parsed.compareLongitude.toFixed(4)),
              }
            : fallback.compareLocation,
      };

      return res.json({ config, parsedByGemini: true });
    } catch {
      return res.json({ config: fallback, parsedByGemini: false });
    }
  });

  // Agent 1: Earth Scout
  app.post('/api/agents/earth-scout', async (req: Request, res: Response) => {
    const config = req.body.config as InvestigationConfig;
    if (!config || !Array.isArray(config.variables)) {
      return res.status(400).json({ error: 'Invalid investigation configuration for Earth Scout.' });
    }

    const deterministicScout = {
      recommendedDatasets: [
        {
          datasetName: 'NASA POWER v2 (MERRA-2 & CERES SYN1deg)',
          parameters: config.variables.map((v) => `${v} (${NASA_VARIABLES[v]?.nasaParameter || v})`),
          spatialResolution: '0.5° × 0.625° (MERRA-2) / 1.0° × 1.0° (CERES)',
          temporalCoverage: `${config.startYear}–${config.endYear} (${config.resolution})`,
        },
      ],
      supplementaryCollections: [
        'NASA Worldview GIBS (MODIS Terra/Aqua True Color Context)',
        'NASA Giovanni & Earthdata EOSDIS Cross-Verification',
      ],
      dataLimitations: config.variables.map((v) => `${v}: ${NASA_VARIABLES[v]?.limitations || ''}`),
      retrievalReady: true,
      summary: `Identified ${config.variables.length} NASA POWER parameter(s) for ${config.locationName} (${config.latitude}°, ${config.longitude}°) across ${config.startYear}–${config.endYear}.`,
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ output: deterministicScout, usedGemini: false });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `As Agent 1 (Earth Scout — NASA Data Discovery Agent), prepare the dataset discovery assessment for:
Location: ${config.locationName} (${config.latitude}, ${config.longitude})
Period: ${config.startYear} to ${config.endYear} (${config.resolution})
Variables requested: ${config.variables.map((v) => `${v} - ${NASA_VARIABLES[v]?.label}`).join(', ')}
Investigation Type: ${config.investigationType}

Rules:
- Only reference genuine NASA POWER (MERRA-2 / CERES), NASA Worldview (GIBS), NASA Giovanni, and NASA Earthdata capabilities.
- Do NOT invent dataset availability or fabricate metrics.
- Summarize geographic coverage, temporal resolution, and key dataset limitations clearly.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              geographicSuitability: { type: Type.STRING },
              temporalCoverageNote: { type: Type.STRING },
              dataLimitations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['summary', 'geographicSuitability', 'temporalCoverageNote', 'dataLimitations'],
          },
        },
      });
      const aiJson = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      return res.json({
        output: {
          ...deterministicScout,
          ...aiJson,
        },
        usedGemini: true,
      });
    } catch {
      return res.json({ output: deterministicScout, usedGemini: false });
    }
  });

  // Agents 2–6 Coordinated Synthesis grounded strictly in computed statistics
  app.post('/api/agents/analyze', async (req: Request, res: Response) => {
    const config = req.body.config as InvestigationConfig;
    const dataset = req.body.dataset as NasaDatasetResponse;
    const statistics = req.body.statistics as ComputedStatisticsBundle;

    if (!config || !dataset || !statistics) {
      return res.status(400).json({ error: 'Missing dataset or computed statistics payload.' });
    }

    const trendEntries = Object.values(statistics.trends).filter(Boolean);
    const topAnomalies = statistics.anomalies.slice(0, 6);

    const deterministicSummary = {
      trendDetective: {
        summary: trendEntries
          .map(
            (t) =>
              `${NASA_VARIABLES[t!.variable].label}: ${t!.category} (${t!.olsSlopePerDecade >= 0 ? '+' : ''}${t!.olsSlopePerDecade} ${t!.unit}/decade, Mann-Kendall Z=${t!.mannKendallZ}, p=${t!.mannKendallPValue}, N=${t!.sampleCount}).`
          )
          .join(' '),
        keyFindings: trendEntries.map(
          (t) =>
            `${t!.variable} exhibits a ${t!.category.toLowerCase()} trajectory with Sen's slope ${t!.sensSlopePerDecade} ${t!.unit}/decade (95% CI [${t!.slopeConfidenceInterval95[0]}, ${t!.slopeConfidenceInterval95[1]}]).`
        ),
      },
      anomalyHunter: {
        summary:
          topAnomalies.length > 0
            ? `Detected ${statistics.anomalies.length} seasonal-baseline deviations (|Z| ≥ 2.0σ). Largest deviation: ${topAnomalies[0].variable} in ${topAnomalies[0].dateKey} (${topAnomalies[0].observed} ${topAnomalies[0].unit}, Z=${topAnomalies[0].zScore}σ).`
            : 'No observations exceeded the seasonal baseline anomaly threshold during this investigation window.',
        highlightAnomalies: topAnomalies.map(
          (a) =>
            `${a.dateKey} (${a.variable}): ${a.observed} ${a.unit} vs baseline ${a.baselineMean} ${a.unit} (Z=${a.zScore}σ, ${a.severity})`
        ),
      },
      correlationIntelligence: {
        summary:
          statistics.correlations.length > 0
            ? statistics.correlations
                .map(
                  (c) =>
                    `${c.varA} vs ${c.varB}: ${c.strengthLabel} ${c.directionLabel} association (Pearson r=${c.pearsonR}, Spearman ρ=${c.spearmanRho}, N=${c.sampleCount}).`
                )
                .join(' ')
            : 'Single-variable investigation; select at least two variables to evaluate cross-variable associations.',
        causationCaution:
          'Statistical correlation reflects co-variation within the NASA POWER grid cell and must not be interpreted as direct proof of causation.',
      },
      earthExplainer: {
        scientificMode: `Across ${config.locationName} (${config.latitude}°, ${config.longitude}°) from ${config.startYear} to ${config.endYear}, NASA POWER observations show ${
          trendEntries
            .map(
              (t) =>
                `a ${t!.category.toLowerCase()} ${NASA_VARIABLES[t!.variable].shortLabel.toLowerCase()} trend (${t!.olsSlopePerDecade >= 0 ? '+' : ''}${t!.olsSlopePerDecade} ${t!.unit}/decade, MK p=${t!.mannKendallPValue})`
            )
            .join(' and ') || 'measured baseline conditions'
        }. ${statistics.convergence.summary}`,
        simplifiedMode: `Here is what Earth's satellite-reanalysis record is telling us for ${config.locationName} (${config.startYear}–${config.endYear}): ${
          trendEntries
            .map(
              (t) =>
                `${NASA_VARIABLES[t!.variable].shortLabel} is ${t!.category.toLowerCase()} by about ${Math.abs(t!.olsSlopePerDecade)} ${t!.unit} per decade`
            )
            .join(', while ')
        }. We also spotted ${statistics.anomalies.length} unusual seasonal shifts that stand out from normal month-to-month weather.`,
        uncertaintyStatement:
          'Findings reflect 0.5° × 0.625° MERRA-2 grid-cell averages; localized microclimates and sensor station records may vary.',
        environmentalImplications:
          'Sustained directional shifts in temperature and hydrological variables warrant cross-checking with regional land-cover, urban expansion, and watershed storage datasets.',
      },
      recommendations: [
        {
          title: 'Examine Surface Solar & Humidity Coupling',
          rationale: 'Add RH2M and ALLSKY_SFC_SW_DWN to evaluate radiative and moisture co-evolution.',
          category: 'Variable Expansion',
          suggestedQuery: `Investigate temperature, humidity, and solar irradiance trends in ${config.locationName} from ${config.startYear} to ${config.endYear}.`,
        },
        {
          title: 'Compare Against Coastal or Neighboring Basin',
          rationale: 'Benchmark regional trend slope against a contrasting geographic climate zone.',
          category: 'Regional Comparison',
          suggestedQuery: `Compare temperature and precipitation patterns in ${config.locationName} and Chennai from ${config.startYear} to ${config.endYear}.`,
        },
        {
          title: 'Extend Historical Baseline to 1985',
          rationale: 'Longer baseline records improve Mann-Kendall power and seasonal reference stability.',
          category: 'Time Horizon',
          suggestedQuery: `Investigate long-term temperature and precipitation trends in ${config.locationName} from 1985 to ${config.endYear}.`,
        },
      ],
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ synthesis: deterministicSummary, usedGemini: false });
    }

    try {
      const compactStats = {
        location: `${config.locationName} (${config.latitude}, ${config.longitude})`,
        period: `${config.startYear}-${config.endYear} (${config.resolution})`,
        trends: trendEntries.map((t) => ({
          variable: t!.variable,
          unit: t!.unit,
          category: t!.category,
          olsSlopePerDecade: t!.olsSlopePerDecade,
          sensSlopePerDecade: t!.sensSlopePerDecade,
          mannKendallZ: t!.mannKendallZ,
          mannKendallPValue: t!.mannKendallPValue,
          rSquared: t!.rSquared,
          sampleCount: t!.sampleCount,
          mean: t!.mean,
        })),
        topAnomalies: topAnomalies.map((a) => ({
          variable: a.variable,
          dateKey: a.dateKey,
          observed: a.observed,
          baselineMean: a.baselineMean,
          zScore: a.zScore,
          severity: a.severity,
        })),
        correlations: statistics.correlations.map((c) => ({
          varA: c.varA,
          varB: c.varB,
          pearsonR: c.pearsonR,
          spearmanRho: c.spearmanRho,
          strengthLabel: c.strengthLabel,
          directionLabel: c.directionLabel,
          sampleCount: c.sampleCount,
        })),
        earthSignalScore: statistics.earthSignalScore,
        convergence: statistics.convergence,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are coordinating ORBITERA's analytical agents (Trend Detective, Anomaly Hunter, Correlation Intelligence, Earth Explainer, Mission Reporter).
Using ONLY the exact computed NASA POWER statistics below, synthesize structured scientific findings.

CRITICAL SCIENTIFIC INTEGRITY RULES:
1. NEVER invent or alter numbers. Quote ONLY exact figures from the JSON below.
2. Distinguish seasonal variation from true anomalies.
3. Never present correlation as proof of causation.
4. Never use alarmist or disaster-prediction language; frame ORBITERA as an exploratory scientific platform.
5. In Earth Explainer, write BOTH a formal "scientificMode" paragraph AND an engaging, accurate, Gen Z-friendly "simplifiedMode" explanation (no excessive slang, just clear human phrasing like "Here's the signal...").

Computed Statistics JSON:
${JSON.stringify(compactStats, null, 2)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trendDetectiveSummary: { type: Type.STRING },
              anomalyHunterSummary: { type: Type.STRING },
              correlationSummary: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              scientificModeExplanation: { type: Type.STRING },
              simplifiedModeExplanation: { type: Type.STRING },
              environmentalImplications: { type: Type.STRING },
              uncertaintyStatement: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    category: { type: Type.STRING },
                    suggestedQuery: { type: Type.STRING },
                  },
                  required: ['title', 'rationale', 'category', 'suggestedQuery'],
                },
              },
            },
            required: [
              'trendDetectiveSummary',
              'anomalyHunterSummary',
              'correlationSummary',
              'executiveSummary',
              'scientificModeExplanation',
              'simplifiedModeExplanation',
              'environmentalImplications',
              'uncertaintyStatement',
              'recommendations',
            ],
          },
        },
      });

      const aiData = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      return res.json({
        synthesis: {
          ...deterministicSummary,
          executiveSummary: sanitizeText(aiData.executiveSummary, 1400),
          trendDetective: {
            ...deterministicSummary.trendDetective,
            summary: sanitizeText(aiData.trendDetectiveSummary, 1000) || deterministicSummary.trendDetective.summary,
          },
          anomalyHunter: {
            ...deterministicSummary.anomalyHunter,
            summary: sanitizeText(aiData.anomalyHunterSummary, 1000) || deterministicSummary.anomalyHunter.summary,
          },
          correlationIntelligence: {
            ...deterministicSummary.correlationIntelligence,
            summary: sanitizeText(aiData.correlationSummary, 1000) || deterministicSummary.correlationIntelligence.summary,
          },
          earthExplainer: {
            scientificMode:
              sanitizeText(aiData.scientificModeExplanation, 1400) ||
              deterministicSummary.earthExplainer.scientificMode,
            simplifiedMode:
              sanitizeText(aiData.simplifiedModeExplanation, 1400) ||
              deterministicSummary.earthExplainer.simplifiedMode,
            uncertaintyStatement:
              sanitizeText(aiData.uncertaintyStatement, 900) ||
              deterministicSummary.earthExplainer.uncertaintyStatement,
            environmentalImplications:
              sanitizeText(aiData.environmentalImplications, 1000) ||
              deterministicSummary.earthExplainer.environmentalImplications,
          },
          recommendations:
            Array.isArray(aiData.recommendations) && aiData.recommendations.length > 0
              ? aiData.recommendations
              : deterministicSummary.recommendations,
        },
        usedGemini: true,
      });
    } catch {
      return res.json({ synthesis: deterministicSummary, usedGemini: false });
    }
  });

  // Context-Aware AI Scientific Assistant
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const question = sanitizeText(req.body.question, 600);
    const context = req.body.investigationContext as Record<string, unknown> | undefined;
    const mode = req.body.mode === 'simplified' ? 'simplified' : 'scientific';

    if (!question) {
      return res.status(400).json({ error: 'Please ask a question about the active investigation.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer: context
          ? `Based on the active NASA POWER investigation (${context.locationName}, ${context.period}), statistical outputs are visible in the Trend Intelligence, Anomaly Detection, and Correlation Lab views. Configure a Gemini API key in Secrets to enable interactive conversational synthesis.`
          : 'No active investigation is loaded yet. Run an investigation from New Investigation to ground assistant responses in NASA POWER measurements.',
        usedGemini: false,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Active Investigation Context:
${JSON.stringify(context ?? { status: 'No active investigation loaded yet.' }, null, 2)}

User Question: "${question}"
Preferred Tone: ${
          mode === 'simplified'
            ? 'Simplified Gen Z-friendly scientific clarity (accurate, crisp, accessible, no slang clutter)'
            : 'Formal research scientist tone'
        }

Rules:
- Ground every numerical answer strictly in the provided Active Investigation Context.
- If a metric or variable is not present in the context, state clearly that it has not been retrieved yet and suggest adding it.
- Never claim AI interpretations are official NASA conclusions, and never present correlation as causation.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are the ORBITERA AI Scientific Assistant. Be concise, evidence-based, transparent about uncertainty, and cite the exact dataset and time window.',
        },
      });

      return res.json({
        answer: response.text ?? 'Unable to generate an interpretation right now.',
        usedGemini: true,
      });
    } catch (err) {
      return res.status(502).json({
        error: 'The AI Scientific Assistant could not reach Gemini right now. Please retry.',
      });
    }
  });

  // Vite dev middleware or static prod serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ORBITERA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ORBITERA server:', err);
  process.exit(1);
});
