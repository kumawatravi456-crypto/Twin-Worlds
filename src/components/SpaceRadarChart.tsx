import { useState } from 'react';
import { AXIS_METADATA } from '../lib/scoring';
import type { EarthAnalogSite, FeatureAxisKey, SiteSimilarityResult } from '../types/analog';

interface SpaceRadarChartProps {
  site: EarthAnalogSite;
  result: SiteSimilarityResult;
  accentHex: string;
}

export function SpaceRadarChart({ site, result, accentHex }: SpaceRadarChartProps) {
  const [hoveredAxis, setHoveredAxis] = useState<FeatureAxisKey | null>(null);

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 112;
  const axes = AXIS_METADATA;
  const count = axes.length;

  const angleFor = (idx: number) => (Math.PI * 2 * idx) / count - Math.PI / 2;

  const pointAt = (idx: number, pct: number) => {
    const a = angleFor(idx);
    const r = (pct / 100) * radius;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const rings = [25, 50, 75, 100];

  const polyPts = axes
    .map((a, idx) => {
      const detail = result.axes[a.key];
      const val = detail.available && detail.rawScore !== null ? detail.rawScore : 0;
      const p = pointAt(idx, val);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const hoveredDetail = hoveredAxis ? result.axes[hoveredAxis] : null;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[330px] h-auto select-none"
        role="img"
        aria-label={`8-axis feature fingerprint radar chart for ${site.name}`}
      >
        {/* Outer target benchmark reference (100% ideal envelope) */}
        {rings.map((ring) => {
          const pts = axes
            .map((_, idx) => {
              const p = pointAt(idx, ring);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <g key={ring}>
              <polygon
                points={pts}
                fill="none"
                stroke={ring === 100 ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.16)'}
                strokeWidth={ring === 100 ? 1.2 : 0.8}
                strokeDasharray={ring === 100 ? '3 3' : undefined}
              />
              <text x={cx + 4} y={cy - (ring / 100) * radius + 10} className="fill-slate-400 font-mono text-[9px]">
                {ring}
              </text>
            </g>
          );
        })}

        {/* Spokes & Axis Labels */}
        {axes.map((axis, idx) => {
          const detail = result.axes[axis.key];
          const outer = pointAt(idx, 100);
          const labelPt = pointAt(idx, 124);
          const isHovered = hoveredAxis === axis.key;
          const anchor = Math.abs(labelPt.x - cx) < 12 ? 'middle' : labelPt.x > cx ? 'start' : 'end';

          return (
            <g
              key={axis.key}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredAxis(axis.key)}
              onMouseLeave={() => setHoveredAxis(null)}
            >
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke={
                  !detail.available
                    ? 'rgba(244, 63, 94, 0.35)'
                    : isHovered
                      ? '#38BDF8'
                      : 'rgba(148, 163, 184, 0.20)'
                }
                strokeDasharray={!detail.available ? '2 2' : undefined}
                strokeWidth={isHovered ? 1.5 : 0.9}
              />
              <text
                x={labelPt.x}
                y={labelPt.y + 3}
                textAnchor={anchor}
                className={`font-mono text-[9.5px] transition-colors ${
                  !detail.available
                    ? 'fill-rose-300/80'
                    : isHovered
                      ? 'fill-[#38BDF8] font-semibold'
                      : 'fill-slate-300'
                }`}
              >
                {axis.shortLabel}
                {!detail.available ? ' (N/A)' : ''}
              </text>
            </g>
          );
        })}

        {/* Earth Match Polygon */}
        <polygon points={polyPts} fill={`${accentHex}28`} stroke={accentHex} strokeWidth={2} />

        {axes.map((axis, idx) => {
          const detail = result.axes[axis.key];
          const val = detail.available && detail.rawScore !== null ? detail.rawScore : 0;
          const p = pointAt(idx, val);
          return (
            <circle
              key={axis.key}
              cx={p.x}
              cy={p.y}
              r={hoveredAxis === axis.key ? 4.5 : 3}
              fill={detail.available ? accentHex : '#FB7185'}
              stroke="#050811"
              strokeWidth={1.2}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredAxis(axis.key)}
              onMouseLeave={() => setHoveredAxis(null)}
            />
          );
        })}
      </svg>

      <div className="w-full mt-2 pt-2.5 border-t border-white/15 text-xs min-h-[38px]">
        {hoveredDetail ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-200 font-medium">{hoveredDetail.label}</span>
            {hoveredDetail.available && hoveredDetail.rawScore !== null ? (
              <span className="font-mono tabular-nums text-[#38BDF8] font-semibold">
                {hoveredDetail.rawScore.toFixed(1)} / 100 · Conf {hoveredDetail.confidencePct}%
              </span>
            ) : (
              <span className="font-mono text-rose-300 font-semibold">
                Unavailable (excluded from denominator)
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-300 text-center">
            Hover radar nodes to probe exact feature suitability & data confidence.
          </p>
        )}
      </div>
    </div>
  );
}
