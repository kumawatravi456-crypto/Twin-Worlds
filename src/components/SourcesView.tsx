import { useEffect, useState } from 'react';
import { RefreshCw, Server } from 'lucide-react';
import type { AdapterHealthReport, ParameterSourceMapping } from '../types/analog';
import { ProvenanceBadge } from './ProvenanceBadge';

interface BackendSourcesConfig {
  generatedAtUtc: string;
  serverKeys: {
    nasaApiKeyConfigured: boolean;
    nasaApiKeyMode: string;
    nasaEarthdataTokenConfigured: boolean;
    ncbiApiKeyConfigured: boolean;
    openTopographyKeyConfigured: boolean;
  };
  parameters: ParameterSourceMapping[];
}

export function SourcesView() {
  const [report, setReport] = useState<AdapterHealthReport | null>(null);
  const [sourceConfig, setSourceConfig] = useState<BackendSourcesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/status').then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as AdapterHealthReport;
      }),
      fetch('/api/config/sources')
        .then(async (res) => (res.ok ? ((await res.json()) as BackendSourcesConfig) : null))
        .catch(() => null)
    ])
      .then(([statusData, cfgData]) => {
        if (!active) return;
        setReport(statusData);
        setSourceConfig(cfgData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Status check failed');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  return (
    <div className="space-y-6">
      <div className="glass-surface rounded-3xl p-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Data Sources, Backend Connectors &amp; API Configuration
          </h2>
          <p className="text-xs text-slate-200/90 mt-1">
            Modular Express backend integrating NASA PDS API, NASA PDS Orbital Data Explorer, NASA Trek, Open-Meteo Historical, NASA NSIDC, NASA MERRA-2, and NCBI E-utilities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          disabled={loading}
          className="glass-btn inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full self-start md:self-auto whitespace-nowrap cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-check Live Endpoints
        </button>
      </div>

      {/* 8-Parameter Free Data Source Architecture Table */}
      {sourceConfig && (
        <section className="glass-surface rounded-3xl overflow-hidden">
          <div className="glass-header-bar px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-300" />
              <h3 className="text-sm font-semibold text-white">
                8-Parameter Scientific Backend Matrix (Free Data Sources)
              </h3>
            </div>
            <span className="font-mono text-[11px] text-sky-200">
              NASA Key: {sourceConfig.serverKeys.nasaApiKeyMode}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 bg-white/5 text-slate-300">
                  <th className="py-2.5 px-4 font-medium">Parameter</th>
                  <th className="py-2.5 px-4 font-medium">Free Data Source</th>
                  <th className="py-2.5 px-4 font-medium">API Key Required?</th>
                  <th className="py-2.5 px-4 font-medium">Env Config</th>
                  <th className="py-2.5 px-4 font-medium">What Backend Retrieves</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sourceConfig.parameters.map((row) => (
                  <tr key={row.parameter} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white">{row.parameter}</td>
                    <td className="py-2.5 px-4 text-sky-200 font-medium">{row.dataSource}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-200">
                      {row.apiKeyRequired}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                      {row.envVar ?? 'Public'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">{row.retrieves}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Provenance Taxonomy */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-box p-4 rounded-2xl space-y-1.5">
          <ProvenanceBadge kind="live" detail="Live API" />
          <p className="text-xs text-slate-200/90 leading-relaxed">
            Retrieved on demand from NASA PDS API, ODE, Trek, Open-Meteo Historical, NSIDC, MERRA-2, or NCBI PubMed.
          </p>
        </div>
        <div className="glass-box p-4 rounded-2xl space-y-1.5">
          <ProvenanceBadge kind="archived" detail="Archived PDS/Lit" />
          <p className="text-xs text-slate-200/90 leading-relaxed">
            Verified baseline datasets from NASA PDS (LRO/MRO/MSL), NSIDC permafrost records, and peer-reviewed field papers.
          </p>
        </div>
        <div className="glass-box p-4 rounded-2xl space-y-1.5">
          <ProvenanceBadge kind="proxy" detail="Proxy Metric" />
          <p className="text-xs text-slate-200/90 leading-relaxed">
            Earth surrogate metrics (MERRA-2 AOD_55 &amp; CAMS mineral dust) approximating hazard intensity without vacuum electrostatics.
          </p>
        </div>
        <div className="glass-box p-4 rounded-2xl space-y-1.5">
          <ProvenanceBadge kind="unavailable" detail="Unavailable" />
          <p className="text-xs text-slate-200/90 leading-relaxed">
            Shown honestly whenever a key-gated service (e.g., OpenTopography 30m DEM) is unconfigured—never replaced with fake numbers.
          </p>
        </div>
      </section>

      {/* Live Adapter Status Table */}
      <section className="glass-surface rounded-3xl overflow-hidden">
        <div className="glass-header-bar px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Live Backend Endpoint Health</h3>
          {report && (
            <span className="font-mono text-[11px] text-slate-300">
              Checked: {new Date(report.checkedAt).toUTCString()}
            </span>
          )}
        </div>

        {loading && (
          <div className="p-6 text-xs text-slate-200">Probing NASA PDS, ODE, Trek, Open-Meteo, NSIDC, MERRA-2, and NCBI endpoints...</div>
        )}

        {error && (
          <div className="p-6 text-xs text-rose-300">Could not query backend /api/status: {error}</div>
        )}

        {report && !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 bg-white/5 text-slate-300">
                  <th className="py-3 px-4 font-medium">Service Adapter</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Auth / Key</th>
                  <th className="py-3 px-4 font-medium">Endpoint</th>
                  <th className="py-3 px-4 font-medium">Scope &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {report.adapters.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">
                      {a.name}
                      <span className="block text-[11px] font-normal text-slate-300">{a.provider}</span>
                    </td>
                    <td className="py-3 px-4">
                      <ProvenanceBadge kind={a.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {a.requiresKey
                        ? a.keyConfigured
                          ? 'Key configured (server)'
                          : 'Missing server key'
                        : a.keyConfigured
                          ? 'Configured / Public'
                          : 'Public (no key)'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-[240px] truncate">
                      {a.endpoint}
                    </td>
                    <td className="py-3 px-4 text-slate-200 max-w-md">{a.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Methodology & Server Env */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="glass-surface rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Archival Planetary &amp; Polar Credits</h3>
          <ul className="space-y-2 text-xs text-slate-200/90 leading-relaxed">
            <li>
              <strong className="text-white">NASA PDS API &amp; Orbital Data Explorer (ODE):</strong> Live planetary geological bundles and MRO CTX / LRO LROC orbital observations alongside USGS{' '}
              <code className="font-mono text-sky-300">LOLA_bw</code> &amp; <code className="font-mono text-orange-300">MOLA_bw</code> DEM matrices.
            </li>
            <li>
              <strong className="text-white">NASA Solar System Treks:</strong> LRO WAC Lunar Mosaic &amp; Mars Viking / MGS MOLA WMTS elevation &amp; terrain visualization layers.
            </li>
            <li>
              <strong className="text-white">Open-Meteo Historical, NASA NSIDC &amp; MERRA-2:</strong> 365-day historical Earth temperature records, NSIDC snow/glacier/permafrost catalog matching, and MERRA-2 atmospheric dust/AOD_55 diagnostics.
            </li>
            <li>
              <strong className="text-white">Fundamental Physical Limitations:</strong> Earth analogs cannot reproduce lunar 0.165g / Martian 0.38g gravity, lunar 10⁻¹⁰ Pa vacuum, 6 mbar CO₂ convection, or cosmic radiation (~0.24–0.42 Sv/yr).
            </li>
          </ul>
        </section>

        <section className="glass-surface rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Server Environment &amp; Free API Keys (.env)</h3>
          <p className="text-xs text-slate-200/90 leading-relaxed">
            All 8 scientific feeds run with zero paid keys on the Express backend (<code className="font-mono text-sky-300">server/</code>). Optional rate-limit or gated keys belong strictly in server <code className="font-mono text-sky-300">.env</code>:
          </p>
          <pre className="glass-box p-3.5 rounded-2xl font-mono text-[11px] text-slate-100 overflow-x-auto leading-relaxed">
{`# .env.example (copy to .env — server-side only)
NASA_API_KEY="DEMO_KEY"
NASA_EARTHDATA_TOKEN=""     # Optional: NSIDC / MERRA-2 downloads
NCBI_API_KEY=""             # Optional: PubMed 10 req/s quota
OPENTOPOGRAPHY_API_KEY=""   # Optional: 30m COP30 DEM slopes`}
          </pre>
        </section>
      </div>
    </div>
  );
}
