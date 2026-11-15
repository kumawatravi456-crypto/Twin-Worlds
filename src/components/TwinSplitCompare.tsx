import { useCallback, useEffect, useRef, useState } from 'react';
import { Columns2, MoveHorizontal, Radar, ZoomIn, ZoomOut } from 'lucide-react';
import type { EarthAnalogSite, PlanetaryTarget } from '../types/analog';

interface TwinSplitCompareProps {
  target: PlanetaryTarget;
  site: EarthAnalogSite;
  liveElevationM?: number;
  liveTempC?: number;
  scanning: boolean;
  onTriggerScan: () => void;
}

function latLonToWebMercatorTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

function latLonToEquirectangularTrekTile(lat: number, lon: number, zoom: number) {
  // NASA Trek EQ WMTS uses 2:1 equirectangular matrix (cols = 2^(z+1), rows = 2^z)
  const cols = Math.pow(2, zoom + 1);
  const rows = Math.pow(2, zoom);
  const wrappedLon = ((lon + 180) % 360 + 360) % 360;
  const x = Math.floor((wrappedLon / 360) * cols);
  const clampedLat = Math.max(-89, Math.min(89, lat));
  const y = Math.floor(((90 - clampedLat) / 180) * rows);
  return {
    x: Math.max(0, Math.min(cols - 1, x)),
    y: Math.max(0, Math.min(rows - 1, y))
  };
}

export function TwinSplitCompare({
  target,
  site,
  liveElevationM,
  liveTempC,
  scanning,
  onTriggerScan
}: TwinSplitCompareProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sliderPct, setSliderPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [earthTileSource, setEarthTileSource] = useState<'gibs' | 'esri'>('esri');

  // Data-driven default zoom level: steeper/compact craters zoom in closer
  const [zoomOffset, setZoomOffset] = useState<number>(0);

  useEffect(() => {
    const autoOffset = target.typicalSlopeDeg >= 6 || site.geology.craterOrigin ? 1 : 0;
    setZoomOffset(autoOffset);
  }, [target.id, target.typicalSlopeDeg, site.id, site.geology.craterOrigin]);

  const trekZoom = Math.min(4, Math.max(1, 2 + Math.floor(zoomOffset / 2)));
  const opticalScale = 1 + (zoomOffset % 2) * 0.25 + (zoomOffset > 2 ? 0.25 : 0);

  const targetTile = latLonToEquirectangularTrekTile(target.lat, target.lon, trekZoom);
  const targetTileUrl = target.trekWmtsLayerUrl
    .replace('{z}', String(trekZoom))
    .replace('{y}', String(targetTile.y))
    .replace('{x}', String(targetTile.x));

  const earthZoom =
    earthTileSource === 'gibs'
      ? Math.min(9, Math.max(5, 7 + zoomOffset))
      : Math.min(13, Math.max(8, 10 + zoomOffset));
  const earthTile = latLonToWebMercatorTile(site.lat, site.lon, earthZoom);
  const earthTileUrl =
    earthTileSource === 'gibs'
      ? `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-06-01/GoogleMapsCompatible_Level9/${earthZoom}/${earthTile.y}/${earthTile.x}.jpg`
      : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${earthZoom}/${earthTile.y}/${earthTile.x}`;

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPct(Math.max(5, Math.min(95, Number(pct.toFixed(1)))));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromClientX]);

  const accentText = target.body === 'mars' ? 'text-orange-400' : 'text-sky-300';
  const accentBorder = target.body === 'mars' ? 'border-orange-500/40' : 'border-sky-400/40';

  return (
    <div className="glass-surface rounded-3xl overflow-hidden">
      {/* Toolbar */}
      <div className="glass-header-bar flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] tracking-widest uppercase text-sky-300">
            Twin Worlds Orbital Imagery
          </span>
          <span className="text-white/30" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-200">
            NASA Trek ({target.body === 'moon' ? 'Moon' : 'Mars'}) vs. Earth Satellite
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-segmented inline-flex p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => setEarthTileSource('esri')}
              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                earthTileSource === 'esri' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
              }`}
            >
              High-Res Sat
            </button>
            <button
              type="button"
              onClick={() => setEarthTileSource('gibs')}
              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                earthTileSource === 'gibs' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
              }`}
            >
              NASA GIBS
            </button>
          </div>

          <div className="glass-segmented inline-flex items-center p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => setZoomOffset((z) => Math.max(-1, z - 1))}
              disabled={zoomOffset <= -1}
              className="p-1.5 rounded-full text-slate-200 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom out orbital imagery"
              aria-label="Zoom out orbital imagery"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[10px] text-sky-200 tabular-nums">
              Z{trekZoom}/{earthZoom}
            </span>
            <button
              type="button"
              onClick={() => setZoomOffset((z) => Math.min(3, z + 1))}
              disabled={zoomOffset >= 3}
              className="p-1.5 rounded-full text-slate-200 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom in orbital imagery"
              aria-label="Zoom in orbital imagery"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'split' ? 'side-by-side' : 'split'))}
            className="glass-btn inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full cursor-pointer"
          >
            {viewMode === 'split' ? <Columns2 className="w-3.5 h-3.5" /> : <MoveHorizontal className="w-3.5 h-3.5" />}
            {viewMode === 'split' ? 'Side-by-Side' : 'Split Slider'}
          </button>

          <button
            type="button"
            onClick={onTriggerScan}
            className="glass-btn-active inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-mono rounded-full cursor-pointer"
          >
            <Radar className="w-3.5 h-3.5" />
            Run Scan
          </button>
        </div>
      </div>

      {/* Viewport */}
      {viewMode === 'split' ? (
        <div
          ref={containerRef}
          className="relative h-[320px] sm:h-[380px] select-none overflow-hidden bg-[#050811] cursor-ew-resize"
          onPointerDown={(e) => {
            setDragging(true);
            updateFromClientX(e.clientX);
          }}
        >
          {/* RIGHT UNDERLAY: Earth Analog Satellite */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-300"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(56,189,248,0.08), rgba(5,8,17,0.55)), url('${earthTileUrl}')`,
                backgroundColor: '#0B1325',
                transform: `scale(${opticalScale})`
              }}
            />
            {/* Subtle topo crosshair */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-sky-400/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
            </div>
            {/* Right Label */}
            <div className="glass-box absolute bottom-3 right-3 rounded-2xl px-3.5 py-2.5 text-right max-w-[235px]">
              <div className="font-mono text-[10px] tracking-wider uppercase text-sky-300">
                Earth Analog · {site.tier === 'hidden-gem' ? 'Hidden Gem' : 'Well-Known'}
              </div>
              <div className="text-xs font-semibold text-white truncate mt-0.5">{site.name}</div>
              <div className="font-mono text-[11px] tabular-nums text-slate-200 mt-0.5">
                {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°
              </div>
              <div className="font-mono text-[10px] tabular-nums text-slate-300 mt-0.5">
                Elev {liveElevationM ?? site.topography.elevationM} m
                {typeof liveTempC === 'number' ? ` · Live ${liveTempC}°C` : ''}
              </div>
            </div>
          </div>

          {/* LEFT CLIPPED OVERLAY: Moon / Mars Target */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
          >
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-300"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(15,23,42,0.12), rgba(5,8,17,0.58)), url('${targetTileUrl}')`,
                backgroundColor: target.body === 'mars' ? '#2A1208' : '#111827',
                transform: `scale(${opticalScale})`
              }}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className={`w-20 h-20 rounded-full border ${accentBorder} flex items-center justify-center`}>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${target.body === 'mars' ? 'bg-orange-400' : 'bg-slate-200'}`}
                />
              </div>
            </div>
            {/* Left Label */}
            <div
              className={`glass-box absolute bottom-3 left-3 border ${accentBorder} rounded-2xl px-3.5 py-2.5 max-w-[240px]`}
            >
              <div className={`font-mono text-[10px] tracking-wider uppercase ${accentText}`}>
                Target · {target.body === 'moon' ? 'Lunar' : 'Martian'} Surface
              </div>
              <div className="text-xs font-semibold text-white truncate mt-0.5">{target.name}</div>
              <div className="font-mono text-[11px] tabular-nums text-slate-200 mt-0.5">{target.coordinates}</div>
              <div className="font-mono text-[10px] tabular-nums text-slate-300 mt-0.5">
                Rel Elev {target.elevationRelativeM} m · Mean {target.meanTempC}°C
              </div>
            </div>
          </div>

          {/* Draggable Vertical Handle */}
          <div
            style={{ left: `${sliderPct}%` }}
            className="absolute top-0 bottom-0 -translate-x-1/2 w-[2px] bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.8)] pointer-events-none"
          >
            <div
              role="slider"
              tabIndex={0}
              aria-label="Comparison split slider"
              aria-valuemin={5}
              aria-valuemax={95}
              aria-valuenow={Math.round(sliderPct)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setSliderPct((p) => Math.max(5, p - 4));
                if (e.key === 'ArrowRight') setSliderPct((p) => Math.min(95, p + 4));
              }}
              className="pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#050811] border-2 border-sky-400 flex items-center justify-center text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.45)] cursor-ew-resize"
            >
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Mission Scan Beam Overlay */}
          {scanning && (
            <div className="absolute inset-x-0 top-0 h-20 pointer-events-none mission-scan-beam bg-gradient-to-b from-transparent via-sky-400/25 to-transparent border-b border-sky-300/70" />
          )}
        </div>
      ) : (
        /* Side-by-Side Comparison View */
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/15 relative">
          <div className="relative h-[280px] sm:h-[340px] overflow-hidden bg-[#0B1325]/60">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-300"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(15,23,42,0.12), rgba(5,8,17,0.58)), url('${targetTileUrl}')`,
                transform: `scale(${opticalScale})`
              }}
            />
            <div
              className={`glass-box absolute bottom-3 left-3 border ${accentBorder} rounded-2xl px-3.5 py-2.5`}
            >
              <div className={`font-mono text-[10px] tracking-wider uppercase ${accentText}`}>
                Target · {target.body === 'moon' ? 'Moon' : 'Mars'}
              </div>
              <div className="text-xs font-semibold text-white">{target.name}</div>
              <div className="font-mono text-[11px] tabular-nums text-slate-200">{target.coordinates}</div>
            </div>
          </div>

          <div className="relative h-[280px] sm:h-[340px] overflow-hidden bg-[#0B1325]/60">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-300"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(56,189,248,0.08), rgba(5,8,17,0.55)), url('${earthTileUrl}')`,
                transform: `scale(${opticalScale})`
              }}
            />
            <div className="glass-box absolute bottom-3 left-3 rounded-2xl px-3.5 py-2.5">
              <div className="font-mono text-[10px] tracking-wider uppercase text-sky-300">
                Matched Earth Analog
              </div>
              <div className="text-xs font-semibold text-white">{site.name}</div>
              <div className="font-mono text-[11px] tabular-nums text-slate-200">
                {site.lat.toFixed(3)}°, {site.lon.toFixed(3)}°
              </div>
            </div>
          </div>

          {scanning && (
            <div className="absolute inset-x-0 top-0 h-20 pointer-events-none mission-scan-beam bg-gradient-to-b from-transparent via-sky-400/25 to-transparent border-b border-sky-300/70" />
          )}
        </div>
      )}
    </div>
  );
}
