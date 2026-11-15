export type NavTabId =
  | 'landing'
  | 'overview'
  | 'new-investigation'
  | 'data-explorer'
  | 'trend-intelligence'
  | 'anomaly-detection'
  | 'correlation-lab'
  | 'regional-comparison'
  | 'earth-map'
  | 'world-geography'
  | 'agent-center'
  | 'reports'
  | 'saved-investigations'
  | 'settings';

export type NasaVariableId =
  | 'T2M'
  | 'T2M_MAX'
  | 'T2M_MIN'
  | 'PRECTOTCORR'
  | 'RH2M'
  | 'ALLSKY_SFC_SW_DWN'
  | 'WS2M';

export interface NasaVariableMeta {
  id: NasaVariableId;
  label: string;
  shortLabel: string;
  unit: string;
  category: 'Temperature' | 'Hydrology' | 'Atmosphere' | 'Radiation';
  description: string;
  nasaParameter: string;
  limitations: string;
  color: string;
}

export type InvestigationType =
  | 'Long-Term Trend Investigation'
  | 'Environmental Anomaly Investigation'
  | 'Regional Comparison'
  | 'Multi-Variable Relationship Investigation'
  | 'Seasonal Pattern Investigation'
  | 'Environmental Change Investigation';

export type TemporalResolution = 'monthly' | 'annual' | 'daily';

export type ExplanationMode = 'scientific' | 'simplified';

export interface GeoLocationOption {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  climateZone?: string;
}

export interface InvestigationConfig {
  id: string;
  title: string;
  query: string;
  locationName: string;
  regionLabel: string;
  latitude: number;
  longitude: number;
  variables: NasaVariableId[];
  startYear: number;
  endYear: number;
  resolution: TemporalResolution;
  investigationType: InvestigationType;
  compareLocation?: GeoLocationOption | null;
}

export interface ObservationPoint {
  dateKey: string; // e.g., "2020-01", "2020", "2020-01-15"
  year: number;
  month: number | null; // 1..12 or null for annual
  decimalYear: number;
  values: Partial<Record<NasaVariableId, number | null>>;
}

export interface DataQualitySummary {
  totalExpectedPoints: number;
  validPointsByVariable: Partial<Record<NasaVariableId, number>>;
  missingPointsByVariable: Partial<Record<NasaVariableId, number>>;
  completenessPercentByVariable: Partial<Record<NasaVariableId, number>>;
  missingSentinelCount: number;
}

export interface NasaDatasetResponse {
  sourceName: string;
  sourceEndpoint: string;
  datasetVersion: string;
  isSimulated: boolean;
  retrievedAt: string;
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  resolution: TemporalResolution;
  startYear: number;
  endYear: number;
  variables: NasaVariableId[];
  observations: ObservationPoint[];
  quality: DataQualitySummary;
  spatialResolutionNote: string;
  limitations: string[];
}

export type TrendCategory =
  | 'Increasing'
  | 'Decreasing'
  | 'Stable'
  | 'Uncertain'
  | 'Insufficient Data';

export interface TrendAnalysisResult {
  variable: NasaVariableId;
  unit: string;
  sampleCount: number;
  missingCount: number;
  startPeriod: string;
  endPeriod: string;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  olsSlopePerYear: number;
  olsSlopePerDecade: number;
  olsIntercept: number;
  slopeConfidenceInterval95: [number, number];
  rSquared: number;
  olsPValue: number;
  sensSlopePerDecade: number;
  mannKendallS: number;
  mannKendallZ: number;
  mannKendallPValue: number;
  totalEstimatedChange: number;
  percentChangeFromBaseline: number | null;
  category: TrendCategory;
  isStatisticallySignificant: boolean;
  regressionSeries: { dateKey: string; observed: number; trendLine: number }[];
  methodologyNote: string;
}

export type AnomalySeverity = 'Moderate Deviation' | 'Notable Deviation';

export interface AnomalyRecord {
  id: string;
  variable: NasaVariableId;
  unit: string;
  dateKey: string;
  year: number;
  month: number | null;
  observed: number;
  baselineMean: number;
  baselineStdDev: number;
  deviation: number;
  zScore: number;
  direction: 'Above Baseline' | 'Below Baseline';
  severity: AnomalySeverity;
  detectionMethod: string;
}

export interface CorrelationPairResult {
  varA: NasaVariableId;
  varB: NasaVariableId;
  sampleCount: number;
  pearsonR: number | null;
  pearsonPValue: number | null;
  spearmanRho: number | null;
  spearmanPValue: number | null;
  strengthLabel: 'Strong' | 'Moderate' | 'Weak' | 'Negligible' | 'Insufficient Data';
  directionLabel: 'Positive' | 'Negative' | 'None';
  warnings: string[];
  scatterPoints: { dateKey: string; x: number; y: number }[];
}

export interface EarthSignalScoreResult {
  overallScore: number; // 0..100 documented composite index
  label: 'Strong Signal' | 'Moderate Signal' | 'Emerging Signal' | 'Weak / Unclear Signal' | 'Insufficient Data';
  factors: {
    significanceScore: number; // max 40
    varianceScore: number; // max 25
    completenessScore: number; // max 20
    anomalyFactorScore: number; // max 15
  };
  formulaSummary: string;
  limitations: string;
}

export interface TrendConvergenceResult {
  hasConvergence: boolean;
  convergingVariables: NasaVariableId[];
  overlappingPeriod: string;
  summary: string;
  statisticalBasis: string;
  limitationNote: string;
}

export interface ComputedStatisticsBundle {
  trends: Partial<Record<NasaVariableId, TrendAnalysisResult>>;
  anomalies: AnomalyRecord[];
  correlations: CorrelationPairResult[];
  earthSignalScore: EarthSignalScoreResult;
  convergence: TrendConvergenceResult;
  computedAt: string;
}

export type AgentId =
  | 'earth_scout'
  | 'trend_detective'
  | 'anomaly_hunter'
  | 'correlation_intelligence'
  | 'earth_explainer'
  | 'mission_reporter';

export type AgentExecutionState =
  | 'Idle'
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Skipped';

export interface AgentRecord {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
  status: AgentExecutionState;
  progress: number;
  currentTask: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  inputsSummary?: string;
  outputSummary?: string;
  structuredOutput?: Record<string, unknown>;
  errorMessage?: string;
}

export interface NextInvestigationRecommendation {
  title: string;
  rationale: string;
  category: 'Variable Expansion' | 'Regional Comparison' | 'Seasonal Deep-Dive' | 'Time Horizon' | 'Anomaly Focus';
  suggestedQuery: string;
}

export interface ScientificReport {
  investigationTitle: string;
  executiveSummary: string;
  geographicRegion: string;
  coordinates: string;
  investigationPeriod: string;
  environmentalVariables: string[];
  nasaDataSources: string[];
  methodology: string;
  trendFindings: string;
  anomalyFindings: string;
  correlationFindings: string;
  scientificInterpretation: string;
  simplifiedInterpretation: string;
  environmentalImplications: string;
  limitations: string[];
  recommendedFollowUp: NextInvestigationRecommendation[];
  references: string[];
  generatedAt: string;
}

export interface InvestigationRecord {
  id: string;
  createdAt: string;
  config: InvestigationConfig;
  dataset: NasaDatasetResponse;
  statistics: ComputedStatisticsBundle;
  agents: AgentRecord[];
  report: ScientificReport;
  aiGroundedByGemini: boolean;
}

export interface UserSettings {
  defaultExplanationMode: ExplanationMode;
  defaultResolution: TemporalResolution;
  defaultStartYear: number;
  defaultEndYear: number;
  temperatureUnit: 'C' | 'F';
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  liveAutoUpdate: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

export type LiveStreamStatus = 'connecting' | 'live' | 'paused' | 'error';

export interface LiveHourlyPoint {
  time: string;
  label: string;
  temperatureC: number | null;
  precipitationMm: number | null;
  humidityPercent: number | null;
  solarWm2: number | null;
}

export interface LiveTelemetrySnapshot {
  latitude: number;
  longitude: number;
  locationName: string;
  elevationMeters: number | null;
  observedAt: string;
  fetchedAt: string;
  sourceName: string;
  intervalSeconds: number;
  current: {
    temperatureC: number | null;
    apparentTempC: number | null;
    humidityPercent: number | null;
    precipitationMm: number | null;
    windSpeedKmh: number | null;
    windDirectionDeg: number | null;
    surfacePressureHpa: number | null;
    cloudCoverPercent: number | null;
    solarIrradianceWm2: number | null;
  };
  airQuality: {
    observedAt: string | null;
    usAqi: number | null;
    pm25: number | null;
    pm10: number | null;
    ozone: number | null;
    no2: number | null;
    sourceName: string;
  } | null;
  hourly24h: LiveHourlyPoint[];
}

export interface LiveEarthEvent {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  date: string;
  latitude: number;
  longitude: number;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  sourceUrl: string | null;
  eonetLink: string;
}

export interface LiveStationReading {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number | null;
  observedAt: string;
}

