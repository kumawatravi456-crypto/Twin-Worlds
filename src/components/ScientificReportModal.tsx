import { useMemo } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, X } from 'lucide-react';
import {
  buildScientificCsv,
  buildScientificPdfBlob,
  buildScientificReport
} from '../lib/reportGenerator';
import type {
  EarthAnalogSite,
  LiveSiteTelemetry,
  PlanetaryTarget,
  SiteSimilarityResult
} from '../types/analog';
import { ProvenanceBadge } from './ProvenanceBadge';

interface ScientificReportModalProps {
  open: boolean;
  target: PlanetaryTarget;
  site: EarthAnalogSite;
  similarity: SiteSimilarityResult;
  rank: number;
  live?: LiveSiteTelemetry;
  onClose: () => void;
  onExportJson: () => void;
}

export function ScientificReportModal({
  open,
  target,
  site,
  similarity,
  rank,
  live,
  onClose,
  onExportJson
}: ScientificReportModalProps) {
  const report = useMemo(
    () => buildScientificReport({ target, site, similarity, rank, live }),
    [target, site, similarity, rank, live]
  );

  if (!open) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csv = buildScientificCsv(report);
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `twin-worlds-scientific-${target.id}-${site.id}.csv`
    );
  };

  const handleDownloadPdf = () => {
    const pdfBlob = buildScientificPdfBlob(report);
    triggerDownload(pdfBlob, `twin-worlds-scientific-${target.id}-${site.id}.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="8-Section Scientific Comparison Report"
    >
      <div className="glass-panel-deep rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/25">
        {/* Top Modal Header */}
        <div className="glass-header-bar px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
              8-Section NASA Space Apps Scientific Dossier
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {target.name} ↔ {site.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="glass-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="glass-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-sky-300" />
              JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scientific report"
              className="glass-btn p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable 8-Section Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
          {/* Summary Banner */}
          <div className="glass-box rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div>
              <span className="font-mono text-[10px] uppercase text-slate-400 block">
                Earth Analog Suitability
              </span>
              <span className="font-mono text-2xl font-bold text-white tabular-nums">
                {report.overallAssessment.earthAnalogSuitabilityPct.toFixed(1)}%
              </span>
              <span className="block font-mono text-[10px] text-sky-300">
                Rank #{report.overallAssessment.rank}
              </span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-slate-400 block">
                Independent Data Confidence
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                {report.overallAssessment.dataConfidencePct}%
              </span>
              <span className="block font-mono text-[10px] text-slate-300">
                {report.overallAssessment.availableWeightPct.toFixed(1)}% wt coverage
              </span>
            </div>
            <div className="md:col-span-2 text-[11px] leading-relaxed text-slate-200/90">
              {report.terminologyNote}
            </div>
          </div>

          {/* Section 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="glass-box rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-sky-300">
                <FileText className="w-3.5 h-3.5" />
                1. Planetary Target Overview
              </div>
              <div className="font-semibold text-sm text-white">{report.targetOverview.name}</div>
              <p className="text-slate-300">
                {report.targetOverview.region} · {report.targetOverview.coordinates} · Gravity{' '}
                {report.targetOverview.gravityG}g · Radiation {report.targetOverview.radiationSvPerYear} Sv/yr
              </p>
              <p className="leading-relaxed">{report.targetOverview.missionSummary}</p>
              <div className="text-[11px] text-sky-200">
                <strong>Key Resource:</strong> {report.targetOverview.keyResource}
              </div>
            </section>

            <section className="glass-box rounded-2xl p-4 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                2. Earth Analog Overview
              </div>
              <div className="font-semibold text-sm text-white">{report.earthAnalogOverview.name}</div>
              <p className="text-slate-300">
                {report.earthAnalogOverview.region}, {report.earthAnalogOverview.country} ·{' '}
                {report.earthAnalogOverview.lat.toFixed(3)}°, {report.earthAnalogOverview.lon.toFixed(3)}° · Elev{' '}
                {report.earthAnalogOverview.elevationM} m
              </p>
              <div className="font-mono text-[10px] text-violet-200">
                {report.earthAnalogOverview.classification}
              </div>
              <p className="leading-relaxed">{report.earthAnalogOverview.discoveryRationale}</p>
            </section>
          </div>

          {/* Section 3: 8-Dimension Scientific Comparison */}
          <section className="glass-box rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 font-mono text-[11px] uppercase tracking-wider text-sky-300">
              3. Eight-Dimension Scientific Comparison Matrix
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-white/5 text-slate-300 border-b border-white/10">
                    <th className="py-2.5 px-3">Dimension</th>
                    <th className="py-2.5 px-3">Suitability</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Target Value</th>
                    <th className="py-2.5 px-3">Earth Value</th>
                    <th className="py-2.5 px-3">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {report.dimensionComparison.map((row) => (
                    <tr key={row.axis}>
                      <td className="py-2 px-3 font-medium text-white">{row.label}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-sky-200">
                        {row.available && row.suitabilityScore !== null
                          ? `${row.suitabilityScore.toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums">
                        {row.normalizedWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-emerald-300">
                        {row.confidencePct}%
                      </td>
                      <td className="py-2 px-3 text-slate-200">{row.targetMeasurement}</td>
                      <td className="py-2 px-3 text-slate-200">{row.earthMeasurement}</td>
                      <td className="py-2 px-3">
                        <ProvenanceBadge
                          kind={
                            row.provenance === 'live' ||
                            row.provenance === 'proxy' ||
                            row.provenance === 'unavailable'
                              ? row.provenance
                              : 'archived'
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sections 4 & 5: Similarities & Differences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="glass-box rounded-2xl p-4 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                4. Key Scientific Similarities
              </div>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                {report.similarities.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="glass-box rounded-2xl p-4 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-amber-300">
                5. Key Physical &amp; Compositional Differences
              </div>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                {report.differences.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Section 6: Exploration Applications */}
          <section className="glass-box rounded-2xl p-4 space-y-2.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
              6. Planetary Exploration &amp; Mission Preparation Applications
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.explorationApplications.map((app) => (
                <div key={app.domain} className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <div className="font-semibold text-white">{app.domain}</div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{app.rationale}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7 & 8: Data Sources & Physical Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="glass-box rounded-2xl p-4 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                7. Data Sources &amp; Temporal/Spatial Provenance
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {report.dataSources.map((ds) => (
                  <li key={ds.dimension} className="border-b border-white/10 pb-1.5 last:border-0">
                    <span className="font-semibold text-white">{ds.dimension}:</span>{' '}
                    <span className="text-sky-200">{ds.record.datasetName}</span> ·{' '}
                    <span className="text-slate-300">
                      {ds.record.provider} ({ds.record.spatialResolution}, {ds.record.acquisitionDate})
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-box rounded-2xl p-4 space-y-2 border-amber-300/30">
              <div className="font-mono text-[11px] uppercase tracking-wider text-amber-200">
                8. Confidence &amp; Physical Limitations
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                {report.overallAssessment.methodologyNote}
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-200 leading-relaxed">
                {report.limitationsAndConfidence.physicalLimitations.map((lim) => (
                  <li key={lim}>{lim}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
