import { getServerApiConfig } from '../config/apiKeys.ts';
import { TtlCache, fetchJsonWithTimeout } from './http.ts';

export interface OpenMeteoHistoricalSummary {
  status: 'live' | 'unavailable';
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
}

const historicalCache = new TtlCache<OpenMeteoHistoricalSummary>(6 * 60 * 60 * 1000);

export async function fetchOpenMeteoHistoricalTemperature(
  lat: number,
  lon: number
): Promise<OpenMeteoHistoricalSummary> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = historicalCache.get(key);
  if (cached) return cached;

  const { endpoints } = getServerApiConfig();
  // End 6 days before today to ensure ERA5/ECMWF historical archive finalization
  const end = new Date(Date.now() - 6 * 86400_000);
  const start = new Date(end.getTime() - 364 * 86400_000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const url = `${endpoints.openMeteoArchive}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(
    4
  )}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=UTC`;

  try {
    const json = await fetchJsonWithTimeout<{
      daily?: {
        temperature_2m_mean?: Array<number | null>;
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
      };
    }>(url, 8000);

    const means = (json?.daily?.temperature_2m_mean ?? []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    );
    const maxs = (json?.daily?.temperature_2m_max ?? []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    );
    const mins = (json?.daily?.temperature_2m_min ?? []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    );
    const precips = (json?.daily?.precipitation_sum ?? []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    );

    if (means.length === 0) {
      throw new Error('Empty daily series returned by Open-Meteo Historical Archive');
    }

    const annualMeanTempC = Number((means.reduce((a, b) => a + b, 0) / means.length).toFixed(1));
    const historicalMinTempC = mins.length > 0 ? Number(Math.min(...mins).toFixed(1)) : undefined;
    const historicalMaxTempC = maxs.length > 0 ? Number(Math.max(...maxs).toFixed(1)) : undefined;

    const rawMaxs = json?.daily?.temperature_2m_max ?? [];
    const rawMins = json?.daily?.temperature_2m_min ?? [];
    const swings: number[] = [];
    for (let i = 0; i < Math.min(rawMaxs.length, rawMins.length); i++) {
      const hi = rawMaxs[i];
      const lo = rawMins[i];
      if (typeof hi === 'number' && typeof lo === 'number') swings.push(hi - lo);
    }
    const meanDiurnalRangeC =
      swings.length > 0 ? Number((swings.reduce((a, b) => a + b, 0) / swings.length).toFixed(1)) : undefined;
    const annualPrecipMm =
      precips.length > 0 ? Number(precips.reduce((a, b) => a + b, 0).toFixed(1)) : undefined;

    const summary: OpenMeteoHistoricalSummary = {
      status: 'live',
      startDate,
      endDate,
      annualMeanTempC,
      historicalMinTempC,
      historicalMaxTempC,
      meanDiurnalRangeC,
      annualPrecipMm,
      daysSampled: means.length,
      sourceUrl: url
    };
    historicalCache.set(key, summary);
    return summary;
  } catch (err) {
    return {
      status: 'unavailable',
      startDate,
      endDate,
      daysSampled: 0,
      sourceUrl: url,
      error: err instanceof Error ? err.message : 'Open-Meteo historical query failed'
    };
  }
}
