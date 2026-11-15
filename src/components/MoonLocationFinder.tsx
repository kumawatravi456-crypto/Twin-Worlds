import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Crosshair,
  Globe,
  Loader2,
  MapPin,
  Mountain,
  Search,
  Sparkles
} from 'lucide-react';
import { LUNAR_LANDMARKS } from '../data/lunarGazetteer';
import { MARS_LANDMARKS } from '../data/martianGazetteer';
import { WEIGHT_PRESETS } from '../lib/scoring';
import type {
  DemGridPayload,
  DiscoveryCandidate,
  FeatureWeights,
  PlanetaryPdsDossier,
  PlanetaryTarget,
  TargetBody
} from '../types/analog';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface PlanetaryLocationAnalysisResult {
  analyzedAtUtc: string;
  target: PlanetaryTarget;
  planetaryDem: DemGridPayload;
  moonDem?: DemGridPayload;
  pdsDossier: PlanetaryPdsDossier;
  topEarthMatch: DiscoveryCandidate | null;
  rankedMatches: DiscoveryCandidate[];
  evaluatedEarthSitesCount: number;
}

// Backwards-compatible alias
export type MoonLocationAnalysisResult = PlanetaryLocationAnalysisResult;

interface PlanetaryLocationFinderProps {
  body?: TargetBody;
  activePresetId: string;
  activeWeights: FeatureWeights;
  onApplyAnalysis: (
    result: PlanetaryLocationAnalysisResult,
    selectedMatch?: DiscoveryCandidate,
    navigateTo?: 'mission' | '3d-globe'
  ) => void;
}

export function PlanetaryLocationFinder({
  body = 'moon',
  activePresetId,
  activeWeights,
  onApplyAnalysis
}: PlanetaryLocationFinderProps) {
  const isMars = body === 'mars';
  const landmarks = isMars ? MARS_LANDMARKS : LUNAR_LANDMARKS;
  const defaultLandmark = landmarks[isMars ? 2 : 5]; // Coprates Chasma or Mare Tranquillitatis Pit

  const [latInput, setLatInput] = useState(String(defaultLandmark.lat));
  const [lonInput, setLonInput] = useState(String(defaultLandmark.lon));
  const [labelInput, setLabelInput] = useState(defaultLandmark.name);
  const [landmarkSearch, setLandmarkSearch] = useState('');
  const [presetId, setPresetId] = useState(activePresetId === 'custom' ? 'balanced' : activePresetId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PlanetaryLocationAnalysisResult | null>(null);

  // Reset form defaults cleanly when toggling between Moon and Mars
  useEffect(() => {
    const lm = (body === 'mars' ? MARS_LANDMARKS : LUNAR_LANDMARKS)[body === 'mars' ? 2 : 5];
    setLatInput(String(lm.lat));
    setLonInput(String(lm.lon));
    setLabelInput(lm.name);
    setLandmarkSearch('');
    setError(null);
    setAnalysis(null);
  }, [body]);

  const filteredLandmarks = useMemo(() => {
    const q = landmarkSearch.trim().toLowerCase();
    if (!q) return landmarks;
    return landmarks.filter(
      (lm) =>
        lm.name.toLowerCase().includes(q) ||
        lm.region.toLowerCase().includes(q) ||
        lm.province.toLowerCase().includes(q) ||
        lm.notes.toLowerCase().includes(q)
    );
  }, [landmarks, landmarkSearch]);

  const handlePickLandmark = (lm: (typeof landmarks)[number]) => {
    setLatInput(String(lm.lat));
    setLonInput(String(lm.lon));
    setLabelInput(lm.name);
    setError(null);
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lat = Number(latInput);
    const lon = Number(lonInput);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError(`Enter a valid ${isMars ? 'Mars' : 'Moon'} latitude between -90° and +90°.`);
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setError(`Enter a valid ${isMars ? 'Mars' : 'Moon'} longitude between -180° and +180°.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = isMars ? '/api/mars/analyze-location' : '/api/moon/analyze-location';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          name: labelInput.trim() || undefined,
          presetId: presetId === 'custom' ? undefined : presetId,
          weights: presetId === 'custom' ? activeWeights : undefined
        })
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PlanetaryLocationAnalysisResult;
      setAnalysis(data);
      if (data.topEarthMatch) {
        onApplyAnalysis(data, data.topEarthMatch);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to analyze ${isMars ? 'Mars' : 'Moon'} coordinates`
      );
    } finally {
      setLoading(false);
    }
  };

  const topFive = analysis?.rankedMatches.slice(0, 5) ?? [];
  const demPayload = analysis?.planetaryDem ?? analysis?.moonDem;
  const accentText = isMars ? 'text-orange-300' : 'text-sky-300';
  const accentBorder = isMars ? 'border-orange-400/25' : 'border-sky-400/25';
  const selectedBoxClass = isMars ? 'glass-box-selected-mars' : 'glass-box-selected-sky';
  const planetLabel = isMars ? 'Mars' : 'Moon';
  const demLabel = isMars ? 'MGS MOLA' : 'LRO LOLA';

  return (
    <div className={`glass-box rounded-2xl p-4 sm:p-5 space-y-4 border ${accentBorder}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Crosshair className={`w-3.5 h-3.5 ${accentText}`} />
            <span className={`font-mono text-[10px] uppercase tracking-widest ${accentText}`}>
              Custom {planetLabel} Coordinate → Earth Twin Finder
            </span>
            <ProvenanceBadge kind="live" detail={`USGS ${demLabel} DEM + 48 Earth Sites`} />
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-white mt-0.5">
            Enter Any {planetLabel} Location to Find Its Most Similar Earth Location
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
            {isMars
              ? 'Enter Martian coordinates or pick a Mars landmark. The backend queries live USGS MGS MOLA 48×48 elevation matrices, NASA PDS / MRO CTX orbital frames, and latitude-pressure thermal profiles, then scores all 48 global Earth sites in real time.'
              : 'Enter lunar coordinates or pick a Moon landmark. The backend queries live USGS LRO LOLA 48×48 elevation matrices, NASA PDS / LRO LROC orbital frames, and Diviner thermal profiles, then scores all 48 global Earth sites in real time.'}
          </p>
        </div>
      </div>

      {/* Quick Planetary Gazetteer */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300">
            Quick {isMars ? 'Martian' : 'Lunar'} Gazetteer ({filteredLandmarks.length} {planetLabel} Sites)
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={landmarkSearch}
              onChange={(e) => setLandmarkSearch(e.target.value)}
              placeholder={
                isMars
                  ? 'Search Mars crater, canyon, ice, pit...'
                  : 'Search Moon crater, mare, pit...'
              }
              className="glass-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {filteredLandmarks.map((lm) => {
            const isSelected = Number(latInput) === lm.lat && Number(lonInput) === lm.lon;
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => handlePickLandmark(lm)}
                title={`${lm.region} (${lm.lat}°, ${lm.lon}°) — ${lm.notes}`}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isSelected ? 'glass-btn-active' : 'glass-btn opacity-85 hover:opacity-100'
                }`}
              >
                {lm.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Coordinate & Preset Form */}
      <form onSubmit={handleAnalyze} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        <label className="lg:col-span-2 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
            {planetLabel} Lat (-90..90°)
          </span>
          <input
            type="number"
            step="0.01"
            min={-90}
            max={90}
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            required
            className="glass-input w-full rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
          />
        </label>

        <label className="lg:col-span-2 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
            {planetLabel} Lon (-180..180°)
          </span>
          <input
            type="number"
            step="0.01"
            min={-180}
            max={180}
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            required
            className="glass-input w-full rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
          />
        </label>

        <label className="lg:col-span-3 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
            {planetLabel} Location Label (Optional)
          </span>
          <input
            type="text"
            maxLength={70}
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder={isMars ? 'e.g. Valles Marineris Coprates' : 'e.g. Tycho Central Peak'}
            className="glass-input w-full rounded-xl px-3 py-2 text-xs"
          />
        </label>

        <label className="lg:col-span-2 block">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
            Mission Focus
          </span>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="glass-input w-full rounded-xl px-2.5 py-2 text-xs bg-slate-950/70 text-white"
          >
            {WEIGHT_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="glass-btn-primary w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning {isMars ? 'MOLA' : 'LOLA'} &amp; 48 Earth Sites...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Find Most Similar Earth Site</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Results Spotlight */}
      {analysis && analysis.topEarthMatch && (
        <div className="pt-3 border-t border-white/15 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left 5 cols: Planetary Location Live DEM Telemetry */}
          <div className="lg:col-span-5 glass-surface rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`font-mono text-[10px] uppercase tracking-wider ${accentText}`}>
                  Evaluated {planetLabel} Target
                </span>
                <h3 className="text-sm font-semibold text-white mt-0.5">{analysis.target.name}</h3>
                <p className="text-[11px] text-slate-300">
                  {analysis.target.region} · {analysis.target.coordinates}
                </p>
              </div>
              {demPayload && (
                <ProvenanceBadge
                  kind={demPayload.status}
                  detail={demPayload.status === 'live' ? `${demLabel} Live` : 'Model Fallback'}
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] tabular-nums">
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">{isMars ? 'MOLA Elev' : 'LOLA Elev'}</span>
                <span className="text-white">{analysis.target.elevationRelativeM} m</span>
              </div>
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">Mean Slope</span>
                <span className="text-white">{analysis.target.typicalSlopeDeg.toFixed(1)}°</span>
              </div>
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">Riley TRI</span>
                <span className={accentText}>{analysis.target.roughnessIndex.toFixed(2)}</span>
              </div>
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">Thermal</span>
                <span className="text-white">
                  {analysis.target.minTempC}..{analysis.target.maxTempC}°C
                </span>
              </div>
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">Water Ice</span>
                <span className="text-sky-200">{analysis.target.waterIceTargetScore}/100</span>
              </div>
              <div className="glass-box rounded-xl px-2.5 py-2">
                <span className="text-slate-400 block">{isMars ? 'Pressure' : 'Lava Tube'}</span>
                <span className="text-amber-200">
                  {isMars
                    ? `${analysis.target.surfacePressurePa} Pa`
                    : `${analysis.target.lavaTubeRelevance}/100`}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-200/90 leading-relaxed">
              <span className={`${isMars ? 'text-orange-200' : 'text-sky-200'} font-medium`}>
                Minerals:
              </span>{' '}
              {analysis.target.dominantMinerals.join(', ')}
            </div>
          </div>

          {/* Right 7 cols: #1 Most Similar Earth Location + Top 5 Alternatives */}
          <div className={`lg:col-span-7 ${selectedBoxClass} rounded-2xl p-4 flex flex-col justify-between gap-3`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                    #1 Most Similar Earth Location (Out of {analysis.evaluatedEarthSitesCount} Evaluated)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {analysis.topEarthMatch.name}
                </h3>
                <p className="text-xs text-slate-200 flex items-center gap-1.5">
                  <MapPin className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
                  {analysis.topEarthMatch.region}, {analysis.topEarthMatch.country} ·{' '}
                  <span className="font-mono tabular-nums text-sky-200">
                    {analysis.topEarthMatch.lat.toFixed(2)}°, {analysis.topEarthMatch.lon.toFixed(2)}°
                  </span>
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="font-mono text-2xl font-bold text-white tabular-nums">
                  {analysis.topEarthMatch.similarity.compositeScore.toFixed(1)}%
                </div>
                <div className="font-mono text-[11px] text-emerald-300 tabular-nums">
                  Match · {analysis.topEarthMatch.similarity.confidencePct}% Data Confidence
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-200/90 leading-relaxed">
              <span className="text-sky-200 font-medium">{analysis.topEarthMatch.geologyClass}:</span>{' '}
              {analysis.topEarthMatch.primaryLithology}
            </p>

            {/* Top 5 Earth Matches Strip */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block">
                Top 5 Earth Analog Matches for {analysis.target.name}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                {topFive.map((cand, idx) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => onApplyAnalysis(analysis, cand, 'mission')}
                    className={`text-left rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
                      idx === 0 ? 'glass-btn-active' : 'glass-box hover:border-sky-300/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                      <span className={accentText}>#{idx + 1}</span>
                      <span className="text-white font-semibold tabular-nums">
                        {cand.similarity.compositeScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-white truncate mt-0.5">
                      {cand.name}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">{cand.country}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onApplyAnalysis(analysis, analysis.topEarthMatch ?? undefined, 'mission')}
                className="glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Inspect Full Comparison</span>
              </button>
              <button
                type="button"
                onClick={() => onApplyAnalysis(analysis, analysis.topEarthMatch ?? undefined, '3d-globe')}
                className="glass-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
              >
                <Mountain className={`w-3.5 h-3.5 ${accentText}`} />
                <span>View 3D {isMars ? 'MOLA' : 'LOLA'} Terrain &amp; Globe</span>
              </button>
              <button
                type="button"
                onClick={() => onApplyAnalysis(analysis, analysis.topEarthMatch ?? undefined, '3d-globe')}
                className="glass-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-300" />
                <span>Locate {analysis.topEarthMatch.country}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Preserve MoonLocationFinder export name for clean compatibility
export const MoonLocationFinder = PlanetaryLocationFinder;
