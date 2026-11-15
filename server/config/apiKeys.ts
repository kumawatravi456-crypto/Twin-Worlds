export interface ParameterSourceMapping {
  parameter: string;
  axisKey: 'geology' | 'topography' | 'temperature' | 'waterIce' | 'dust' | 'cavesTubes' | 'biology' | 'exploration';
  dataSource: string;
  apiKeyRequired: string;
  keyConfigured: boolean;
  envVar: string | null;
  endpoint: string;
  retrieves: string;
}

export function getServerApiConfig() {
  return {
    nasaApiKey: process.env.NASA_API_KEY?.trim() || 'DEMO_KEY',
    nasaEarthdataToken: process.env.NASA_EARTHDATA_TOKEN?.trim() || '',
    ncbiApiKey: process.env.NCBI_API_KEY?.trim() || '',
    openTopographyApiKey: process.env.OPENTOPOGRAPHY_API_KEY?.trim() || '',
    endpoints: {
      nasaPdsApi: 'https://pds.nasa.gov/api/search/1',
      nasaPdsOde: 'https://oderest.rsl.wustl.edu/live2',
      nasaTrekWmts: 'https://trek.nasa.gov/tiles',
      openMeteoArchive: 'https://archive-api.open-meteo.com/v1/archive',
      openMeteoForecast: 'https://api.open-meteo.com/v1/forecast',
      openMeteoElevation: 'https://api.open-meteo.com/v1/elevation',
      openMeteoAirQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
      nasaPower: 'https://power.larc.nasa.gov/api/temporal/climatology/point',
      nasaCmr: 'https://cmr.earthdata.nasa.gov/search',
      ncbiEutils: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      usgsWms: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv',
      jplHorizons: 'https://ssd.jpl.nasa.gov/api/horizons.api'
    }
  };
}

export function getParameterDataMatrix(): ParameterSourceMapping[] {
  const cfg = getServerApiConfig();
  return [
    {
      parameter: 'Geology',
      axisKey: 'geology',
      dataSource: 'NASA PDS API',
      apiKeyRequired: 'No',
      keyConfigured: true,
      envVar: null,
      endpoint: `${cfg.endpoints.nasaPdsApi}/classes/bundle`,
      retrieves: 'Moon/Mars geological data and mineral observations'
    },
    {
      parameter: 'Topography',
      axisKey: 'topography',
      dataSource: 'NASA Trek + USGS LOLA/MOLA & Copernicus GLO-90',
      apiKeyRequired: 'No',
      keyConfigured: true,
      envVar: null,
      endpoint: cfg.endpoints.nasaTrekWmts,
      retrieves: 'Elevation and terrain map layers'
    },
    {
      parameter: 'Temperature',
      axisKey: 'temperature',
      dataSource: 'Open-Meteo Historical Archive + Forecast',
      apiKeyRequired: 'No',
      keyConfigured: true,
      envVar: null,
      endpoint: cfg.endpoints.openMeteoArchive,
      retrieves: 'Historical Earth temperature (365-day archive + diurnal cycle)'
    },
    {
      parameter: 'Water/Ice',
      axisKey: 'waterIce',
      dataSource: 'NASA NSIDC (via Earthdata CMR)',
      apiKeyRequired: 'No paid key',
      keyConfigured: Boolean(cfg.nasaEarthdataToken) || true,
      envVar: 'NASA_EARTHDATA_TOKEN',
      endpoint: `${cfg.endpoints.nasaCmr}/collections.json`,
      retrieves: 'Snow, glaciers and permafrost data'
    },
    {
      parameter: 'Dust',
      axisKey: 'dust',
      dataSource: 'NASA MERRA-2 (POWER + CMR M2TMNXAER)',
      apiKeyRequired: 'No paid key',
      keyConfigured: Boolean(cfg.nasaEarthdataToken) || true,
      envVar: 'NASA_EARTHDATA_TOKEN',
      endpoint: cfg.endpoints.nasaPower,
      retrieves: 'Atmospheric dust and aerosol data (AOD_55 & MERRA-2 aerosols)'
    },
    {
      parameter: 'Caves',
      axisKey: 'cavesTubes',
      dataSource: 'NASA PDS Orbital Data Explorer (ODE)',
      apiKeyRequired: 'No',
      keyConfigured: true,
      envVar: null,
      endpoint: cfg.endpoints.nasaPdsOde,
      retrieves: 'Planetary imagery and surface observations'
    },
    {
      parameter: 'Biology',
      axisKey: 'biology',
      dataSource: 'NCBI E-utilities (PubMed)',
      apiKeyRequired: 'No for basic access',
      keyConfigured: Boolean(cfg.ncbiApiKey),
      envVar: 'NCBI_API_KEY',
      endpoint: cfg.endpoints.ncbiEutils,
      retrieves: 'Extremophile research and biological records'
    },
    {
      parameter: 'Exploration',
      axisKey: 'exploration',
      dataSource: 'NASA Trek WMTS & Terrain Layers',
      apiKeyRequired: 'No',
      keyConfigured: true,
      envVar: null,
      endpoint: cfg.endpoints.nasaTrekWmts,
      retrieves: 'Terrain and surface visualization'
    }
  ];
}
