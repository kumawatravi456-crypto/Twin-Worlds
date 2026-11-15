export type ProvenanceKind = 'live' | 'archived' | 'proxy' | 'unavailable';

export type TargetBody = 'moon' | 'mars';

export type SiteTier = 'well-known' | 'hidden-gem' | 'discovered-candidate';

export type UseCaseTag =
  | 'Rover Mobility'
  | 'Drilling & ISRU'
  | 'Habitat & Tubes'
  | 'Dust Mitigation'
  | 'Astrobiology';

export type FeatureAxisKey =
  | 'geology'
  | 'topography'
  | 'temperature'
  | 'waterIce'
  | 'dust'
  | 'cavesTubes'
  | 'biology'
  | 'exploration';

export type FeatureWeights = Record<FeatureAxisKey, number>;

export interface ProvenanceRecord {
  status: ProvenanceKind;
  datasetName: string;
  provider: string;
  sourceUrl?: string;
  acquisitionDate: string;
  spatialResolution: string;
  temporalCoverage: string;
  units: string;
  processingMethod: string;
  dataQuality: 'high' | 'moderate' | 'proxy-limited' | 'missing';
  missingDataPct: number;
}

export interface PlanetaryTarget {
  id: string;
  body: TargetBody;
  name: string;
  region: string;
  coordinates: string;
  lat: number;
  lon: number;
  elevationRelativeM: number;
  meanTempC: number;
  minTempC: number;
  maxTempC: number;
  diurnalSwingC: number;
  typicalSlopeDeg: number;
  roughnessIndex: number; // 0 (smooth plain) to 1 (extreme boulder/crater relief)
  gravityG: number;
  surfacePressurePa: number;
  dominantMinerals: string[];
  waterIceStatus: string;
  waterIceTargetScore: number; // 0-100 importance / ice abundance profile
  dustHazardLevel: number; // 0-100 severity
  dustDescription: string;
  lavaTubeRelevance: number; // 0-100 relevance for subsurface architecture
  radiationSvPerYear: number;
  keyHazard: string;
  keyResource: string;
  missionSummary: string;
  trekWmtsLayerUrl: string;
  trekSourceLabel: string;
  pdsCitations: string[];
}

export interface EarthAnalogSite {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tier: SiteTier;
  summary: string;
  discoveryRationale: string;
  primaryTargets: TargetBody[];
  useCases: UseCaseTag[];

  geology: {
    rockTypes: string[];
    minerals: string[];
    craterOrigin: boolean;
    weatheringState: string;
    description: string;
    provenance: ProvenanceKind;
    source: string;
  };

  topography: {
    elevationM: number;
    meanSlopeDeg: number;
    roughnessIndex: number; // 0-1
    craterDensityAnalog: number; // 0-100
    terrainNotes: string;
    provenance: ProvenanceKind;
    source: string;
  };

  temperature: {
    archivedAnnualMeanC: number;
    archivedMinC: number;
    archivedMaxC: number;
    archivedDiurnalSwingC: number;
    solarIrradianceNotes: string;
    provenance: ProvenanceKind;
    source: string;
  };

  waterIce: {
    aridityIndex: number; // lower = drier
    annualPrecipMm: number;
    subsurfaceIceScore: number; // 0-100 analog fit for ice/permafrost
    iceMechanism: string;
    provenance: ProvenanceKind;
    source: string;
  };

  dust: {
    regolithDustHazardScore: number; // 0-100
    particleComposition: string;
    proxyExplanation: string;
    provenance: ProvenanceKind;
    source: string;
  };

  cavesTubes: {
    tubePresenceScore: number; // 0-100
    systemName: string;
    documentedLengthM: number | null;
    structuralNotes: string;
    provenance: ProvenanceKind;
    source: string;
  };

  biology: {
    extremophileScore: number; // 0-100 astrobiological analog utility
    organisms: string[];
    metabolicStrategy: string;
    ncbiQuery: string;
    provenance: ProvenanceKind;
    source: string;
  };

  exploration: {
    roverMobilityScore: number; // 0-100
    landingFlatnessScore: number; // 0-100
    drillingIsruScore: number; // 0-100
    habitatConstructionScore: number; // 0-100
    engineeringNotes: string;
    provenance: ProvenanceKind;
    source: string;
  };

  limitations: string[];
  citations: Array<{ title: string; source: string; year: number; url?: string }>;
}

export interface NasaPowerClimatology {
  status: ProvenanceKind;
  skinTempC?: number;
  airMeanTempC?: number;
  airMinTempC?: number;
  airMaxTempC?: number;
  diurnalRangeC?: number;
  annualPrecipMm?: number;
  solarIrradianceKwhM2Day?: number;
  modisAod55?: number;
  acquisitionSpan: string;
  spatialResolution: string;
  sourceUrl: string;
  error?: string;
}

export interface DemGridPayload {
  status: ProvenanceKind;
  datasetName: string;
  provider: string;
  resolutionM: number;
  bbox: { south: number; north: number; west: number; east: number };
  gridSize: number;
  heightsM: number[][];
  minM: number;
  maxM: number;
  reliefM: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  roughnessIndex: number; // 0-1 normalized TRI
  acquisitionDate: string;
  processingMethod: string;
  sourceUrl: string;
  fallbackNote?: string;
  error?: string;
}

export interface LiveSiteTelemetry {
  siteId: string;
  fetchedAt: string;
  cached: boolean;
  openMeteoWeather: {
    status: ProvenanceKind;
    elevationM?: number;
    currentTempC?: number;
    apparentTempC?: number;
    windSpeedMs?: number;
    relativeHumidityPct?: number;
    shortwaveRadiationSumMjM2?: number;
    observed7DaySwingC?: number;
    dailyDates?: string[];
    dailyMinC?: number[];
    dailyMaxC?: number[];
    sourceUrl: string;
    error?: string;
  };
  openMeteoAirQuality: {
    status: ProvenanceKind;
    dustUgM3?: number;
    pm10UgM3?: number;
    pm25UgM3?: number;
    observedAt?: string;
    proxyNote: string;
    sourceUrl: string;
    error?: string;
  };
  nasaPower?: NasaPowerClimatology;
  openMeteoHistorical?: {
    status: ProvenanceKind;
    startDate: string;
    endDate: string;
    annualMeanTempC?: number;
    historicalMinTempC?: number;
    historicalMaxTempC?: number;
    meanDiurnalRangeC?: number;
    annualPrecipMm?: number;
    daysSampled: number;
    sourceUrl: string;
    error?: string;
  };
  nasaNsidc?: {
    status: ProvenanceKind;
    collectionsMatched: number;
    datasets: Array<{ id: string; shortName: string; title: string; url: string }>;
    sourceUrl: string;
    tokenConfigured: boolean;
    error?: string;
  };
  nasaMerra2?: {
    status: ProvenanceKind;
    collectionShortName: string;
    collectionTitle: string;
    modisAod55?: number;
    spatialResolution: string;
    sourceUrl: string;
    tokenConfigured: boolean;
    error?: string;
  };
  copernicusDem?: {
    status: ProvenanceKind;
    datasetName: string;
    resolutionM: number;
    meanSlopeDeg?: number;
    maxSlopeDeg?: number;
    roughnessIndex?: number;
    reliefM?: number;
    minM?: number;
    maxM?: number;
    sourceUrl: string;
    error?: string;
  };
  nasaCmr: {
    status: ProvenanceKind;
    totalHits: number;
    collections: Array<{
      id: string;
      shortName: string;
      title: string;
      timeStart?: string;
      timeEnd?: string;
      archiveCenter?: string;
      url: string;
    }>;
    sourceUrl: string;
    error?: string;
  };
  ncbiPubmed: {
    status: ProvenanceKind;
    totalCount: number;
    query: string;
    articles: Array<{
      pmid: string;
      title: string;
      journal: string;
      pubdate: string;
      authors: string;
      url: string;
    }>;
    sourceUrl: string;
    error?: string;
  };
  openTopography: {
    status: ProvenanceKind;
    demDataset: string;
    meanSlopeDeg?: number;
    ruggednessM?: number;
    reason?: string;
    fallbackNote: string;
    sourceUrl: string;
  };
}

export interface PlanetaryPdsDossier {
  targetId: string;
  body: 'moon' | 'mars';
  fetchedAtUtc: string;
  pdsGeologyApi: {
    status: ProvenanceKind;
    totalBundlesAvailable: number;
    matchedBundles: Array<{
      lid: string;
      title: string;
      description: string;
      targetBody: 'moon' | 'mars' | 'planetary';
      url: string;
    }>;
    sourceUrl: string;
    error?: string;
  };
  pdsOdeOrbital: {
    status: ProvenanceKind;
    observationCount: number;
    instrumentSummary: string;
    observations: Array<{
      pdsId: string;
      instrumentHost: string;
      instrument: string;
      productType: string;
      centerLat: number | null;
      centerLon: number | null;
      utcTime: string | null;
      browseUrl: string | null;
      viewerUrl: string | null;
      comment: string | null;
    }>;
    sourceUrl: string;
    error?: string;
  };
  nasaTrek: {
    status: ProvenanceKind;
    wmtsLayerUrl: string;
    capabilitiesUrl: string;
    sourceLabel: string;
  };
}

export interface ParameterSourceMapping {
  parameter: string;
  axisKey: FeatureAxisKey;
  dataSource: string;
  apiKeyRequired: string;
  keyConfigured: boolean;
  envVar: string | null;
  endpoint: string;
  retrieves: string;
}

export interface AxisScoreDetail {
  axis: FeatureAxisKey;
  label: string;
  available: boolean;
  rawScore: number | null; // null when unavailable
  weight: number;
  normalizedWeight: number;
  weightedContribution: number;
  confidencePct: number;
  earthMeasurement: string;
  targetMeasurement: string;
  unit: string;
  formulaNote: string;
  provenance: ProvenanceKind;
  provenanceDetail: ProvenanceRecord;
  similarities: string[];
  differences: string[];
}

export interface SiteSimilarityResult {
  siteId: string;
  targetId: string;
  compositeScore: number; // 0-100 over available axes
  confidencePct: number; // 0-100 independent scientific data confidence
  availableWeightPct: number; // % of total user weights backed by usable measurements
  unavailableAxes: FeatureAxisKey[];
  methodologyNote: string;
  axes: Record<FeatureAxisKey, AxisScoreDetail>;
  liveAdjusted: boolean;
}

export interface DiscoveryCandidate {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  isCurated: boolean;
  geologyClass: string;
  primaryLithology: string;
  siteModel: EarthAnalogSite;
  similarity: SiteSimilarityResult;
  liveObservations: {
    elevationM: number | null;
    currentTempC: number | null;
    skinTempC: number | null;
    annualPrecipMm: number | null;
    modisAod55: number | null;
    dustUgM3: number | null;
    demSlopeDeg: number | null;
    demRoughness: number | null;
  };
}

export interface DiscoveryScanResponse {
  scannedAtUtc: string;
  targetId: string;
  totalCellsEvaluated: number;
  returnedCount: number;
  datasetsUsed: string[];
  candidates: DiscoveryCandidate[];
}

export interface AdapterHealthReport {
  checkedAt: string;
  adapters: Array<{
    id: string;
    name: string;
    provider: string;
    status: ProvenanceKind;
    requiresKey: boolean;
    keyConfigured: boolean;
    endpoint: string;
    notes: string;
  }>;
}
