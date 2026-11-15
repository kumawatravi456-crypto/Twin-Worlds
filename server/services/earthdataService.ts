import { getServerApiConfig } from '../config/apiKeys.ts';
import { TtlCache, fetchJsonWithTimeout } from './http.ts';

export interface NasaNsidcCryosphereData {
  status: 'live' | 'unavailable';
  collectionsMatched: number;
  datasets: Array<{
    id: string;
    shortName: string;
    title: string;
    url: string;
  }>;
  sourceUrl: string;
  tokenConfigured: boolean;
  error?: string;
}

export interface NasaMerra2DustData {
  status: 'live' | 'unavailable';
  collectionShortName: string;
  collectionTitle: string;
  modisAod55?: number;
  spatialResolution: string;
  sourceUrl: string;
  tokenConfigured: boolean;
  error?: string;
}

const nsidcCache = new TtlCache<NasaNsidcCryosphereData>(60 * 60 * 1000);
const merra2MetaCache = new TtlCache<{ shortName: string; title: string }>(24 * 60 * 60 * 1000);

export async function fetchNasaNsidcData(lat: number, lon: number): Promise<NasaNsidcCryosphereData> {
  const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const cached = nsidcCache.get(key);
  if (cached) return cached;

  const { endpoints, nasaEarthdataToken } = getServerApiConfig();
  const bbox = `${(lon - 1.0).toFixed(2)},${Math.max(-89, lat - 1.0).toFixed(2)},${(lon + 1.0).toFixed(2)},${Math.min(89, lat + 1.0).toFixed(2)}`;
  const url = `${endpoints.nasaCmr}/collections.json?keyword=NSIDC%20snow%20permafrost%20ice&bounding_box=${encodeURIComponent(
    bbox
  )}&page_size=4`;

  const headers = nasaEarthdataToken ? { Authorization: `Bearer ${nasaEarthdataToken}` } : undefined;

  try {
    const json = await fetchJsonWithTimeout<{
      feed?: { entry?: Array<Record<string, unknown>> };
    }>(url, 7000, headers);
    const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];

    // If tight bbox yields 0 NSIDC cryosphere collections (e.g. hyper-arid equatorial desert), query global NSIDC snow/permafrost catalog reference
    let effectiveEntries = entries;
    let effectiveUrl = url;
    if (effectiveEntries.length === 0) {
      const globalUrl = `${endpoints.nasaCmr}/collections.json?keyword=NSIDC%20permafrost%20glacier&page_size=3`;
      const globalJson = await fetchJsonWithTimeout<{
        feed?: { entry?: Array<Record<string, unknown>> };
      }>(globalUrl, 7000, headers);
      effectiveEntries = Array.isArray(globalJson?.feed?.entry) ? globalJson.feed.entry : [];
      effectiveUrl = globalUrl;
    }

    const datasets = effectiveEntries.slice(0, 4).map((e) => ({
      id: String(e.id ?? ''),
      shortName: String(e.short_name ?? e.dataset_id ?? 'NSIDC Collection'),
      title: String(e.title ?? e.dataset_id ?? 'NSIDC Cryosphere Dataset'),
      url: `https://search.earthdata.nasa.gov/search/granules?p=${encodeURIComponent(String(e.id ?? ''))}`
    }));

    const out: NasaNsidcCryosphereData = {
      status: 'live',
      collectionsMatched: datasets.length,
      datasets,
      sourceUrl: effectiveUrl,
      tokenConfigured: Boolean(nasaEarthdataToken)
    };
    nsidcCache.set(key, out);
    return out;
  } catch (err) {
    return {
      status: 'unavailable',
      collectionsMatched: 0,
      datasets: [],
      sourceUrl: url,
      tokenConfigured: Boolean(nasaEarthdataToken),
      error: err instanceof Error ? err.message : 'NASA NSIDC CMR query failed'
    };
  }
}

export async function fetchNasaMerra2DustMeta(modisAod55?: number): Promise<NasaMerra2DustData> {
  const { endpoints, nasaEarthdataToken } = getServerApiConfig();
  const url = `${endpoints.nasaCmr}/collections.json?short_name=M2TMNXAER&page_size=1`;
  const headers = nasaEarthdataToken ? { Authorization: `Bearer ${nasaEarthdataToken}` } : undefined;

  try {
    let meta = merra2MetaCache.get('M2TMNXAER');
    if (!meta) {
      const json = await fetchJsonWithTimeout<{
        feed?: { entry?: Array<Record<string, unknown>> };
      }>(url, 7000, headers);
      const entry = json?.feed?.entry?.[0];
      meta = {
        shortName: String(entry?.short_name ?? 'M2TMNXAER'),
        title: String(
          entry?.title ?? 'MERRA-2 tavgM_2d_aer_Nx: 2d, Monthly mean, Time-Averaged Aerosol Diagnostics'
        )
      };
      merra2MetaCache.set('M2TMNXAER', meta);
    }

    return {
      status: 'live',
      collectionShortName: meta.shortName,
      collectionTitle: meta.title,
      modisAod55,
      spatialResolution: '0.5° × 0.625° MERRA-2 Reanalysis',
      sourceUrl: url,
      tokenConfigured: Boolean(nasaEarthdataToken)
    };
  } catch (err) {
    return {
      status: modisAod55 !== undefined ? 'live' : 'unavailable',
      collectionShortName: 'M2TMNXAER',
      collectionTitle: 'NASA MERRA-2 Aerosol Diagnostics (via LaRC POWER)',
      modisAod55,
      spatialResolution: '0.5° × 0.625° MERRA-2 Reanalysis',
      sourceUrl: url,
      tokenConfigured: Boolean(nasaEarthdataToken),
      error: err instanceof Error ? err.message : 'MERRA-2 CMR query failed'
    };
  }
}
