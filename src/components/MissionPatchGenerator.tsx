import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileJson, FileSpreadsheet, FileText, Share2 } from 'lucide-react';
import type { EarthAnalogSite, PlanetaryTarget, SiteSimilarityResult } from '../types/analog';

interface MissionPatchGeneratorProps {
  target: PlanetaryTarget;
  site: EarthAnalogSite;
  rank: number;
  similarity: SiteSimilarityResult;
  onExportJson: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onOpenReport?: () => void;
}

export function MissionPatchGenerator({
  target,
  site,
  rank,
  similarity,
  onExportJson,
  onExportCsv,
  onExportPdf,
  onOpenReport
}: MissionPatchGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 600;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    const accent = target.body === 'mars' ? '#F97316' : '#38BDF8';
    ctx.beginPath();
    ctx.arc(cx, cy, 272, 0, Math.PI * 2);
    ctx.fillStyle = '#0A1124';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 256, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();

    for (let i = 0; i < 65; i++) {
      const a = i * 2.3999;
      const r = Math.sqrt(i / 65) * 235;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      ctx.fillStyle = i % 5 === 0 ? accent : 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(sx, sy, i % 7 === 0 ? 2.1 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx - 56, cy - 18, 76, 0, Math.PI * 2);
    const gradTarget = ctx.createRadialGradient(cx - 78, cy - 42, 10, cx - 56, cy - 18, 76);
    if (target.body === 'mars') {
      gradTarget.addColorStop(0, '#FB923C');
      gradTarget.addColorStop(1, '#7C2D12');
    } else {
      gradTarget.addColorStop(0, '#E2E8F0');
      gradTarget.addColorStop(1, '#475569');
    }
    ctx.fillStyle = gradTarget;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + 56, cy - 18, 76, 0, Math.PI * 2);
    const gradEarth = ctx.createRadialGradient(cx + 34, cy - 42, 10, cx + 56, cy - 18, 76);
    gradEarth.addColorStop(0, '#38BDF8');
    gradEarth.addColorStop(0.65, '#0369A1');
    gradEarth.addColorStop(1, '#082F49');
    ctx.fillStyle = gradEarth;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 165, 48, -0.18, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TWIN WORLDS // NASA ANALOG', cx, 98);

    ctx.fillStyle = accent;
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(target.name.toUpperCase(), cx, 126);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 48px "JetBrains Mono", monospace';
    ctx.fillText(`${similarity.compositeScore.toFixed(1)}%`, cx, cy + 120);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    const tierBadge =
      site.tier === 'discovered-candidate'
        ? 'DISCOVERED'
        : site.tier === 'hidden-gem'
          ? 'HIDDEN GEM'
          : 'WELL-KNOWN';
    ctx.fillText(`RANK #${rank} · ${tierBadge} · CONF ${similarity.confidencePct}%`, cx, cy + 148);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    const shortSite = site.name.length > 28 ? `${site.name.slice(0, 26)}…` : site.name;
    ctx.fillText(shortSite, cx, cy + 184);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 13px "JetBrains Mono", monospace';
    ctx.fillText(`${site.lat.toFixed(2)}°, ${site.lon.toFixed(2)}° · ${site.country.toUpperCase()}`, cx, cy + 210);
  }, [target, site, rank, similarity]);

  const handleDownloadPatch = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `twin-worlds-patch-${target.id}-${site.id}.png`;
    a.click();
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('target', target.id);
    url.searchParams.set('site', site.id);
    const shareText = `Twin Worlds Analog Match: ${target.name} ↔ ${site.name} (${similarity.compositeScore.toFixed(
      1
    )}% suitability, ${similarity.confidencePct}% confidence, Rank #${rank}) — ${url.toString()}`;

    try {
      await navigator.clipboard.writeText(shareText);
      window.history.replaceState({}, '', url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.history.replaceState({}, '', url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="glass-surface rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-6">
      <div className="shrink-0">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-white/30 shadow-[0_0_32px_rgba(56,189,248,0.2)]"
        />
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-sky-300">
            Mission Patch &amp; Scientific Report
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            {target.name} ↔ {site.name}
          </h3>
          <p className="text-xs text-slate-200/90 mt-1 leading-relaxed">
            Inspect the 8-section scientific dossier or export calibrated PDF, CSV, JSON, and PNG mission artifacts.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Scientific Report
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="glass-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-300" />
              PDF
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="glass-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              CSV
            </button>
          )}

          <button
            type="button"
            onClick={onExportJson}
            className="glass-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>

          <button
            type="button"
            onClick={handleDownloadPatch}
            className="glass-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Patch PNG
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="glass-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
