import type { ProvenanceKind } from '../types/analog';

interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  detail?: string;
  confidencePct?: number;
}

export function ProvenanceBadge({ kind, detail, confidencePct }: ProvenanceBadgeProps) {
  const confSuffix = typeof confidencePct === 'number' ? ` · ${confidencePct}%` : '';

  if (kind === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-sky-300 whitespace-nowrap"
        title={detail ?? 'Retrieved live from public scientific API'}
      >
        <span aria-hidden="true">●</span>
        <span>
          {detail ?? 'Live API'}
          {confSuffix}
        </span>
      </span>
    );
  }
  if (kind === 'proxy') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-amber-300 whitespace-nowrap"
        title={detail ?? 'Terrestrial proxy metric; physical planetary differences apply'}
      >
        <span aria-hidden="true">▲</span>
        <span>
          {detail ?? 'Proxy'}
          {confSuffix}
        </span>
      </span>
    );
  }
  if (kind === 'unavailable') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-rose-400 whitespace-nowrap"
        title={detail ?? 'External adapter or site assay unavailable — excluded from weighted denominator'}
      >
        <span aria-hidden="true">✕</span>
        <span>{detail ?? 'Unavailable'}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-slate-300 whitespace-nowrap"
      title={detail ?? 'Archived PDS, NSIDC, or peer-reviewed literature baseline'}
    >
      <span aria-hidden="true">◆</span>
      <span>
        {detail ?? 'Archived'}
        {confSuffix}
      </span>
    </span>
  );
}
