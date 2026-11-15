import type {
  AgentId,
  GeoLocationOption,
  InvestigationType,
  NasaVariableId,
  NasaVariableMeta,
} from '../types/orbitera';

export const NASA_VARIABLES: Record<NasaVariableId, NasaVariableMeta> = {
  T2M: {
    id: 'T2M',
    label: 'Air Temperature (2m)',
    shortLabel: 'Temp 2m',
    unit: '°C',
    category: 'Temperature',
    description: 'Average air temperature at 2 meters above the Earth surface.',
    nasaParameter: 'T2M (MERRA-2 Assimilation)',
    limitations: 'Gridded 0.5° × 0.625° spatial resolution smooths micro-urban heat islands.',
    color: '#155EEF',
  },
  T2M_MAX: {
    id: 'T2M_MAX',
    label: 'Maximum Temperature (2m)',
    shortLabel: 'Max Temp',
    unit: '°C',
    category: 'Temperature',
    description: 'Maximum daily/monthly air temperature at 2 meters above surface.',
    nasaParameter: 'T2M_MAX (MERRA-2)',
    limitations: 'Grid-cell maximum may underestimate localized point thermometer peaks.',
    color: '#DC2626',
  },
  T2M_MIN: {
    id: 'T2M_MIN',
    label: 'Minimum Temperature (2m)',
    shortLabel: 'Min Temp',
    unit: '°C',
    category: 'Temperature',
    description: 'Minimum daily/monthly air temperature at 2 meters above surface.',
    nasaParameter: 'T2M_MIN (MERRA-2)',
    limitations: 'Nighttime boundary-layer inversions can vary within a single grid cell.',
    color: '#06B6D4',
  },
  PRECTOTCORR: {
    id: 'PRECTOTCORR',
    label: 'Bias-Corrected Precipitation',
    shortLabel: 'Precipitation',
    unit: 'mm/day',
    category: 'Hydrology',
    description: 'Bias-corrected total surface precipitation rate (rain and snow water equivalent).',
    nasaParameter: 'PRECTOTCORR (MERRA-2 / GPM)',
    limitations: 'Convective localized storms may be averaged across the model grid.',
    color: '#0284C7',
  },
  RH2M: {
    id: 'RH2M',
    label: 'Relative Humidity (2m)',
    shortLabel: 'Humidity',
    unit: '%',
    category: 'Atmosphere',
    description: 'Ratio of actual water vapor pressure to saturation vapor pressure at 2 meters.',
    nasaParameter: 'RH2M (MERRA-2)',
    limitations: 'Derived from specific humidity and surface temperature fields.',
    color: '#0D9488',
  },
  ALLSKY_SFC_SW_DWN: {
    id: 'ALLSKY_SFC_SW_DWN',
    label: 'Surface Solar Irradiance',
    shortLabel: 'Solar SW',
    unit: 'kW-hr/m²/day',
    category: 'Radiation',
    description: 'Total solar irradiance incident on a horizontal surface under all sky conditions.',
    nasaParameter: 'ALLSKY_SFC_SW_DWN (CERES SYN1deg)',
    limitations: '1.0° × 1.0° CERES grid; aerosol plumes can cause local variability.',
    color: '#D97706',
  },
  WS2M: {
    id: 'WS2M',
    label: 'Wind Speed (2m)',
    shortLabel: 'Wind 2m',
    unit: 'm/s',
    category: 'Atmosphere',
    description: 'Horizontal wind speed interpolated to 2 meters above ground.',
    nasaParameter: 'WS2M (MERRA-2)',
    limitations: 'Surface roughness parameterization affects local topographic wind channeling.',
    color: '#4F46E5',
  },
};

export const NASA_VARIABLE_LIST: NasaVariableMeta[] = Object.values(NASA_VARIABLES);

export const INVESTIGATION_TYPES: InvestigationType[] = [
  'Long-Term Trend Investigation',
  'Environmental Anomaly Investigation',
  'Regional Comparison',
  'Multi-Variable Relationship Investigation',
  'Seasonal Pattern Investigation',
  'Environmental Change Investigation',
];

export const CURATED_LOCATIONS: GeoLocationOption[] = [
  {
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    climateZone: 'Tropical Savanna (Aw)',
  },
  {
    name: 'Chennai',
    region: 'Tamil Nadu',
    country: 'India',
    latitude: 13.0827,
    longitude: 80.2707,
    climateZone: 'Tropical Wet & Dry (As)',
  },
  {
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    climateZone: 'Tropical Monsoon (Am)',
  },
  {
    name: 'Delhi',
    region: 'National Capital Territory',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    climateZone: 'Humid Subtropical / Semi-Arid',
  },
  {
    name: 'Karnataka Plateau',
    region: 'Karnataka',
    country: 'India',
    latitude: 14.5204,
    longitude: 75.7224,
    climateZone: 'Deccan Semi-Arid / Tropical',
  },
  {
    name: 'Tamil Nadu Interior',
    region: 'Tamil Nadu',
    country: 'India',
    latitude: 11.1271,
    longitude: 78.6569,
    climateZone: 'Tropical Dry Sub-Humid',
  },
  {
    name: 'California Central Valley',
    region: 'California',
    country: 'United States',
    latitude: 36.7783,
    longitude: -119.4179,
    climateZone: 'Mediterranean / Semi-Arid',
  },
  {
    name: 'Amazon Basin (Manaus)',
    region: 'Amazonas',
    country: 'Brazil',
    latitude: -3.119,
    longitude: -60.0217,
    climateZone: 'Equatorial Rainforest (Af)',
  },
  {
    name: 'Svalbard (Ny-Ålesund)',
    region: 'Arctic Archipelago',
    country: 'Norway',
    latitude: 78.9235,
    longitude: 11.9222,
    climateZone: 'Polar Tundra (ET)',
  },
  {
    name: 'Sahel Transition (Niamey)',
    region: 'Niamey',
    country: 'Niger',
    latitude: 13.5116,
    longitude: 2.1254,
    climateZone: 'Hot Semi-Arid (BSh)',
  },
  {
    name: 'Cairo',
    region: 'Lower Egypt',
    country: 'Egypt',
    latitude: 30.0444,
    longitude: 31.2357,
    climateZone: 'Hot Desert (BWh)',
  },
  {
    name: 'Nairobi',
    region: 'Central Highlands',
    country: 'Kenya',
    latitude: -1.2921,
    longitude: 36.8219,
    climateZone: 'Subtropical Highland (Cfb)',
  },
  {
    name: 'Tokyo',
    region: 'Kanto',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    climateZone: 'Humid Subtropical (Cfa)',
  },
  {
    name: 'Zurich',
    region: 'Alpine Foreland',
    country: 'Switzerland',
    latitude: 47.3769,
    longitude: 8.5417,
    climateZone: 'Temperate Oceanic (Cfb)',
  },
  {
    name: 'Phoenix',
    region: 'Arizona',
    country: 'United States',
    latitude: 33.4484,
    longitude: -112.074,
    climateZone: 'Sonoran Desert (BWh)',
  },
];

export const EXAMPLE_QUERIES: { label: string; query: string }[] = [
  {
    label: 'Bengaluru Temp & Rainfall (2001–2025)',
    query: 'Investigate temperature and precipitation trends in Bengaluru from 2001 to 2025.',
  },
  {
    label: 'Mumbai Temperature Shift',
    query: 'Analyze long-term temperature changes in Mumbai from 1995 to 2024.',
  },
  {
    label: 'Karnataka Drought Indicators',
    query: 'Investigate drought-related precipitation and humidity trends in Karnataka from 2000 to 2024.',
  },
  {
    label: 'Bengaluru vs. Chennai Rainfall',
    query: 'Compare rainfall and temperature patterns in Bengaluru and Chennai from 2001 to 2024.',
  },
  {
    label: 'California Multi-Decade Change',
    query: 'Analyze long-term environmental changes in California Central Valley from 1990 to 2024.',
  },
  {
    label: 'Arctic Svalbard Warming Signal',
    query: 'Identify unusual temperature anomalies and solar trends in Svalbard from 1995 to 2024.',
  },
];

export const NASA_EXTERNAL_RESOURCES = [
  {
    name: 'NASA POWER API',
    role: 'Programmatic Live Telemetry',
    description:
      'Prediction Of Worldwide Energy Resources — provides MERRA-2 meteorological and CERES solar observations via REST JSON endpoints.',
    url: 'https://power.larc.nasa.gov/',
    integratedProgrammatically: true,
  },
  {
    name: 'NASA Worldview (GIBS)',
    role: 'Satellite Earth Imagery Context',
    description:
      'Global Imagery Browse Services providing daily Terra/Aqua MODIS true-color and thermal satellite tile layers.',
    url: 'https://worldview.earthdata.nasa.gov/',
    integratedProgrammatically: true,
  },
  {
    name: 'NASA Giovanni',
    role: 'Supplementary Atmospheric Exploration',
    description:
      'Web-based portal for remote-sensing gridded atmospheric and hydrological cross-checks (external reference portal).',
    url: 'https://giovanni.gsfc.nasa.gov/giovanni/',
    integratedProgrammatically: false,
  },
  {
    name: 'NASA Earthdata Search',
    role: 'Collection Discovery Catalog',
    description:
      'Unified catalog for EOSDIS satellite collections including MODIS vegetation indices, GPM IMERG, and SMAP soil moisture.',
    url: 'https://search.earthdata.nasa.gov/',
    integratedProgrammatically: false,
  },
];

export const AGENT_DEFINITIONS: {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
}[] = [
  {
    id: 'earth_scout',
    name: 'Earth Scout',
    role: 'NASA Data Discovery Agent',
    mission:
      'Identify the most relevant NASA datasets, parameter codes, geographic/temporal bounds, and dataset limitations.',
  },
  {
    id: 'trend_detective',
    name: 'Trend Detective',
    role: 'Statistical Trend Analysis Agent',
    mission:
      'Evaluate programmatic linear regression, Mann-Kendall significance, and Sen’s slope outputs to classify long-term shifts.',
  },
  {
    id: 'anomaly_hunter',
    name: 'Anomaly Hunter',
    role: 'Environmental Anomaly Detection Agent',
    mission:
      'Detect statistically significant deviations against seasonal baselines while separating normal seasonality from anomalies.',
  },
  {
    id: 'correlation_intelligence',
    name: 'Correlation Intelligence',
    role: 'Earth-System Relationship Agent',
    mission:
      'Assess Pearson and Spearman co-movements across environmental variables while guarding against false causal claims.',
  },
  {
    id: 'earth_explainer',
    name: 'Earth Explainer',
    role: 'Scientific Interpretation Agent',
    mission:
      'Translate verified statistical findings into both precise Scientific Mode and accessible Simplified Gen Z-Friendly explanations.',
  },
  {
    id: 'mission_reporter',
    name: 'Mission Reporter',
    role: 'Scientific Report Generation Agent',
    mission:
      'Consolidate datasets, methodology, statistics, limitations, and follow-up recommendations into a 16-section scientific brief.',
  },
];
