import { getServerApiConfig } from '../config/apiKeys.ts';
import { TtlCache, fetchJsonWithTimeout } from './http.ts';
import { PLANETARY_TARGETS } from '../../src/data/planetaryTargets.ts';

export interface PdsGeologyBundle {
  lid: string;
  title: string;
  description: string;
  targetBody: 'moon' | 'mars' | 'planetary';
  url: string;
}

export interface PdsOdeObservation {
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
}

export interface PlanetaryPdsDossier {
  targetId: string;
  body: 'moon' | 'mars';
  fetchedAtUtc: string;
  pdsGeologyApi: {
    status: 'live' | 'unavailable';
    totalBundlesAvailable: number;
    matchedBundles: PdsGeologyBundle[];
    sourceUrl: string;
    error?: string;
  };
  pdsOdeOrbital: {
    status: 'live' | 'unavailable';
    observationCount: number;
    instrumentSummary: string;
    observations: PdsOdeObservation[];
    sourceUrl: string;
    error?: string;
  };
  nasaTrek: {
    status: 'live' | 'unavailable';
    wmtsLayerUrl: string;
    capabilitiesUrl: string;
    sourceLabel: string;
  };
}

const pdsDossierCache = new TtlCache<PlanetaryPdsDossier>(30 * 60 * 1000);
const pdsBundleIndexCache = new TtlCache<{ hits: number; bundles: PdsGeologyBundle[] }>(60 * 60 * 1000);

async function fetchPdsGeologyBundles(body: 'moon' | 'mars'): Promise<{
  status: 'live' | 'unavailable';
  totalBundlesAvailable: number;
  matchedBundles: PdsGeologyBundle[];
  sourceUrl: string;
  error?: string;
}> {
  const { endpoints } = getServerApiConfig();
  const listUrl = `${endpoints.nasaPdsApi}/classes/bundle?limit=60`;

  try {
    let cachedIndex = pdsBundleIndexCache.get('all');
    if (!cachedIndex) {
      const json = await fetchJsonWithTimeout<{
        summary?: { hits?: number };
        data?: Array<Record<string, unknown>>;
      }>(listUrl, 8000);

      const rows = Array.isArray(json?.data) ? json.data : [];
      const bundles: PdsGeologyBundle[] = rows.map((row) => {
        const props = (row.properties ?? {}) as Record<string, unknown>;
        const lid = String(row.id ?? props.lid ?? '');
        const rawTitle = Array.isArray(props['pds:Identification_Area.pds:title'])
          ? props['pds:Identification_Area.pds:title'][0]
          : props.title ?? lid;
        const rawDesc = Array.isArray(props.description)
          ? props.description[0]
          : props.description ?? '';
        const text = `${lid} ${String(rawTitle)} ${String(rawDesc)}`.toLowerCase();
        const targetBody: 'moon' | 'mars' | 'planetary' =
          text.includes('lunar') || text.includes('moon') || text.includes('lro') || text.includes('apollo') || text.includes('chandrayaan')
            ? 'moon'
            : text.includes('mars') || text.includes('mro') || text.includes('msl') || text.includes('crism') || text.includes('perseverance') || text.includes('insight')
              ? 'mars'
              : 'planetary';

        return {
          lid,
          title: String(rawTitle || lid).slice(0, 140),
          description: String(rawDesc || 'NASA Planetary Data System peer-reviewed bundle.').slice(0, 220),
          targetBody,
          url: `https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=${encodeURIComponent(lid)}`
        };
      });

      cachedIndex = {
        hits: Number(json?.summary?.hits ?? bundles.length),
        bundles
      };
      pdsBundleIndexCache.set('all', cachedIndex);
    }

    const bodyMatches = cachedIndex.bundles.filter((b) => b.targetBody === body);
    const matchedBundles = (bodyMatches.length > 0 ? bodyMatches : cachedIndex.bundles).slice(0, 6);

    return {
      status: 'live',
      totalBundlesAvailable: cachedIndex.hits,
      matchedBundles,
      sourceUrl: listUrl
    };
  } catch (err) {
    return {
      status: 'unavailable',
      totalBundlesAvailable: 0,
      matchedBundles: [],
      sourceUrl: listUrl,
      error: err instanceof Error ? err.message : 'NASA PDS API request failed'
    };
  }
}

async function fetchPdsOdeProducts(
  body: 'moon' | 'mars',
  lat: number,
  lon: number
): Promise<{
  status: 'live' | 'unavailable';
  observationCount: number;
  instrumentSummary: string;
  observations: PdsOdeObservation[];
  sourceUrl: string;
  error?: string;
}> {
  const { endpoints } = getServerApiConfig();
  const isMoon = body === 'moon';
  // Use verified IHID/IID/PT pairs in PDS ODE (BDRNPL = LROC Narrow Angle Camera Polar PSR mosaics)
  const isPolar = Math.abs(lat) >= 85;
  const ihid = isMoon ? 'LRO' : 'MRO';
  const iid = isMoon ? 'LROC' : 'CTX';
  const pt = isMoon ? (isPolar ? 'BDRNPL' : 'EDRNAC4') : 'EDR';

  const minLat = Math.max(-90, lat - (isPolar ? 1.5 : 0.7)).toFixed(2);
  const maxLat = Math.min(90, lat + (isPolar ? 1.5 : 0.7)).toFixed(2);
  const westLon = isPolar ? '0' : (((lon - 0.8) % 360) + 360) % 360;
  const eastLon = isPolar ? '360' : (((lon + 0.8) % 360) + 360) % 360;

  const wStr = typeof westLon === 'number' ? westLon.toFixed(2) : westLon;
  const eStr = typeof eastLon === 'number' ? eastLon.toFixed(2) : eastLon;
  const odeUrl = `${endpoints.nasaPdsOde}/?query=product&results=cm&output=json&target=${body}&ihid=${ihid}&iid=${iid}&pt=${pt}&minlat=${minLat}&maxlat=${maxLat}&westernlon=${wStr}&easternlon=${eStr}&limit=4`;

  try {
    const json = await fetchJsonWithTimeout<{
      ODEResults?: {
        Error?: string;
        Count?: string | number;
        Products?: { Product?: Array<Record<string, unknown>> | Record<string, unknown> };
      };
    }>(odeUrl, 14000);

    if (json?.ODEResults?.Error) {
      throw new Error(json.ODEResults.Error);
    }

    const rawProducts = json?.ODEResults?.Products?.Product;
    const productArr = Array.isArray(rawProducts)
      ? rawProducts
      : rawProducts
        ? [rawProducts]
        : [];

    const observations: PdsOdeObservation[] = productArr.slice(0, 6).map((p) => ({
      pdsId: String(p.pdsid ?? p.Pdsid ?? 'Unknown Product'),
      instrumentHost: String(p.ihid ?? ihid),
      instrument: String(p.iid ?? iid),
      productType: String(p.pt ?? pt),
      centerLat: Number.isFinite(Number(p.Center_latitude)) ? Number(p.Center_latitude) : null,
      centerLon: Number.isFinite(Number(p.Center_longitude)) ? Number(p.Center_longitude) : null,
      utcTime: p.UTC_start_time ? String(p.UTC_start_time) : null,
      browseUrl: p.Browse_url ? String(p.Browse_url) : null,
      viewerUrl: p.External_url ? String(p.External_url) : p.ODE_url ? String(p.ODE_url) : null,
      comment: p.Comment ? String(p.Comment) : null
    }));

    return {
      status: 'live',
      observationCount: Number(json?.ODEResults?.Count ?? observations.length),
      instrumentSummary: `${ihid} / ${iid} (${pt}) orbital surface frames`,
      observations,
      sourceUrl: odeUrl
    };
  } catch (err) {
    return {
      status: 'unavailable',
      observationCount: 0,
      instrumentSummary: `${ihid} / ${iid} (${pt})`,
      observations: [],
      sourceUrl: odeUrl,
      error: err instanceof Error ? err.message : 'PDS ODE request failed'
    };
  }
}

export async function fetchPlanetaryPdsDossierForCoords(input: {
  targetId: string;
  body: 'moon' | 'mars';
  lat: number;
  lon: number;
  trekWmtsLayerUrl?: string;
  trekSourceLabel?: string;
}): Promise<PlanetaryPdsDossier> {
  const cacheKey = `${input.targetId}:${input.lat.toFixed(2)},${input.lon.toFixed(2)}`;
  const cached = pdsDossierCache.get(cacheKey);
  if (cached) return cached;

  const isMoon = input.body === 'moon';
  const trekCapabilitiesUrl = isMoon
    ? 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml'
    : 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml';

  const defaultWmtsUrl = isMoon
    ? 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg'
    : 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg';

  const [geoRes, odeRes, trekRes] = await Promise.allSettled([
    fetchPdsGeologyBundles(input.body),
    fetchPdsOdeProducts(input.body, input.lat, input.lon),
    fetch(trekCapabilitiesUrl, { method: 'HEAD', signal: AbortSignal.timeout(4500) })
  ]);

  const dossier: PlanetaryPdsDossier = {
    targetId: input.targetId,
    body: input.body,
    fetchedAtUtc: new Date().toISOString(),
    pdsGeologyApi:
      geoRes.status === 'fulfilled'
        ? geoRes.value
        : {
            status: 'unavailable',
            totalBundlesAvailable: 0,
            matchedBundles: [],
            sourceUrl: 'https://pds.nasa.gov/api/search/1/classes/bundle',
            error: 'NASA PDS API query failed'
          },
    pdsOdeOrbital:
      odeRes.status === 'fulfilled'
        ? odeRes.value
        : {
            status: 'unavailable',
            observationCount: 0,
            instrumentSummary: isMoon ? 'LRO/LROC' : 'MRO/CTX',
            observations: [],
            sourceUrl: 'https://oderest.rsl.wustl.edu/live2/',
            error: 'PDS ODE query failed'
          },
    nasaTrek: {
      status: trekRes.status === 'fulfilled' && trekRes.value.ok ? 'live' : 'unavailable',
      wmtsLayerUrl: input.trekWmtsLayerUrl ?? defaultWmtsUrl,
      capabilitiesUrl: trekCapabilitiesUrl,
      sourceLabel:
        input.trekSourceLabel ??
        (isMoon ? 'NASA Moon Trek / LRO WAC Mosaic 303ppd' : 'NASA Mars Trek / Viking MDIM2.1')
    }
  };

  pdsDossierCache.set(cacheKey, dossier);
  return dossier;
}

export async function fetchPlanetaryPdsDossier(targetId: string): Promise<PlanetaryPdsDossier> {
  const target = PLANETARY_TARGETS.find((t) => t.id === targetId);
  if (!target) {
    throw new Error(`Unknown planetary targetId: ${targetId}`);
  }

  return fetchPlanetaryPdsDossierForCoords({
    targetId: target.id,
    body: target.body,
    lat: target.lat,
    lon: target.lon,
    trekWmtsLayerUrl: target.trekWmtsLayerUrl,
    trekSourceLabel: target.trekSourceLabel
  });
}
