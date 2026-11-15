import type {
  ComputedStatisticsBundle,
  GeoLocationOption,
  InvestigationConfig,
  LiveEarthEvent,
  LiveStationReading,
  LiveTelemetrySnapshot,
  NasaDatasetResponse,
  NasaVariableId,
  TemporalResolution,
} from '../types/orbitera';

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<GeoLocationOption[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  const data = await handleJsonResponse<{ results: GeoLocationOption[] }>(res);
  return data.results ?? [];
}

export async function fetchNasaPowerData(
  params: {
    latitude: number;
    longitude: number;
    startYear: number;
    endYear: number;
    resolution: TemporalResolution;
    variables: NasaVariableId[];
  },
  signal?: AbortSignal
): Promise<NasaDatasetResponse> {
  const res = await fetch('/api/nasa/power', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });
  return handleJsonResponse<NasaDatasetResponse>(res);
}

export async function fetchLiveTelemetry(
  params: { latitude: number; longitude: number; locationName: string; force?: boolean },
  signal?: AbortSignal
): Promise<LiveTelemetrySnapshot> {
  const qs = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
    label: params.locationName,
    ...(params.force ? { force: '1' } : {}),
  });
  const res = await fetch(`/api/live/telemetry?${qs.toString()}`, { signal });
  return handleJsonResponse<LiveTelemetrySnapshot>(res);
}

export async function fetchLiveEvents(
  force = false,
  signal?: AbortSignal
): Promise<{ events: LiveEarthEvent[]; fetchedAt: string; sourceName: string }> {
  const res = await fetch(`/api/live/events${force ? '?force=1' : ''}`, { signal });
  return handleJsonResponse<{ events: LiveEarthEvent[]; fetchedAt: string; sourceName: string }>(res);
}

export async function fetchLivePulse(
  force = false,
  signal?: AbortSignal
): Promise<{ stations: LiveStationReading[]; fetchedAt: string }> {
  const res = await fetch(`/api/live/pulse${force ? '?force=1' : ''}`, { signal });
  return handleJsonResponse<{ stations: LiveStationReading[]; fetchedAt: string }>(res);
}

export async function parseInvestigationQuery(
  query: string,
  signal?: AbortSignal
): Promise<{ config: Partial<InvestigationConfig>; parsedByGemini: boolean }> {
  const res = await fetch('/api/agents/parse-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  });
  return handleJsonResponse<{ config: Partial<InvestigationConfig>; parsedByGemini: boolean }>(res);
}

export async function runEarthScoutAgent(
  config: InvestigationConfig,
  signal?: AbortSignal
): Promise<{ output: Record<string, unknown>; usedGemini: boolean }> {
  const res = await fetch('/api/agents/earth-scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
    signal,
  });
  return handleJsonResponse<{ output: Record<string, unknown>; usedGemini: boolean }>(res);
}

export interface AgentSynthesisResponse {
  synthesis: {
    executiveSummary?: string;
    trendDetective: { summary: string; keyFindings?: string[] };
    anomalyHunter: { summary: string; highlightAnomalies?: string[] };
    correlationIntelligence: { summary: string; causationCaution?: string };
    earthExplainer: {
      scientificMode: string;
      simplifiedMode: string;
      uncertaintyStatement: string;
      environmentalImplications: string;
    };
    recommendations: {
      title: string;
      rationale: string;
      category: string;
      suggestedQuery: string;
    }[];
  };
  usedGemini: boolean;
}

export async function runAnalyticalAgents(
  payload: {
    config: InvestigationConfig;
    dataset: NasaDatasetResponse;
    statistics: ComputedStatisticsBundle;
  },
  signal?: AbortSignal
): Promise<AgentSynthesisResponse> {
  const res = await fetch('/api/agents/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return handleJsonResponse<AgentSynthesisResponse>(res);
}

export async function askScientificAssistant(
  payload: {
    question: string;
    investigationContext?: Record<string, unknown>;
    mode: 'scientific' | 'simplified';
  },
  signal?: AbortSignal
): Promise<{ answer: string; usedGemini: boolean }> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return handleJsonResponse<{ answer: string; usedGemini: boolean }>(res);
}

