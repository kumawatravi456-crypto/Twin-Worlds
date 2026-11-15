import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  SOLAR_PLANETS,
  dateToJulianDate,
  solveKeplerHeliocentricAu,
  type JplBodyVector,
  type SolarEphemerisReport,
  type SolarPlanetId
} from './src/lib/solarSystemData.ts';
import { computeDemStatistics } from './src/lib/dem.ts';
import { decodeGrayscalePngToHeights } from './src/lib/pngDemServer.ts';
import { PLANETARY_TARGETS } from './src/data/planetaryTargets.ts';
import { buildCustomMoonTarget } from './src/data/lunarGazetteer.ts';
import { buildCustomMarsTarget } from './src/data/martianGazetteer.ts';
import { EARTH_ANALOG_SITES } from './src/data/earthAnalogs.ts';
import { GLOBAL_DISCOVERY_CELLS, buildDiscoverySiteModel } from './src/data/discoveryGrid.ts';
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS, computeSiteSimilarity } from './src/lib/scoring.ts';
import type {
  DemGridPayload,
  DiscoveryCandidate,
  DiscoveryScanResponse,
  FeatureWeights,
  LiveSiteTelemetry,
  NasaPowerClimatology,
  PlanetaryTarget
} from './src/types/analog.ts';
import { getParameterDataMatrix, getServerApiConfig } from './server/config/apiKeys.ts';
import {
  fetchPlanetaryPdsDossier,
  fetchPlanetaryPdsDossierForCoords
} from './server/services/nasaPdsService.ts';
import { fetchOpenMeteoHistoricalTemperature } from './server/services/openMeteoHistoricalService.ts';
import { fetchNasaMerra2DustMeta, fetchNasaNsidcData } from './server/services/earthdataService.ts';

interface SiteServerMeta {
  id: string;
  lat: number;
  lon: number;
  ncbiQuery: string;
}

const SITE_REGISTRY: SiteServerMeta[] = [
  {
    id: 'haughton-crater',
    lat: 75.383,
    lon: -89.683,
    ncbiQuery: '("Haughton"[All Fields] OR "Devon Island"[All Fields]) AND ("Mars"[All Fields] OR "extremophile"[All Fields] OR "permafrost"[All Fields])'
  },
  {
    id: 'atacama-yungay',
    lat: -24.083,
    lon: -69.917,
    ncbiQuery: '"Yungay"[All Fields] AND "Atacama"[All Fields] AND ("Mars"[All Fields] OR "perchlorate"[All Fields] OR "microbial"[All Fields])'
  },
  {
    id: 'mauna-loa-hiseas',
    lat: 19.536,
    lon: -155.576,
    ncbiQuery: '"Mauna Loa"[All Fields] AND ("basalt"[All Fields] OR "lava tube"[All Fields]) AND ("Mars"[All Fields] OR "microbial"[All Fields])'
  },
  {
    id: 'craters-of-the-moon',
    lat: 43.416,
    lon: -113.562,
    ncbiQuery: '"Craters of the Moon"[All Fields] AND ("basalt"[All Fields] OR "lava"[All Fields] OR "Mars"[All Fields])'
  },
  {
    id: 'rio-tinto',
    lat: 37.705,
    lon: -6.551,
    ncbiQuery: '"Rio Tinto"[All Fields] AND ("jarosite"[All Fields] OR "Acidithiobacillus"[All Fields]) AND ("Mars"[All Fields] OR "astrobiology"[All Fields])'
  },
  {
    id: 'mcmurdo-dry-valleys',
    lat: -77.862,
    lon: 160.703,
    ncbiQuery: '"University Valley"[All Fields] AND "Antarctica"[All Fields] AND ("permafrost"[All Fields] OR "Mars"[All Fields])'
  },
  {
    id: 'lonar-crater',
    lat: 19.976,
    lon: 76.508,
    ncbiQuery: '"Lonar"[All Fields] AND ("crater"[All Fields] OR "basalt"[All Fields]) AND ("extremophile"[All Fields] OR "archaea"[All Fields] OR "Mars"[All Fields])'
  },
  {
    id: 'askja-dyngjufjoll',
    lat: 65.033,
    lon: -16.75,
    ncbiQuery: '("Askja"[All Fields] OR "Iceland"[All Fields]) AND "basaltic"[All Fields] AND ("Mars"[All Fields] OR "palagonite"[All Fields])'
  },
  {
    id: 'salar-de-pajonales',
    lat: -25.141,
    lon: -68.822,
    ncbiQuery: '"Salar de Pajonales"[All Fields] AND ("gypsum"[All Fields] OR "Mars"[All Fields] OR "microbial"[All Fields])'
  },
  {
    id: 'qaidam-basin',
    lat: 38.25,
    lon: 90.85,
    ncbiQuery: '"Qaidam"[All Fields] AND ("Mars"[All Fields] OR "sulfate"[All Fields] OR "halophile"[All Fields])'
  },
  {
    id: 'lava-beds-nm',
    lat: 41.714,
    lon: -121.508,
    ncbiQuery: '"Lava Beds"[All Fields] AND ("lava tube"[All Fields] OR "cave"[All Fields]) AND ("Mars"[All Fields] OR "microbial"[All Fields])'
  },
  {
    id: 'lanzarote-la-corona',
    lat: 29.131,
    lon: -13.45,
    ncbiQuery: '"Lanzarote"[All Fields] AND ("lava tube"[All Fields] OR "basalt"[All Fields]) AND ("Mars"[All Fields] OR "microbial"[All Fields])'
  }
];

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const SOLAR_CACHE_TTL_MS = 60 * 60 * 1000;
const DEM_CACHE_TTL_MS = 60 * 60 * 1000;
const liveSiteCache = new Map<string, CacheEntry<unknown>>();
const earthDemCache = new Map<string, CacheEntry<DemGridPayload>>();
const planetaryDemCache = new Map<string, CacheEntry<DemGridPayload>>();
const nasaPowerCache = new Map<string, CacheEntry<NasaPowerClimatology>>();
const cellCop90Cache = new Map<string, CacheEntry<DemGridPayload>>();
let batchCache: CacheEntry<unknown> | null = null;
let solarEphemerisCache: CacheEntry<SolarEphemerisReport> | null = null;

const AU_KM = 149597870.7;
const AU_DAY_TO_KM_S = 1731.4568368;

function parseHorizonsVector(resultText: string): {
  xAu: number;
  yAu: number;
  zAu: number;
  vxAuDay: number;
  vyAuDay: number;
  vzAuDay: number;
  rgAu: number;
} | null {
  const soeIdx = resultText.indexOf('$$SOE');
  const eoeIdx = resultText.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) return null;
  const block = resultText.slice(soeIdx + 5, eoeIdx);

  const matchNum = (key: string) => {
    const re = new RegExp(`${key}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?(?:E[+-]?\\d+)?)`, 'i');
    const m = block.match(re);
    return m ? Number(m[1]) : NaN;
  };

  const xAu = matchNum('X');
  const yAu = matchNum('Y');
  const zAu = matchNum('Z');
  const vxAuDay = matchNum('VX');
  const vyAuDay = matchNum('VY');
  const vzAuDay = matchNum('VZ');
  const rgAu = matchNum('RG');

  if ([xAu, yAu, zAu, vxAuDay, vyAuDay, vzAuDay].some((n) => !Number.isFinite(n))) {
    return null;
  }

  return {
    xAu,
    yAu,
    zAu,
    vxAuDay,
    vyAuDay,
    vzAuDay,
    rgAu: Number.isFinite(rgAu) ? rgAu : Math.hypot(xAu, yAu, zAu)
  };
}

async function fetchHorizonsVector(commandId: string, center: string, startIso: string, stopIso: string) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${commandId}'`,
    OBJ_DATA: `'NO'`,
    MAKE_EPHEM: `'YES'`,
    EPHEM_TYPE: `'VECTORS'`,
    CENTER: `'${center}'`,
    START_TIME: `'${startIso}'`,
    STOP_TIME: `'${stopIso}'`,
    STEP_SIZE: `'1d'`,
    OUT_UNITS: `'AU-D'`
  });
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const json = await fetchJsonWithTimeout(url, 8000);
  if (typeof json?.result !== 'string') {
    throw new Error('Missing Horizons result block');
  }
  const parsed = parseHorizonsVector(json.result);
  if (!parsed) {
    throw new Error(`Could not parse Horizons ephemeris for ${commandId}`);
  }
  return parsed;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 7000, headers?: Record<string, string>) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'TerraAnalog-SpaceApps2026/1.0',
      ...(headers ?? {})
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function parseAaigridStats(text: string): { meanSlopeDeg: number; ruggednessM: number } | null {
  const lines = text.trim().split(/\r?\n/);
  const meta: Record<string, number> = {};
  const grid: number[][] = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length === 2 && Number.isFinite(Number(parts[1]))) {
      meta[parts[0].toLowerCase()] = Number(parts[1]);
    } else if (parts.length > 2) {
      grid.push(parts.map(Number));
    }
  }
  if (grid.length < 3 || grid[0].length < 3) return null;
  const cellM = (meta.cellsize ?? 0.0002777) * 111320;
  const nodata = meta.nodata_value ?? -9999;
  const slopes: number[] = [];
  const rugg: number[] = [];

  for (let r = 1; r < grid.length - 1; r++) {
    for (let c = 1; c < grid[r].length - 1; c++) {
      const z = grid[r][c];
      const zx1 = grid[r][c + 1];
      const zx0 = grid[r][c - 1];
      const zy1 = grid[r + 1][c];
      const zy0 = grid[r - 1][c];
      if ([z, zx1, zx0, zy1, zy0].some((v) => !Number.isFinite(v) || v === nodata)) continue;
      const dzdx = (zx1 - zx0) / (2 * cellM);
      const dzdy = (zy1 - zy0) / (2 * cellM);
      const slopeDeg = (Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180) / Math.PI;
      slopes.push(slopeDeg);

      let diffSum = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          diffSum += Math.abs(grid[r + dr][c + dc] - z);
        }
      }
      rugg.push(diffSum / 8);
    }
  }
  if (slopes.length === 0) return null;
  const meanSlopeDeg = Number((slopes.reduce((a, b) => a + b, 0) / slopes.length).toFixed(2));
  const ruggednessM = Number((rugg.reduce((a, b) => a + b, 0) / rugg.length).toFixed(2));
  return { meanSlopeDeg, ruggednessM };
}

async function fetchOpenTopographyStats(lat: number, lon: number) {
  const apiKey = process.env.OPENTOPOGRAPHY_API_KEY?.trim();
  const baseUrl = 'https://portal.opentopography.org/API/globaldem';
  if (!apiKey) {
    return {
      status: 'unavailable' as const,
      demDataset: 'Copernicus GLO-30 (COP30)',
      reason: 'OPENTOPOGRAPHY_API_KEY not configured on backend server.',
      fallbackNote: 'Using archived Copernicus/USGS DEM slope and live Open-Meteo 90m elevation sample.',
      sourceUrl: 'https://portal.opentopography.org/apidocs/'
    };
  }
  const delta = 0.01;
  const url = `${baseUrl}?demtype=COP30&south=${(lat - delta).toFixed(4)}&north=${(lat + delta).toFixed(4)}&west=${(lon - delta).toFixed(4)}&east=${(lon + delta).toFixed(4)}&outputFormat=AAIGrid&API_Key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`OpenTopography HTTP ${res.status}`);
    }
    const text = await res.text();
    const stats = parseAaigridStats(text);
    if (!stats) {
      throw new Error('Could not parse AAIGrid DEM matrix');
    }
    return {
      status: 'live' as const,
      demDataset: 'Copernicus GLO-30 (COP30)',
      meanSlopeDeg: stats.meanSlopeDeg,
      ruggednessM: stats.ruggednessM,
      fallbackNote: 'Computed directly from live 30m DEM neighborhood finite differences.',
      sourceUrl: 'https://portal.opentopography.org/apidocs/'
    };
  } catch (err) {
    return {
      status: 'unavailable' as const,
      demDataset: 'Copernicus GLO-30 (COP30)',
      reason: err instanceof Error ? err.message : 'OpenTopography query failed',
      fallbackNote: 'Falling back to archived regional DEM slope and Open-Meteo Copernicus 90m DEM.',
      sourceUrl: 'https://portal.opentopography.org/apidocs/'
    };
  }
}

function validPowerNum(val: unknown): number | undefined {
  return typeof val === 'number' && Number.isFinite(val) && val > -900 ? val : undefined;
}

async function fetchNasaPowerClimatology(lat: number, lon: number): Promise<NasaPowerClimatology> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();
  const cached = nasaPowerCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  const params = 'TS,T2M,T2M_MIN,T2M_MAX,T2M_RANGE,PRECTOTCORR,ALLSKY_SFC_SW_DWN,AOD_55';
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${params}&community=RE&longitude=${lon.toFixed(3)}&latitude=${lat.toFixed(3)}&format=JSON`;
  try {
    const json = await fetchJsonWithTimeout(url, 8000);
    const p = json?.properties?.parameter ?? {};
    const ann = (k: string) => validPowerNum(p?.[k]?.ANN);
    const precipDailyMm = ann('PRECTOTCORR');
    const annualPrecipMm = precipDailyMm !== undefined ? Number((precipDailyMm * 365.25).toFixed(1)) : undefined;

    const result: NasaPowerClimatology = {
      status: 'live',
      skinTempC: ann('TS') !== undefined ? Number(ann('TS')!.toFixed(1)) : undefined,
      airMeanTempC: ann('T2M') !== undefined ? Number(ann('T2M')!.toFixed(1)) : undefined,
      airMinTempC: ann('T2M_MIN') !== undefined ? Number(ann('T2M_MIN')!.toFixed(1)) : undefined,
      airMaxTempC: ann('T2M_MAX') !== undefined ? Number(ann('T2M_MAX')!.toFixed(1)) : undefined,
      diurnalRangeC: ann('T2M_RANGE') !== undefined ? Number(ann('T2M_RANGE')!.toFixed(1)) : undefined,
      annualPrecipMm,
      solarIrradianceKwhM2Day:
        ann('ALLSKY_SFC_SW_DWN') !== undefined ? Number(ann('ALLSKY_SFC_SW_DWN')!.toFixed(2)) : undefined,
      modisAod55: ann('AOD_55') !== undefined ? Number(ann('AOD_55')!.toFixed(3)) : undefined,
      acquisitionSpan: '2001–2020 NASA POWER Climatology',
      spatialResolution: '0.5° × 0.625° MERRA-2 / MODIS',
      sourceUrl: url
    };
    nasaPowerCache.set(key, { expiresAt: now + DEM_CACHE_TTL_MS, data: result });
    return result;
  } catch (err) {
    return {
      status: 'unavailable',
      acquisitionSpan: 'Unavailable',
      spatialResolution: '0.5° × 0.625°',
      sourceUrl: url,
      error: err instanceof Error ? err.message : 'NASA POWER climatology failed'
    };
  }
}

async function fetchCopernicus90mDemGrid(
  lat: number,
  lon: number,
  gridSize = 10,
  halfSpanDeg = 0.015
): Promise<DemGridPayload> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${gridSize}`;
  const now = Date.now();
  const cached = cellCop90Cache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  const lats: string[] = [];
  const lons: string[] = [];
  const minLat = Math.max(-89.8, lat - halfSpanDeg);
  const maxLat = Math.min(89.8, lat + halfSpanDeg);
  const cosLat = Math.max(0.18, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const lonSpanDeg = Math.min(0.25, halfSpanDeg / cosLat);
  const minLon = lon - lonSpanDeg;
  const maxLon = lon + lonSpanDeg;

  for (let r = 0; r < gridSize; r++) {
    const curLat = maxLat - (r / (gridSize - 1)) * (maxLat - minLat);
    for (let c = 0; c < gridSize; c++) {
      const curLon = minLon + (c / (gridSize - 1)) * (maxLon - minLon);
      lats.push(curLat.toFixed(5));
      lons.push(curLon.toFixed(5));
    }
  }

  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
  const json = await fetchJsonWithTimeout(url, 8000);
  const elevs = Array.isArray(json?.elevation) ? (json.elevation as number[]) : null;
  if (!elevs || elevs.length < gridSize * gridSize) {
    throw new Error('Incomplete Copernicus GLO-90 elevation matrix returned');
  }

  const heightsM: number[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridSize; c++) {
      const v = elevs[r * gridSize + c];
      row.push(Number.isFinite(v) ? Number(v.toFixed(1)) : 0);
    }
    heightsM.push(row);
  }

  const cellY = ((maxLat - minLat) / (gridSize - 1)) * 111320;
  const cellX = ((maxLon - minLon) / (gridSize - 1)) * 111320 * cosLat;
  const cellSizeMeters = Math.max(45, Math.sqrt(Math.max(1, cellX * cellY)));
  const stats = computeDemStatistics(heightsM, cellSizeMeters);

  const payload: DemGridPayload = {
    status: 'live',
    datasetName: 'Copernicus GLO-90 DEM (Open-Meteo Elevation API)',
    provider: 'ESA Copernicus / Open-Meteo',
    resolutionM: 90,
    bbox: { south: minLat, north: maxLat, west: minLon, east: maxLon },
    gridSize,
    heightsM,
    minM: stats.minM,
    maxM: stats.maxM,
    reliefM: stats.reliefM,
    meanSlopeDeg: stats.meanSlopeDeg,
    maxSlopeDeg: stats.maxSlopeDeg,
    roughnessIndex: stats.roughnessIndex,
    acquisitionDate: new Date().toISOString().slice(0, 10),
    processingMethod: '10×10 grid finite-difference slope & 8-neighbor Riley TRI',
    sourceUrl: 'https://open-meteo.com/en/docs/elevation-api'
  };
  cellCop90Cache.set(key, { expiresAt: now + DEM_CACHE_TTL_MS, data: payload });
  return payload;
}

async function fetchPlanetaryDemByCoords(input: {
  cacheKey: string;
  body: 'moon' | 'mars';
  lat: number;
  lon: number;
  fallbackSlopeDeg: number;
  fallbackRoughness: number;
}): Promise<DemGridPayload> {
  const now = Date.now();
  const cached = planetaryDemCache.get(input.cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;

  const isMoon = input.body === 'moon';
  const isPolar = Math.abs(input.lat) >= 80;
  const latHalf = isPolar ? 0.35 : 0.42;
  const lonHalf = isPolar ? 5.5 : 0.42;
  const south = Math.max(-89.95, input.lat - latHalf);
  const north = Math.min(89.95, input.lat + latHalf);
  const west = input.lon - lonHalf;
  const east = input.lon + lonHalf;
  const gridSize = 48;

  const mapFile = isMoon ? '/maps/earth/moon_simp_cyl.map' : '/maps/mars/mars_simp_cyl.map';
  const layer = isMoon ? 'LOLA_bw' : 'MOLA_bw';
  const minElevM = isMoon ? -9120 : -8200;
  const maxElevM = isMoon ? 10786 : 21229;
  const degMeters = isMoon ? 30323 : 59158;

  const wmsUrl = `https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=${encodeURIComponent(
    mapFile
  )}&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${layer}&STYLES=&SRS=EPSG:4326&BBOX=${west.toFixed(
    4
  )},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(
    4
  )}&WIDTH=${gridSize}&HEIGHT=${gridSize}&FORMAT=image/png`;

  try {
    const res = await fetch(wmsUrl, {
      signal: AbortSignal.timeout(9000),
      headers: { 'User-Agent': 'TerraAnalog-SpaceApps2026/1.0' }
    });
    if (!res.ok) throw new Error(`USGS WMS HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('png')) {
      throw new Error(`Unexpected USGS WMS content-type: ${contentType}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const heightsM = decodeGrayscalePngToHeights(buf, minElevM, maxElevM);

    const cosLat = Math.max(0.08, Math.abs(Math.cos((input.lat * Math.PI) / 180)));
    const cellY = ((north - south) / (gridSize - 1)) * degMeters;
    const cellX = ((east - west) / (gridSize - 1)) * degMeters * cosLat;
    const cellSizeMeters = Math.max(120, Math.sqrt(Math.max(1, cellX * cellY)));
    const stats = computeDemStatistics(heightsM, cellSizeMeters);

    const payload: DemGridPayload = {
      status: 'live',
      datasetName: isMoon ? 'NASA LRO LOLA Global DEM (USGS WMS)' : 'NASA MGS MOLA Global DEM (USGS WMS)',
      provider: 'USGS Astrogeology Science Center / NASA PDS',
      resolutionM: isMoon ? 118 : 463,
      bbox: { south, north, west, east },
      gridSize,
      heightsM,
      minM: stats.minM,
      maxM: stats.maxM,
      reliefM: stats.reliefM,
      meanSlopeDeg: stats.meanSlopeDeg,
      maxSlopeDeg: stats.maxSlopeDeg,
      roughnessIndex: stats.roughnessIndex,
      acquisitionDate: new Date().toISOString().slice(0, 10),
      processingMethod: `USGS ${layer} 8-bit calibrated elevation PNG (${minElevM}..${maxElevM} m) + finite-diff slope & Riley TRI`,
      sourceUrl: wmsUrl
    };
    planetaryDemCache.set(input.cacheKey, { expiresAt: now + DEM_CACHE_TTL_MS, data: payload });
    return payload;
  } catch (err) {
    return {
      status: 'unavailable',
      datasetName: isMoon ? 'NASA LRO LOLA Global DEM' : 'NASA MGS MOLA Global DEM',
      provider: 'USGS Astrogeology Science Center / NASA PDS',
      resolutionM: isMoon ? 118 : 463,
      bbox: { south, north, west, east },
      gridSize: 0,
      heightsM: [],
      minM: 0,
      maxM: 0,
      reliefM: 0,
      meanSlopeDeg: input.fallbackSlopeDeg,
      maxSlopeDeg: input.fallbackSlopeDeg * 2,
      roughnessIndex: input.fallbackRoughness,
      acquisitionDate: 'Unavailable',
      processingMethod: 'Live USGS WMS elevation fetch failed; showing fallback notice.',
      sourceUrl: wmsUrl,
      fallbackNote: 'Live planetary DEM PNG unavailable; surface relief renders fallback profile with explicit notice.',
      error: err instanceof Error ? err.message : 'Planetary DEM request failed'
    };
  }
}

async function fetchPlanetaryDemPayload(targetId: string): Promise<DemGridPayload> {
  const target = PLANETARY_TARGETS.find((t) => t.id === targetId);
  if (!target) {
    throw new Error(`Unknown planetary targetId: ${targetId}`);
  }
  return fetchPlanetaryDemByCoords({
    cacheKey: targetId,
    body: target.body,
    lat: target.lat,
    lon: target.lon,
    fallbackSlopeDeg: target.typicalSlopeDeg,
    fallbackRoughness: target.roughnessIndex
  });
}

// Firebase ID Token Verification via Google SecureToken Public X.509 Certs
let firebaseProjectId = '';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsedCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { projectId?: string };
    firebaseProjectId = parsedCfg.projectId ?? '';
  }
} catch {
  firebaseProjectId = '';
}

interface CertCache {
  expiresAt: number;
  certs: Record<string, string>;
}
let googleCertsCache: CertCache | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleCertsCache && googleCertsCache.expiresAt > now) {
    return googleCertsCache.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) {
    throw new Error(`Unable to fetch Firebase public keys (HTTP ${res.status})`);
  }
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = (await res.json()) as Record<string, string>;
  googleCertsCache = { expiresAt: now + maxAgeSec * 1000, certs };
  return certs;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!firebaseProjectId) {
    throw new Error('Firebase projectId is not configured on backend.');
  }
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID.');
  }
  const certs = await getGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Unknown Firebase signing certificate ID.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const sigBytes = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!verifier.verify(certPem, sigBytes)) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
    email?: string;
    name?: string;
    email_verified?: boolean;
  }>(payloadB64);

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId) {
    throw new Error('Token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) {
    throw new Error('Token issuer mismatch.');
  }
  if (!payload.sub || payload.sub.length > 128) {
    throw new Error('Invalid token subject.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Invalid token issued-at timestamp.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    name: typeof payload.name === 'string' ? payload.name : null,
    emailVerified: Boolean(payload.email_verified)
  };
}

interface AuthenticatedRequest extends Request {
  firebaseUser?: VerifiedFirebaseUser;
}

async function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer authorization token.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Empty authorization token.' });
    return;
  }
  try {
    req.firebaseUser = await verifyFirebaseIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid Firebase ID token.'
    });
  }
}

async function createApp() {
  const app = express();

  app.use(express.json());

  // Protected Auth Verification Endpoint
  app.get('/api/auth/verify', requireFirebaseAuth, (req: AuthenticatedRequest, res) => {
    res.json({
      verified: true,
      user: req.firebaseUser
    });
  });

  // Protected Explorer Session Validation Endpoint
  app.post('/api/explorer/session', requireFirebaseAuth, (req: AuthenticatedRequest, res) => {
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId : 'moon-south-pole-rim';
    res.json({
      authorized: true,
      uid: req.firebaseUser?.uid,
      targetId,
      verifiedAtUtc: new Date().toISOString()
    });
  });

  // 8-Parameter Free Data Source & Key Configuration Summary (never exposes secrets)
  app.get('/api/config/sources', (_req, res) => {
    const cfg = getServerApiConfig();
    res.json({
      generatedAtUtc: new Date().toISOString(),
      serverKeys: {
        nasaApiKeyConfigured: Boolean(cfg.nasaApiKey),
        nasaApiKeyMode: cfg.nasaApiKey === 'DEMO_KEY' ? 'DEMO_KEY (free public quota)' : 'Custom server key',
        nasaEarthdataTokenConfigured: Boolean(cfg.nasaEarthdataToken),
        ncbiApiKeyConfigured: Boolean(cfg.ncbiApiKey),
        openTopographyKeyConfigured: Boolean(cfg.openTopographyApiKey)
      },
      parameters: getParameterDataMatrix()
    });
  });

  // Planetary Geology (NASA PDS API), Caves/Orbital Imagery (PDS ODE), & Terrain (NASA Trek)
  app.get('/api/planetary/:targetId/pds', async (req, res) => {
    const targetId = req.params.targetId;
    if (!PLANETARY_TARGETS.some((t) => t.id === targetId)) {
      res.status(404).json({ error: `Unknown planetary targetId: ${targetId}` });
      return;
    }
    try {
      const dossier = await fetchPlanetaryPdsDossier(targetId);
      res.json(dossier);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to fetch planetary PDS dossier'
      });
    }
  });

  // Health & Adapter Status Endpoint
  app.get('/api/status', async (_req, res) => {
    const checkedAt = new Date().toISOString();
    const cfg = getServerApiConfig();
    const checks = await Promise.allSettled([
      fetch('https://api.open-meteo.com/v1/elevation?latitude=0&longitude=0', { signal: AbortSignal.timeout(4000) }),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=0&longitude=0&current=dust', {
        signal: AbortSignal.timeout(4000)
      }),
      fetch('https://cmr.earthdata.nasa.gov/search/collections.json?page_size=1', { signal: AbortSignal.timeout(4000) }),
      fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Mars&retmode=json&retmax=1', {
        signal: AbortSignal.timeout(4000)
      }),
      fetch('https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml', {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000)
      }),
      fetch(
        "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='399'&OBJ_DATA='NO'&MAKE_EPHEM='NO'",
        { signal: AbortSignal.timeout(4500) }
      ),
      fetch(
        'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=TS,AOD_55&community=RE&longitude=0&latitude=0&format=JSON',
        { signal: AbortSignal.timeout(4500) }
      ),
      fetch(
        'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MOLA_bw&STYLES=&SRS=EPSG:4326&BBOX=77,18,78,19&WIDTH=16&HEIGHT=16&FORMAT=image/png',
        { signal: AbortSignal.timeout(4500) }
      ),
      fetch(`${cfg.endpoints.nasaPdsApi}/classes/bundle?limit=1`, { signal: AbortSignal.timeout(4500) }),
      fetch(
        `${cfg.endpoints.nasaPdsOde}/?query=product&results=cm&output=json&target=mars&ihid=MRO&iid=CTX&pt=EDR&minlat=18&maxlat=19&westernlon=77&easternlon=78&limit=1`,
        { signal: AbortSignal.timeout(4500) }
      ),
      fetch(
        `${cfg.endpoints.openMeteoArchive}?latitude=0&longitude=0&start_date=2024-01-01&end_date=2024-01-05&daily=temperature_2m_mean&timezone=UTC`,
        { signal: AbortSignal.timeout(4500) }
      ),
      fetch(`${cfg.endpoints.nasaCmr}/collections.json?keyword=NSIDC%20permafrost&page_size=1`, {
        signal: AbortSignal.timeout(4500)
      })
    ]);

    const okAt = (idx: number) => checks[idx].status === 'fulfilled' && checks[idx].value.ok;

    res.json({
      checkedAt,
      adapters: [
        {
          id: 'nasa-pds-api',
          name: 'NASA PDS API (Geology & Mineralogy)',
          provider: 'NASA Planetary Data System',
          status: okAt(8) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: `${cfg.endpoints.nasaPdsApi}/classes/bundle`,
          notes: 'Moon/Mars geological bundles, mineral spectroscopy, and mission data archive records (no key required).'
        },
        {
          id: 'nasa-pds-ode',
          name: 'NASA PDS Orbital Data Explorer (ODE)',
          provider: 'Washington Univ. / NASA PDS Geosciences Node',
          status: okAt(9) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.nasaPdsOde,
          notes: 'MRO CTX & LRO LROC orbital imagery frames and surface observations for Caves/Surface exploration.'
        },
        {
          id: 'nasa-trek',
          name: 'NASA Solar System Treks (Topography & Exploration)',
          provider: 'NASA JPL Solar System Treks',
          status: okAt(4) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.nasaTrekWmts,
          notes: 'LRO WAC Lunar Mosaic & Mars Viking / MGS MOLA WMTS elevation and terrain surface visualization layers.'
        },
        {
          id: 'open-meteo-historical',
          name: 'Open-Meteo Historical Earth Temperature Archive',
          provider: 'Open-Meteo / ERA5 Reanalysis',
          status: okAt(10) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.openMeteoArchive,
          notes: '365-day historical Earth temperature mean, min/max extremes, diurnal swing, and precipitation.'
        },
        {
          id: 'nasa-nsidc',
          name: 'NASA NSIDC (Snow, Glaciers & Permafrost)',
          provider: 'NASA NSIDC DAAC / Earthdata CMR',
          status: okAt(11) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: Boolean(cfg.nasaEarthdataToken),
          endpoint: `${cfg.endpoints.nasaCmr}/collections.json`,
          notes: 'Cryosphere snow cover, glaciers, freezing/thawing indices, and permafrost records (no paid key).'
        },
        {
          id: 'nasa-power',
          name: 'NASA MERRA-2 & LaRC POWER (Dust & Climatology)',
          provider: 'NASA GMAO MERRA-2 / LaRC POWER',
          status: okAt(6) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: Boolean(cfg.nasaEarthdataToken) || true,
          endpoint: cfg.endpoints.nasaPower,
          notes: 'MERRA-2 atmospheric dust/aerosol optical depth (AOD_55), skin temp (TS), and precipitation (no paid key).'
        },
        {
          id: 'usgs-planetary-dem',
          name: 'USGS Astrogeology Moon LOLA & Mars MOLA DEM',
          provider: 'USGS Astrogeology / NASA PDS',
          status: okAt(7) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.usgsWms,
          notes: 'Calibrated LOLA_bw (Moon) & MOLA_bw (Mars) elevation matrices feeding real 3D terrain relief, slope, & TRI.'
        },
        {
          id: 'open-meteo-weather',
          name: 'Open-Meteo Forecast & Copernicus GLO-90 DEM',
          provider: 'Open-Meteo / ESA Copernicus',
          status: okAt(0) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.openMeteoElevation,
          notes: 'Live 2m temperature, 7-day diurnal swing, and 10×10 Copernicus 90m elevation grids for slope & roughness.'
        },
        {
          id: 'open-meteo-aq',
          name: 'Open-Meteo Air Quality (CAMS Dust Proxy)',
          provider: 'Open-Meteo / Copernicus CAMS',
          status: okAt(1) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.openMeteoAirQuality,
          notes: 'Live mineral dust (µg/m³), PM10, and PM2.5 used explicitly as terrestrial dust-storm proxy.'
        },
        {
          id: 'nasa-cmr',
          name: 'NASA Earthdata CMR Search (MODIS / ASTER / SRTM)',
          provider: 'NASA EOSDIS Common Metadata Repository',
          status: okAt(2) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: `${cfg.endpoints.nasaCmr}/collections.json`,
          notes: 'Live spatial bounding-box search returning MODIS, ASTER, SRTM, & NSIDC collection metadata.'
        },
        {
          id: 'nasa-gibs',
          name: 'NASA GIBS WMTS Satellite Imagery',
          provider: 'NASA EOSDIS Global Imagery Browse Services',
          status: 'live',
          requiresKey: false,
          keyConfigured: true,
          endpoint: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/',
          notes: 'Client-rendered MODIS Terra True Color satellite tile layers on the interactive Twin Split viewer.'
        },
        {
          id: 'ncbi-pubmed',
          name: 'NCBI E-utilities (Biology & Extremophiles)',
          provider: 'National Center for Biotechnology Information',
          status: okAt(3) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: Boolean(cfg.ncbiApiKey),
          endpoint: cfg.endpoints.ncbiEutils,
          notes: 'Extremophile research and biological literature records (no key required for basic access).'
        },
        {
          id: 'opentopography',
          name: 'OpenTopography Copernicus GLO-30 DEM',
          provider: 'OpenTopography / ESA',
          status: cfg.openTopographyApiKey ? 'live' : 'unavailable',
          requiresKey: true,
          keyConfigured: Boolean(cfg.openTopographyApiKey),
          endpoint: 'https://portal.opentopography.org/API/globaldem',
          notes: cfg.openTopographyApiKey
            ? 'Server API key configured for live 30m DEM finite-difference slope & ruggedness.'
            : 'Optional OPENTOPOGRAPHY_API_KEY unset; falls back transparently to Copernicus GLO-90.'
        },
        {
          id: 'nasa-jpl-horizons',
          name: 'NASA JPL Horizons DE441 Solar System Ephemeris',
          provider: 'NASA Jet Propulsion Laboratory (SSD)',
          status: okAt(5) ? 'live' : 'unavailable',
          requiresKey: false,
          keyConfigured: true,
          endpoint: cfg.endpoints.jplHorizons,
          notes: 'Live heliocentric state vectors (X, Y, Z AU & km/s) for all 8 planets plus geocentric Lunar vector.'
        }
      ]
    });
  });

  // Real Solar System Ephemeris (NASA JPL Horizons DE441 + J2000 Keplerian Fallback)
  app.get('/api/solar-ephemeris', async (_req, res) => {
    const nowMs = Date.now();
    if (solarEphemerisCache && solarEphemerisCache.expiresAt > nowMs) {
      res.json(solarEphemerisCache.data);
      return;
    }

    const today = new Date(nowMs);
    const startIso = today.toISOString().slice(0, 10);
    const tomorrow = new Date(nowMs + 86400000);
    const stopIso = tomorrow.toISOString().slice(0, 10);
    const julianDate = dateToJulianDate(nowMs);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    async function fetchHorizonsWithRetry(commandId: string, center: string) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await fetchHorizonsVector(commandId, center, startIso, stopIso);
        } catch (err) {
          if (attempt === 1) throw err;
          await sleep(250);
        }
      }
      throw new Error(`Horizons failed for ${commandId}`);
    }

    type VectorTaskResult = Awaited<ReturnType<typeof fetchHorizonsVector>> | null;
    const planetVectors: VectorTaskResult[] = new Array(SOLAR_PLANETS.length).fill(null);

    // Query JPL Horizons politely in pairs to avoid 503 concurrency throttling
    for (let i = 0; i < SOLAR_PLANETS.length; i += 2) {
      const pair = SOLAR_PLANETS.slice(i, i + 2);
      const settled = await Promise.allSettled(
        pair.map((planet) => fetchHorizonsWithRetry(planet.jplId, '500@10'))
      );
      settled.forEach((s, offset) => {
        if (s.status === 'fulfilled') planetVectors[i + offset] = s.value;
      });
      if (i + 2 < SOLAR_PLANETS.length) await sleep(120);
    }

    await sleep(120);
    let moonVector: VectorTaskResult = null;
    try {
      moonVector = await fetchHorizonsWithRetry('301', '500@399');
    } catch {
      moonVector = null;
    }

    const planets = {} as Record<SolarPlanetId, JplBodyVector>;
    let liveCount = 0;

    SOLAR_PLANETS.forEach((planet, idx) => {
      const v = planetVectors[idx];
      if (v) {
        liveCount++;
        const speedKmS =
          Math.hypot(v.vxAuDay, v.vyAuDay, v.vzAuDay) * AU_DAY_TO_KM_S;
        planets[planet.id] = {
          id: planet.id,
          name: planet.name,
          status: 'live',
          xAu: v.xAu,
          yAu: v.yAu,
          zAu: v.zAu,
          vxAuDay: v.vxAuDay,
          vyAuDay: v.vyAuDay,
          vzAuDay: v.vzAuDay,
          rangeAu: v.rgAu,
          speedKmS: Number(speedKmS.toFixed(2))
        };
      } else {
        const k = solveKeplerHeliocentricAu(planet, julianDate);
        planets[planet.id] = {
          id: planet.id,
          name: planet.name,
          status: 'archived',
          xAu: k.xAu,
          yAu: k.yAu,
          zAu: k.zAu,
          vxAuDay: 0,
          vyAuDay: 0,
          vzAuDay: 0,
          rangeAu: k.rangeAu,
          speedKmS: Number(k.speedKmS.toFixed(2))
        };
      }
    });

    let moonGeocentric: SolarEphemerisReport['moonGeocentric'];
    if (moonVector) {
      const m = moonVector;
      const distKm = m.rgAu * AU_KM;
      const speedKmS = Math.hypot(m.vxAuDay, m.vyAuDay, m.vzAuDay) * AU_DAY_TO_KM_S;
      moonGeocentric = {
        status: 'live',
        xKm: Math.round(m.xAu * AU_KM),
        yKm: Math.round(m.yAu * AU_KM),
        zKm: Math.round(m.zAu * AU_KM),
        distanceKm: Math.round(distKm),
        speedKmS: Number(speedKmS.toFixed(2))
      };
    } else {
      const moonPhase = (((julianDate - 2451545.0) / 27.32166) * Math.PI * 2) % (Math.PI * 2);
      const meanR = 384400;
      const inc = (5.145 * Math.PI) / 180;
      moonGeocentric = {
        status: 'archived',
        xKm: Math.round(Math.cos(moonPhase) * meanR),
        yKm: Math.round(Math.sin(moonPhase) * meanR * Math.cos(inc)),
        zKm: Math.round(Math.sin(moonPhase) * meanR * Math.sin(inc)),
        distanceKm: meanR,
        speedKmS: 1.02
      };
    }

    const report: SolarEphemerisReport = {
      epochIso: today.toISOString(),
      julianDate,
      source: liveCount > 0 ? 'nasa-jpl-horizons' : 'j2000-keplerian',
      planets,
      moonGeocentric
    };

    if (liveCount > 0) {
      solarEphemerisCache = { expiresAt: nowMs + SOLAR_CACHE_TTL_MS, data: report };
    }
    res.json(report);
  });

  // Batch Live Weather + Elevation + Dust Proxy across all 12 sites
  app.get('/api/batch-weather', async (_req, res) => {
    const now = Date.now();
    if (batchCache && batchCache.expiresAt > now) {
      res.json({ ...(batchCache.data as object), cached: true });
      return;
    }

    const lats = SITE_REGISTRY.map((s) => s.lat).join(',');
    const lons = SITE_REGISTRY.map((s) => s.lon).join(',');
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&past_days=6&forecast_days=1&timezone=UTC`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm10,pm2_5,dust`;

    const [weatherRes, aqRes] = await Promise.allSettled([
      fetchJsonWithTimeout(weatherUrl, 8000),
      fetchJsonWithTimeout(aqUrl, 8000)
    ]);

    const weatherArr =
      weatherRes.status === 'fulfilled'
        ? Array.isArray(weatherRes.value)
          ? weatherRes.value
          : [weatherRes.value]
        : null;
    const aqArr =
      aqRes.status === 'fulfilled'
        ? Array.isArray(aqRes.value)
          ? aqRes.value
          : [aqRes.value]
        : null;

    const sites: Record<string, unknown> = {};
    SITE_REGISTRY.forEach((site, idx) => {
      const w = weatherArr?.[idx];
      const a = aqArr?.[idx];
      let swing7d: number | undefined;
      if (w?.daily?.temperature_2m_max && w?.daily?.temperature_2m_min) {
        const diffs: number[] = [];
        for (let i = 0; i < w.daily.temperature_2m_max.length; i++) {
          const hi = w.daily.temperature_2m_max[i];
          const lo = w.daily.temperature_2m_min[i];
          if (typeof hi === 'number' && typeof lo === 'number') diffs.push(hi - lo);
        }
        if (diffs.length > 0) {
          swing7d = Number((diffs.reduce((x, y) => x + y, 0) / diffs.length).toFixed(1));
        }
      }

      sites[site.id] = {
        weatherStatus: w ? 'live' : 'unavailable',
        elevationM: typeof w?.elevation === 'number' ? Math.round(w.elevation) : undefined,
        currentTempC: typeof w?.current?.temperature_2m === 'number' ? Number(w.current.temperature_2m.toFixed(1)) : undefined,
        windSpeedMs: typeof w?.current?.wind_speed_10m === 'number' ? Number(w.current.wind_speed_10m.toFixed(1)) : undefined,
        observed7DaySwingC: swing7d,
        dustStatus: a ? 'live' : 'unavailable',
        dustUgM3: typeof a?.current?.dust === 'number' ? Number(a.current.dust.toFixed(1)) : undefined,
        pm10UgM3: typeof a?.current?.pm10 === 'number' ? Number(a.current.pm10.toFixed(1)) : undefined
      };
    });

    const payload = {
      fetchedAt: new Date().toISOString(),
      cached: false,
      sites
    };

    if (weatherArr || aqArr) {
      batchCache = { expiresAt: now + CACHE_TTL_MS, data: payload };
    }
    res.json(payload);
  });

  // Real Earth DEM Matrix Endpoint (Open-Meteo Copernicus GLO-90 10x10 Elevation Matrix)
  app.get('/api/dem/earth', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Valid lat [-90..90] and lon [-180..180] query parameters are required.' });
      return;
    }

    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const now = Date.now();
    const cached = earthDemCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.json(cached.data);
      return;
    }

    try {
      const payload = await fetchCopernicus90mDemGrid(lat, lon, 10, 0.015);
      earthDemCache.set(cacheKey, { expiresAt: now + DEM_CACHE_TTL_MS, data: payload });
      res.json(payload);
    } catch (err) {
      res.json({
        status: 'unavailable',
        datasetName: 'Copernicus GLO-90 DEM',
        provider: 'ESA Copernicus / Open-Meteo',
        resolutionM: 90,
        bbox: { south: lat - 0.015, north: lat + 0.015, west: lon - 0.015, east: lon + 0.015 },
        gridSize: 0,
        heightsM: [],
        minM: 0,
        maxM: 0,
        reliefM: 0,
        meanSlopeDeg: 0,
        maxSlopeDeg: 0,
        roughnessIndex: 0,
        acquisitionDate: 'Unavailable',
        processingMethod: 'Failed to retrieve live Copernicus GLO-90 elevation matrix.',
        sourceUrl: 'https://open-meteo.com/en/docs/elevation-api',
        fallbackNote: 'Live Earth DEM matrix unavailable; displaying fallback terrain notice.',
        error: err instanceof Error ? err.message : 'DEM fetch failed'
      } satisfies DemGridPayload);
    }
  });

  // Real Planetary DEM Matrix Endpoint (USGS Astrogeology LRO LOLA / MGS MOLA WMS PNG Decoder)
  app.get('/api/dem/planetary', async (req, res) => {
    const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : '';
    if (targetId && PLANETARY_TARGETS.some((t) => t.id === targetId)) {
      const payload = await fetchPlanetaryDemPayload(targetId);
      res.json(payload);
      return;
    }

    const bodyParam = req.query.body === 'mars' ? 'mars' : req.query.body === 'moon' ? 'moon' : null;
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (
      bodyParam &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      const cacheKey = `${bodyParam}:${lat.toFixed(2)},${lon.toFixed(2)}`;
      const payload = await fetchPlanetaryDemByCoords({
        cacheKey,
        body: bodyParam,
        lat,
        lon,
        fallbackSlopeDeg: bodyParam === 'moon' ? 6.5 : 4.5,
        fallbackRoughness: 0.52
      });
      res.json(payload);
      return;
    }

    res.status(400).json({ error: `Unknown or missing planetary targetId / coordinates: ${targetId}` });
  });

  async function evaluateEarthAnalogsForTarget(
    target: PlanetaryTarget,
    weights: FeatureWeights,
    includeCurated = true
  ): Promise<{ nowIso: string; candidates: DiscoveryCandidate[] }> {
    const cellsToScan = GLOBAL_DISCOVERY_CELLS;
    const allCoords = [
      ...cellsToScan.map((c) => ({ id: c.id, lat: c.lat, lon: c.lon })),
      ...(includeCurated ? EARTH_ANALOG_SITES.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon })) : [])
    ];

    const lats = allCoords.map((x) => x.lat).join(',');
    const lons = allCoords.map((x) => x.lon).join(',');
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&past_days=3&forecast_days=1&timezone=UTC`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm10,dust`;

    const [weatherRes, aqRes] = await Promise.allSettled([
      fetchJsonWithTimeout(weatherUrl, 9000),
      fetchJsonWithTimeout(aqUrl, 9000)
    ]);

    const weatherArr =
      weatherRes.status === 'fulfilled'
        ? Array.isArray(weatherRes.value)
          ? weatherRes.value
          : [weatherRes.value]
        : null;
    const aqArr =
      aqRes.status === 'fulfilled'
        ? Array.isArray(aqRes.value)
          ? aqRes.value
          : [aqRes.value]
        : null;

    // Fetch NASA POWER climatology + Copernicus 90m 10x10 DEM in bounded batches (cached 60 min)
    const powerById = new Map<string, NasaPowerClimatology>();
    const demById = new Map<string, DemGridPayload>();
    const concurrency = 6;
    for (let i = 0; i < cellsToScan.length; i += concurrency) {
      const slice = cellsToScan.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        slice.map(async (cell) => {
          const [pwr, dem] = await Promise.allSettled([
            fetchNasaPowerClimatology(cell.lat, cell.lon),
            fetchCopernicus90mDemGrid(cell.lat, cell.lon, 10, 0.015)
          ]);
          return {
            id: cell.id,
            pwr: pwr.status === 'fulfilled' ? pwr.value : null,
            dem: dem.status === 'fulfilled' ? dem.value : null
          };
        })
      );
      settled.forEach((s) => {
        if (s.status === 'fulfilled') {
          if (s.value.pwr) powerById.set(s.value.id, s.value.pwr);
          if (s.value.dem) demById.set(s.value.id, s.value.dem);
        }
      });
    }

    const candidates: DiscoveryCandidate[] = [];
    const nowIso = new Date().toISOString();

    const extractLiveWeather = (idx: number) => {
      const w = weatherArr?.[idx];
      const a = aqArr?.[idx];
      let swing: number | null = null;
      if (w?.daily?.temperature_2m_max && w?.daily?.temperature_2m_min) {
        const diffs: number[] = [];
        for (let k = 0; k < w.daily.temperature_2m_max.length; k++) {
          const hi = w.daily.temperature_2m_max[k];
          const lo = w.daily.temperature_2m_min[k];
          if (typeof hi === 'number' && typeof lo === 'number') diffs.push(hi - lo);
        }
        if (diffs.length > 0) swing = Number((diffs.reduce((p, q) => p + q, 0) / diffs.length).toFixed(1));
      }
      return {
        elevationM: typeof w?.elevation === 'number' ? Math.round(w.elevation) : null,
        currentTempC: typeof w?.current?.temperature_2m === 'number' ? Number(w.current.temperature_2m.toFixed(1)) : null,
        observed7DaySwingC: swing,
        dustUgM3: typeof a?.current?.dust === 'number' ? Number(a.current.dust.toFixed(1)) : null,
        pm10UgM3: typeof a?.current?.pm10 === 'number' ? Number(a.current.pm10.toFixed(1)) : null
      };
    };

    // 1. Score all 36 Discovery Grid Cells
    cellsToScan.forEach((cell, idx) => {
      const lw = extractLiveWeather(idx);
      const pwr = powerById.get(cell.id);
      const dem = demById.get(cell.id);

      const siteModel = buildDiscoverySiteModel(cell, {
        elevationM: lw.elevationM ?? dem?.maxM ?? null,
        currentTempC: lw.currentTempC,
        skinTempC: pwr?.skinTempC ?? null,
        airMeanTempC: pwr?.airMeanTempC ?? null,
        airMinTempC: pwr?.airMinTempC ?? null,
        airMaxTempC: pwr?.airMaxTempC ?? null,
        diurnalRangeC: pwr?.diurnalRangeC ?? null,
        observed7DaySwingC: lw.observed7DaySwingC,
        annualPrecipMm: pwr?.annualPrecipMm ?? null,
        solarIrradianceKwhM2Day: pwr?.solarIrradianceKwhM2Day ?? null,
        modisAod55: pwr?.modisAod55 ?? null,
        dustUgM3: lw.dustUgM3,
        pm10UgM3: lw.pm10UgM3,
        demSlopeDeg: dem?.meanSlopeDeg ?? null,
        demRoughness: dem?.roughnessIndex ?? null
      });

      const syntheticLive: LiveSiteTelemetry = {
        siteId: cell.id,
        fetchedAt: nowIso,
        cached: false,
        openMeteoWeather: {
          status: lw.currentTempC !== null ? 'live' : 'unavailable',
          elevationM: lw.elevationM ?? undefined,
          currentTempC: lw.currentTempC ?? undefined,
          observed7DaySwingC: lw.observed7DaySwingC ?? undefined,
          sourceUrl: 'https://api.open-meteo.com/v1/forecast'
        },
        openMeteoAirQuality: {
          status: lw.dustUgM3 !== null ? 'live' : 'unavailable',
          dustUgM3: lw.dustUgM3 ?? undefined,
          pm10UgM3: lw.pm10UgM3 ?? undefined,
          proxyNote: 'Copernicus CAMS atmospheric dust proxy',
          sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality'
        },
        nasaPower: pwr,
        copernicusDem: dem
          ? {
              status: dem.status,
              datasetName: dem.datasetName,
              resolutionM: dem.resolutionM,
              meanSlopeDeg: dem.meanSlopeDeg,
              maxSlopeDeg: dem.maxSlopeDeg,
              roughnessIndex: dem.roughnessIndex,
              reliefM: dem.reliefM,
              minM: dem.minM,
              maxM: dem.maxM,
              sourceUrl: dem.sourceUrl
            }
          : undefined,
        nasaCmr: { status: 'unavailable', totalHits: 0, collections: [], sourceUrl: '' },
        ncbiPubmed: { status: 'unavailable', totalCount: 0, query: '', articles: [], sourceUrl: '' },
        openTopography: {
          status: 'unavailable',
          demDataset: 'Copernicus GLO-30',
          fallbackNote: 'Uses Copernicus GLO-90 10×10 DEM.',
          sourceUrl: 'https://portal.opentopography.org/apidocs/'
        }
      };

      const similarity = computeSiteSimilarity(siteModel, target, weights, syntheticLive);
      candidates.push({
        id: cell.id,
        name: cell.name,
        region: cell.region,
        country: cell.country,
        lat: cell.lat,
        lon: cell.lon,
        isCurated: false,
        geologyClass: cell.geologyClass,
        primaryLithology: cell.primaryLithology,
        siteModel,
        similarity,
        liveObservations: {
          elevationM: lw.elevationM ?? (dem ? Math.round(dem.maxM) : null),
          currentTempC: lw.currentTempC,
          skinTempC: pwr?.skinTempC ?? null,
          annualPrecipMm: pwr?.annualPrecipMm ?? null,
          modisAod55: pwr?.modisAod55 ?? null,
          dustUgM3: lw.dustUgM3,
          demSlopeDeg: dem?.meanSlopeDeg ?? null,
          demRoughness: dem?.roughnessIndex ?? null
        }
      });
    });

    // 2. Include curated sites for unified global comparison if requested
    if (includeCurated) {
      EARTH_ANALOG_SITES.forEach((site, offset) => {
        const lw = extractLiveWeather(cellsToScan.length + offset);
        const syntheticLive: LiveSiteTelemetry = {
          siteId: site.id,
          fetchedAt: nowIso,
          cached: false,
          openMeteoWeather: {
            status: lw.currentTempC !== null ? 'live' : 'unavailable',
            elevationM: lw.elevationM ?? undefined,
            currentTempC: lw.currentTempC ?? undefined,
            observed7DaySwingC: lw.observed7DaySwingC ?? undefined,
            sourceUrl: 'https://api.open-meteo.com/v1/forecast'
          },
          openMeteoAirQuality: {
            status: lw.dustUgM3 !== null ? 'live' : 'unavailable',
            dustUgM3: lw.dustUgM3 ?? undefined,
            pm10UgM3: lw.pm10UgM3 ?? undefined,
            proxyNote: 'Copernicus CAMS atmospheric dust proxy',
            sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality'
          },
          nasaCmr: { status: 'unavailable', totalHits: 0, collections: [], sourceUrl: '' },
          ncbiPubmed: { status: 'unavailable', totalCount: 0, query: site.biology.ncbiQuery, articles: [], sourceUrl: '' },
          openTopography: {
            status: 'unavailable',
            demDataset: 'Copernicus GLO-30',
            fallbackNote: 'Uses curated Copernicus/SRTM slope.',
            sourceUrl: 'https://portal.opentopography.org/apidocs/'
          }
        };
        const similarity = computeSiteSimilarity(site, target, weights, syntheticLive);
        candidates.push({
          id: site.id,
          name: site.name,
          region: site.region,
          country: site.country,
          lat: site.lat,
          lon: site.lon,
          isCurated: true,
          geologyClass: site.geology.rockTypes[0] ?? 'Curated Reference',
          primaryLithology: site.geology.description,
          siteModel: site,
          similarity,
          liveObservations: {
            elevationM: lw.elevationM ?? site.topography.elevationM,
            currentTempC: lw.currentTempC,
            skinTempC: null,
            annualPrecipMm: site.waterIce.annualPrecipMm,
            modisAod55: null,
            dustUgM3: lw.dustUgM3,
            demSlopeDeg: site.topography.meanSlopeDeg,
            demRoughness: site.topography.roughnessIndex
          }
        });
      });
    }

    candidates.sort(
      (a, b) =>
        b.similarity.compositeScore - a.similarity.compositeScore ||
        b.similarity.confidencePct - a.similarity.confidencePct
    );

    return { nowIso, candidates };
  }

  async function handleAnalyzePlanetaryLocation(
    planetBody: 'moon' | 'mars',
    req: Request,
    res: Response
  ) {
    const body = (req.body ?? {}) as {
      lat?: number;
      lon?: number;
      name?: string;
      presetId?: string;
      weights?: Partial<FeatureWeights>;
    };

    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        error: `Valid ${planetBody === 'moon' ? 'Moon' : 'Mars'} latitude [-90..90] and longitude [-180..180] are required.`
      });
      return;
    }

    const preset = WEIGHT_PRESETS.find((p) => p.id === body.presetId);
    const weights: FeatureWeights = {
      ...(preset ? preset.weights : DEFAULT_WEIGHTS),
      ...(body.weights ?? {})
    };

    const cacheKey = `${planetBody}:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const preliminary =
      planetBody === 'moon'
        ? buildCustomMoonTarget({ lat, lon, name: body.name })
        : buildCustomMarsTarget({ lat, lon, name: body.name });

    const [planetaryDem, pdsDossier] = await Promise.all([
      fetchPlanetaryDemByCoords({
        cacheKey,
        body: planetBody,
        lat,
        lon,
        fallbackSlopeDeg: preliminary.typicalSlopeDeg,
        fallbackRoughness: preliminary.roughnessIndex
      }),
      fetchPlanetaryPdsDossierForCoords({
        targetId: preliminary.id,
        body: planetBody,
        lat,
        lon,
        trekWmtsLayerUrl: preliminary.trekWmtsLayerUrl,
        trekSourceLabel: preliminary.trekSourceLabel
      })
    ]);

    const demStats =
      planetaryDem.status === 'live'
        ? {
            elevationRelativeM: Math.round((planetaryDem.minM + planetaryDem.maxM) / 2),
            meanSlopeDeg: planetaryDem.meanSlopeDeg,
            roughnessIndex: planetaryDem.roughnessIndex
          }
        : undefined;

    const target =
      planetBody === 'moon'
        ? buildCustomMoonTarget({ lat, lon, name: body.name, dem: demStats })
        : buildCustomMarsTarget({ lat, lon, name: body.name, dem: demStats });

    const { nowIso, candidates } = await evaluateEarthAnalogsForTarget(target, weights, true);

    res.json({
      analyzedAtUtc: nowIso,
      target,
      planetaryDem,
      moonDem: planetaryDem,
      pdsDossier,
      topEarthMatch: candidates[0] ?? null,
      rankedMatches: candidates,
      evaluatedEarthSitesCount: candidates.length
    });
  }

  // Custom Moon & Mars Coordinate -> Most Similar Earth Location Finders
  app.post('/api/moon/analyze-location', (req, res) => {
    void handleAnalyzePlanetaryLocation('moon', req, res);
  });

  app.post('/api/mars/analyze-location', (req, res) => {
    void handleAnalyzePlanetaryLocation('mars', req, res);
  });

  // Global Earth Analog Discovery Scan (36 Global Grid Cells + 12 Curated Sites)
  app.post('/api/discovery/scan', async (req, res) => {
    const body = (req.body ?? {}) as {
      targetId?: string;
      customTarget?: PlanetaryTarget;
      presetId?: string;
      weights?: Partial<FeatureWeights>;
      filters?: {
        country?: string;
        region?: string;
        minSimilarity?: number;
        minConfidence?: number;
        includeCurated?: boolean;
      };
    };

    const target =
      body.customTarget && (body.customTarget.body === 'moon' || body.customTarget.body === 'mars')
        ? body.customTarget
        : PLANETARY_TARGETS.find((t) => t.id === body.targetId) ?? PLANETARY_TARGETS[0];
    const preset = WEIGHT_PRESETS.find((p) => p.id === body.presetId);
    const weights: FeatureWeights = {
      ...(preset ? preset.weights : DEFAULT_WEIGHTS),
      ...(body.weights ?? {})
    };
    const includeCurated = body.filters?.includeCurated !== false;

    const { nowIso, candidates } = await evaluateEarthAnalogsForTarget(
      target,
      weights,
      includeCurated
    );

    // Apply user filters
    const countryFilter = body.filters?.country?.trim().toLowerCase() ?? '';
    const regionFilter = body.filters?.region?.trim().toLowerCase() ?? '';
    const minSim = typeof body.filters?.minSimilarity === 'number' ? body.filters.minSimilarity : 0;
    const minConf = typeof body.filters?.minConfidence === 'number' ? body.filters.minConfidence : 0;

    const filtered = candidates.filter((c) => {
      if (countryFilter && !c.country.toLowerCase().includes(countryFilter)) return false;
      if (regionFilter && !c.region.toLowerCase().includes(regionFilter)) return false;
      if (c.similarity.compositeScore < minSim) return false;
      if (c.similarity.confidencePct < minConf) return false;
      return true;
    });

    const responsePayload: DiscoveryScanResponse = {
      scannedAtUtc: nowIso,
      targetId: target.id,
      totalCellsEvaluated: candidates.length,
      returnedCount: filtered.length,
      datasetsUsed: [
        'NASA Langley POWER (TS, T2M_RANGE, PRECTOTCORR, MODIS AOD_55)',
        'ESA Copernicus GLO-90 10×10 DEM (Open-Meteo Elevation API)',
        'Open-Meteo ECMWF Live Forecast & Copernicus CAMS Dust Proxy',
        'NSIDC Permafrost Zonation & GLiM Lithological Baseline'
      ],
      candidates: filtered
    };

    res.json(responsePayload);
  });

  // Per-Site Deep Live Retrieval (Open-Meteo + Air Quality + NASA POWER + Copernicus 90m DEM + NASA CMR + NCBI PubMed + OpenTopography)
  app.get('/api/sites/:id/live', async (req, res) => {
    const registrySite = SITE_REGISTRY.find((s) => s.id === req.params.id);
    const discoveryCell = !registrySite
      ? GLOBAL_DISCOVERY_CELLS.find((c) => c.id === req.params.id)
      : undefined;
    const site: SiteServerMeta | undefined =
      registrySite ??
      (discoveryCell
        ? {
            id: discoveryCell.id,
            lat: discoveryCell.lat,
            lon: discoveryCell.lon,
            ncbiQuery: `"${discoveryCell.name.split(',')[0]}" AND ("Mars" OR "Moon" OR "extremophile")`
          }
        : undefined);

    if (!site) {
      res.status(404).json({ error: `Unknown site id: ${req.params.id}` });
      return;
    }

    const now = Date.now();
    const cached = liveSiteCache.get(site.id);
    if (cached && cached.expiresAt > now) {
      res.json({ ...(cached.data as object), cached: true });
      return;
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,shortwave_radiation_sum&past_days=6&forecast_days=1&timezone=UTC`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${site.lat}&longitude=${site.lon}&current=pm10,pm2_5,dust`;
    const bbox = `${(site.lon - 0.25).toFixed(3)},${(site.lat - 0.25).toFixed(3)},${(site.lon + 0.25).toFixed(3)},${(site.lat + 0.25).toFixed(3)}`;
    const cmrUrl = `https://cmr.earthdata.nasa.gov/search/collections.json?bounding_box=${bbox}&has_granules=true&page_size=6&sort_key=-usage_score`;
    const ncbiApiKeyParam = process.env.NCBI_API_KEY?.trim() ? `&api_key=${encodeURIComponent(process.env.NCBI_API_KEY.trim())}` : '';
    const ncbiSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(site.ncbiQuery)}&retmode=json&retmax=4${ncbiApiKeyParam}`;

    const [
      weatherRes,
      aqRes,
      cmrRes,
      ncbiSearchRes,
      openTopoRes,
      nasaPowerRes,
      cop90Res,
      openMeteoHistRes,
      nsidcRes
    ] = await Promise.allSettled([
      fetchJsonWithTimeout(weatherUrl, 7000),
      fetchJsonWithTimeout(aqUrl, 7000),
      fetchJsonWithTimeout(cmrUrl, 7000),
      fetchJsonWithTimeout(ncbiSearchUrl, 7000),
      fetchOpenTopographyStats(site.lat, site.lon),
      fetchNasaPowerClimatology(site.lat, site.lon),
      fetchCopernicus90mDemGrid(site.lat, site.lon, 10, 0.015),
      fetchOpenMeteoHistoricalTemperature(site.lat, site.lon),
      fetchNasaNsidcData(site.lat, site.lon)
    ]);

    // Format Open-Meteo Weather
    let openMeteoWeather: Record<string, unknown>;
    if (weatherRes.status === 'fulfilled') {
      const w = weatherRes.value;
      const dates: string[] = w?.daily?.time ?? [];
      const mins: number[] = w?.daily?.temperature_2m_min ?? [];
      const maxs: number[] = w?.daily?.temperature_2m_max ?? [];
      const rads: number[] = w?.daily?.shortwave_radiation_sum ?? [];
      const diffs = maxs.map((hi, i) => (typeof hi === 'number' && typeof mins[i] === 'number' ? hi - mins[i] : null)).filter((v): v is number => v !== null);
      const avgSwing = diffs.length > 0 ? Number((diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)) : undefined;
      const latestRad = rads.filter((v) => typeof v === 'number').slice(-1)[0];

      openMeteoWeather = {
        status: 'live',
        elevationM: typeof w.elevation === 'number' ? Math.round(w.elevation) : undefined,
        currentTempC: w.current?.temperature_2m,
        apparentTempC: w.current?.apparent_temperature,
        windSpeedMs: w.current?.wind_speed_10m,
        relativeHumidityPct: w.current?.relative_humidity_2m,
        shortwaveRadiationSumMjM2: latestRad,
        observed7DaySwingC: avgSwing,
        dailyDates: dates,
        dailyMinC: mins,
        dailyMaxC: maxs,
        sourceUrl: weatherUrl
      };
    } else {
      openMeteoWeather = {
        status: 'unavailable',
        sourceUrl: weatherUrl,
        error: weatherRes.reason instanceof Error ? weatherRes.reason.message : 'Open-Meteo weather query failed'
      };
    }

    // Format Open-Meteo Air Quality Dust Proxy
    let openMeteoAirQuality: Record<string, unknown>;
    if (aqRes.status === 'fulfilled') {
      const a = aqRes.value;
      openMeteoAirQuality = {
        status: 'live',
        dustUgM3: a.current?.dust,
        pm10UgM3: a.current?.pm10,
        pm25UgM3: a.current?.pm2_5,
        observedAt: a.current?.time,
        proxyNote:
          'Terrestrial atmospheric mineral dust & PM10/PM2.5 from Copernicus CAMS (proxy only; cannot replicate lunar vacuum electrostatics or Martian ferric perchlorates).',
        sourceUrl: aqUrl
      };
    } else {
      openMeteoAirQuality = {
        status: 'unavailable',
        proxyNote: 'Atmospheric dust proxy could not be retrieved.',
        sourceUrl: aqUrl,
        error: aqRes.reason instanceof Error ? aqRes.reason.message : 'Air quality query failed'
      };
    }

    // Format NASA CMR
    let nasaCmr: Record<string, unknown>;
    if (cmrRes.status === 'fulfilled') {
      const entries = (cmrRes.value?.feed?.entry ?? []) as Array<Record<string, unknown>>;
      nasaCmr = {
        status: 'live',
        totalHits: entries.length,
        collections: entries.map((e) => ({
          id: String(e.id ?? ''),
          shortName: String(e.short_name ?? e.dataset_id ?? 'NASA Collection'),
          title: String(e.title ?? e.dataset_id ?? ''),
          timeStart: typeof e.time_start === 'string' ? e.time_start.slice(0, 10) : undefined,
          timeEnd: typeof e.time_end === 'string' ? e.time_end.slice(0, 10) : undefined,
          archiveCenter: typeof e.archive_center === 'string' ? e.archive_center : undefined,
          url: `https://search.earthdata.nasa.gov/search/granules?p=${encodeURIComponent(String(e.id ?? ''))}&sb=${encodeURIComponent(bbox)}`
        })),
        sourceUrl: cmrUrl
      };
    } else {
      nasaCmr = {
        status: 'unavailable',
        totalHits: 0,
        collections: [],
        sourceUrl: cmrUrl,
        error: cmrRes.reason instanceof Error ? cmrRes.reason.message : 'NASA CMR search failed'
      };
    }

    // Format NCBI PubMed (esearch -> esummary)
    let ncbiPubmed: Record<string, unknown>;
    if (ncbiSearchRes.status === 'fulfilled') {
      const searchResult = ncbiSearchRes.value?.esearchresult;
      const idList: string[] = searchResult?.idlist ?? [];
      const totalCount = Number(searchResult?.count ?? 0);
      type PubmedArticle = {
        pmid: string;
        title: string;
        journal: string;
        pubdate: string;
        authors: string;
        url: string;
      };
      let articles: PubmedArticle[] = [];

      if (idList.length > 0) {
        try {
          const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json${ncbiApiKeyParam}`;
          const sumJson = await fetchJsonWithTimeout(sumUrl, 6000);
          const resultObj = sumJson?.result ?? {};
          const mapped: Array<PubmedArticle | null> = idList.map((pmid) => {
            const item = resultObj[pmid];
            if (!item) return null;
            const firstAuthor =
              Array.isArray(item.authors) && item.authors.length > 0 ? String(item.authors[0].name) : 'Unknown';
            return {
              pmid,
              title: String(item.title ?? 'Untitled study'),
              journal: String(item.fulljournalname ?? item.source ?? ''),
              pubdate: String(item.pubdate ?? ''),
              authors: Array.isArray(item.authors) && item.authors.length > 1 ? `${firstAuthor} et al.` : firstAuthor,
              url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
            };
          });
          articles = mapped.filter((x): x is PubmedArticle => x !== null);
        } catch {
          articles = idList.map((pmid) => ({
            pmid,
            title: `PubMed Record PMID ${pmid}`,
            journal: 'PubMed',
            pubdate: '',
            authors: '',
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          }));
        }
      }

      ncbiPubmed = {
        status: 'live',
        totalCount,
        query: site.ncbiQuery,
        articles,
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(site.ncbiQuery)}`
      };
    } else {
      ncbiPubmed = {
        status: 'unavailable',
        totalCount: 0,
        query: site.ncbiQuery,
        articles: [],
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(site.ncbiQuery)}`,
        error: ncbiSearchRes.reason instanceof Error ? ncbiSearchRes.reason.message : 'NCBI PubMed query failed'
      };
    }

    const openTopography =
      openTopoRes.status === 'fulfilled'
        ? openTopoRes.value
        : {
            status: 'unavailable',
            demDataset: 'Copernicus GLO-30 (COP30)',
            reason: 'Adapter execution failed.',
            fallbackNote: 'Using Copernicus GLO-90 10×10 DEM.',
            sourceUrl: 'https://portal.opentopography.org/apidocs/'
          };

    const nasaPower: NasaPowerClimatology =
      nasaPowerRes.status === 'fulfilled'
        ? nasaPowerRes.value
        : {
            status: 'unavailable',
            acquisitionSpan: 'Unavailable',
            spatialResolution: '0.5° × 0.625°',
            sourceUrl: 'https://power.larc.nasa.gov/',
            error: 'NASA POWER request failed'
          };

    const copernicusDem =
      cop90Res.status === 'fulfilled'
        ? {
            status: cop90Res.value.status,
            datasetName: cop90Res.value.datasetName,
            resolutionM: cop90Res.value.resolutionM,
            meanSlopeDeg: cop90Res.value.meanSlopeDeg,
            maxSlopeDeg: cop90Res.value.maxSlopeDeg,
            roughnessIndex: cop90Res.value.roughnessIndex,
            reliefM: cop90Res.value.reliefM,
            minM: cop90Res.value.minM,
            maxM: cop90Res.value.maxM,
            sourceUrl: cop90Res.value.sourceUrl
          }
        : {
            status: 'unavailable',
            datasetName: 'Copernicus GLO-90 DEM',
            resolutionM: 90,
            sourceUrl: 'https://open-meteo.com/en/docs/elevation-api',
            error: 'Copernicus GLO-90 grid fetch failed'
          };

    const openMeteoHistorical =
      openMeteoHistRes.status === 'fulfilled'
        ? openMeteoHistRes.value
        : {
            status: 'unavailable' as const,
            startDate: '',
            endDate: '',
            daysSampled: 0,
            sourceUrl: 'https://archive-api.open-meteo.com/v1/archive',
            error: 'Historical temperature query failed'
          };

    const nasaNsidc =
      nsidcRes.status === 'fulfilled'
        ? nsidcRes.value
        : {
            status: 'unavailable' as const,
            collectionsMatched: 0,
            datasets: [],
            sourceUrl: 'https://cmr.earthdata.nasa.gov/search/collections.json',
            tokenConfigured: Boolean(process.env.NASA_EARTHDATA_TOKEN?.trim()),
            error: 'NASA NSIDC CMR query failed'
          };

    const nasaMerra2 = await fetchNasaMerra2DustMeta(nasaPower.modisAod55);

    const payload = {
      siteId: site.id,
      fetchedAt: new Date().toISOString(),
      cached: false,
      openMeteoWeather,
      openMeteoHistorical,
      openMeteoAirQuality,
      nasaPower,
      nasaNsidc,
      nasaMerra2,
      copernicusDem,
      nasaCmr,
      ncbiPubmed,
      openTopography
    };

    liveSiteCache.set(site.id, { expiresAt: now + CACHE_TTL_MS, data: payload });
    res.json(payload);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  return app;
}

const app = await createApp();

export default app;

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT ?? 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TerraAnalog server running on http://0.0.0.0:${PORT}`);
  });
}
