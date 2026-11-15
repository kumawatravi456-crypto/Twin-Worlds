import { useMemo, useState } from 'react';
import {
  Compass,
  FileText,
  Filter,
  Globe,
  Layers,
  Mountain,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import type {
  DiscoveryCandidate,
  DiscoveryScanResponse,
  FeatureWeights,
  PlanetaryTarget
} from '../types/analog';
import { ProvenanceBadge } from './ProvenanceBadge';

interface GlobalDiscoveryPanelProps {
  target: PlanetaryTarget;
  weights: FeatureWeights;
  presetId: string;
  scanResult: DiscoveryScanResponse | null;
  scanning: boolean;
  scanError: string | null;
  selectedSiteId: string;
  onRunScan: () => void;
  onSelectCandidate: (candidate: DiscoveryCandidate, navigateTo?: 'mission' | '3d-globe' | 'report') => void;
}

export function GlobalDiscoveryPanel({
  target,
  scanResult,
  scanning,
  scanError,
  selectedSiteId,
  onRunScan,
  onSelectCandidate
}: GlobalDiscoveryPanelProps) {
  const [countryQuery, setCountryQuery] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [minSuitability, setMinSuitability] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0);
  const [originFilter, setOriginFilter] = useState<'all' | 'discovered' | 'curated'>('all');

  const filteredCandidates = useMemo(() => {
    const list = scanResult?.candidates ?? [];
    const cq = countryQuery.trim().toLowerCase();
    const rq = regionQuery.trim().toLowerCase();
    return list.filter((c) => {
      if (originFilter === 'discovered' && c.isCurated) return false;
      if (originFilter === 'curated' && !c.isCurated) return false;
      if (cq && !c.country.toLowerCase().includes(cq)) return false;
      if (rq && !c.region.toLowerCase().includes(rq) && !c.name.toLowerCase().includes(rq)) return false;
      if (c.similarity.compositeScore < minSuitability) return false;
      if (c.similarity.confidencePct < minConfidence) return false;
      return true;
    });
  }, [scanResult, countryQuery, regionQuery, minSuitability, minConfidence, originFilter]);

  const discoveredTotal = useMemo(
    () => (scanResult?.candidates ?? []).filter((c) => !c.isCurated).length,
    [scanResult]
  );

  return (
    <div className="space-y-5">
      {/* Header & Controls Glass Surface */}
      <section className="glass-surface rounded-3xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                Global Earth Observation Discovery Engine
              </span>
              <ProvenanceBadge
                kind={scanResult ? 'live' : 'archived'}
                detail={scanResult ? `${scanResult.totalCellsEvaluated} Sites Evaluated` : 'Ready to Scan'}
              />
            </div>
            <h2 className="text-xl font-semibold text-white mt-0.5">
              Discover New Earth Analogs for {target.name}
            </h2>
            <p className="text-xs text-slate-200/90 mt-1 max-w-3xl leading-relaxed">
              Evaluates 36 global geographic provinces alongside the 12 curated reference sites using live NASA Langley POWER satellite climatology, Copernicus GLO-90 10×10 DEM slope &amp; Riley TRI, Open-Meteo Forecast, and CAMS dust measurements. Unverified subsurface caves or biology assays are marked unavailable and renormalized transparently.
            </p>
          </div>

          <button
            type="button"
            onClick={onRunScan}
            disabled={scanning}
            className="glass-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap self-start lg:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Querying NASA POWER & COP90 DEM...' : 'Run Global Discovery Scan'}
          </button>
        </div>

        {/* Datasets Used Strip */}
        {scanResult && (
          <div className="glass-box rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2 text-slate-200">
              <Layers className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="font-mono text-sky-200">Active EO Feeds:</span>
              <span>{scanResult.datasetsUsed.join(' · ')}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-300 tabular-nums">
              Scanned UTC: {new Date(scanResult.scannedAtUtc).toUTCString()}
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
              Country Filter
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder="e.g. Canada, Chile, Iran..."
                className="glass-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
              Region / Province
            </span>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                placeholder="e.g. Arctic, Saharan, Basalt..."
                className="glass-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </label>

          <label className="block">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-300 mb-1">
              <span>Min Suitability</span>
              <span className="text-sky-300 tabular-nums">{minSuitability}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={85}
              step={5}
              value={minSuitability}
              onChange={(e) => setMinSuitability(Number(e.target.value))}
              className="w-full h-1.5 mt-2 cursor-pointer"
            />
          </label>

          <label className="block">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-300 mb-1">
              <span>Min Confidence</span>
              <span className="text-emerald-300 tabular-nums">{minConfidence}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={85}
              step={5}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-1.5 mt-2 cursor-pointer"
            />
          </label>

          <div className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 block mb-1">
              Candidate Origin
            </span>
            <div className="glass-segmented grid grid-cols-3 gap-1 rounded-xl p-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'discovered', label: `New (${discoveredTotal})` },
                  { id: 'curated', label: 'Curated' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOriginFilter(opt.id)}
                  className={`py-1 rounded-lg text-[10px] font-medium cursor-pointer ${
                    originFilter === opt.id ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {scanError && (
        <div className="glass-box border-rose-400/50 rounded-2xl p-4 text-xs text-rose-200">
          Global discovery scan failed: {scanError}
        </div>
      )}

      {/* Results Grid */}
      {!scanResult && !scanning && (
        <div className="glass-surface rounded-3xl p-8 text-center space-y-3">
          <Sparkles className="w-7 h-7 text-sky-300 mx-auto" />
          <h3 className="text-base font-semibold text-white">
            Execute a Live Multi-Dataset Global Scan
          </h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            Click <strong className="text-white">Run Global Discovery Scan</strong> above to retrieve live NASA POWER climatology, Copernicus 90m DEM topography matrices, and CAMS dust proxies across 48 global sites for {target.name}.
          </p>
        </div>
      )}

      {scanResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs text-slate-200">
              Showing <strong className="text-white">{filteredCandidates.length}</strong> of{' '}
              {scanResult.totalCellsEvaluated} evaluated planetary analog locations
            </span>
            <span className="font-mono text-[10px] text-slate-300">
              Ranked by Earth Analog Suitability · Data Confidence displayed independently
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCandidates.map((cand, idx) => {
              const isSelected = cand.id === selectedSiteId;
              const sim = cand.similarity;
              const obs = cand.liveObservations;
              return (
                <div
                  key={cand.id}
                  className={`rounded-3xl p-4 flex flex-col justify-between gap-3.5 ${
                    isSelected ? 'glass-box-selected-sky' : 'glass-surface'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-sky-300 tabular-nums">
                            #{idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider border ${
                              cand.isCurated
                                ? 'bg-sky-400/15 text-sky-200 border-sky-300/40'
                                : 'bg-violet-400/15 text-violet-200 border-violet-300/40'
                            }`}
                          >
                            {cand.isCurated ? 'Curated Ref' : 'Discovered Cell'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mt-1 truncate">{cand.name}</h3>
                        <p className="text-[11px] text-slate-300 truncate">
                          {cand.region}, {cand.country} · {cand.lat.toFixed(2)}°, {cand.lon.toFixed(2)}°
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-lg font-bold text-white tabular-nums">
                          {sim.compositeScore.toFixed(1)}%
                        </div>
                        <div className="font-mono text-[10px] text-emerald-300 tabular-nums">
                          Conf {sim.confidencePct}%
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-200/90 leading-snug">
                      <span className="text-sky-200 font-medium">{cand.geologyClass}:</span>{' '}
                      {cand.primaryLithology}
                    </div>

                    {/* Measured Earth Observation Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] tabular-nums">
                      <div className="glass-box rounded-xl px-2 py-1.5">
                        <span className="text-slate-400 block">DEM Slope</span>
                        <span className="text-white">
                          {obs.demSlopeDeg !== null ? `${obs.demSlopeDeg.toFixed(1)}°` : '—'}
                        </span>
                      </div>
                      <div className="glass-box rounded-xl px-2 py-1.5">
                        <span className="text-slate-400 block">Skin Temp</span>
                        <span className="text-white">
                          {obs.skinTempC !== null
                            ? `${obs.skinTempC.toFixed(1)}°C`
                            : obs.currentTempC !== null
                              ? `${obs.currentTempC.toFixed(1)}°C`
                              : '—'}
                        </span>
                      </div>
                      <div className="glass-box rounded-xl px-2 py-1.5">
                        <span className="text-slate-400 block">MODIS AOD</span>
                        <span className="text-amber-200">
                          {obs.modisAod55 !== null
                            ? obs.modisAod55.toFixed(2)
                            : obs.dustUgM3 !== null
                              ? `${obs.dustUgM3.toFixed(0)}µg`
                              : '—'}
                        </span>
                      </div>
                    </div>

                    {sim.unavailableAxes.length > 0 && (
                      <div className="text-[10px] font-mono text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-xl px-2.5 py-1.5">
                        Renormalized ({sim.availableWeightPct.toFixed(0)}% wt coverage): excluded{' '}
                        {sim.unavailableAxes.join(', ')} (unavailable).
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand, 'mission')}
                      className="glass-btn flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer"
                    >
                      <Compass className="w-3 h-3 text-sky-300" />
                      Compare
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand, '3d-globe')}
                      className="glass-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer"
                      title="Inspect Real 3D DEM & Globe"
                    >
                      <Mountain className="w-3 h-3 text-sky-300" />
                      3D DEM
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand, 'report')}
                      className="glass-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer"
                      title="Open 8-Section Scientific Report"
                    >
                      <FileText className="w-3 h-3 text-amber-200" />
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand, '3d-globe')}
                      className="glass-btn p-1.5 rounded-full cursor-pointer"
                      title="Locate on 3D Globe"
                    >
                      <Globe className="w-3 h-3 text-slate-200" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
