import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  Bookmark,
  Compass,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Layers,
  Mountain,
  RefreshCw,
  Satellite,
  Sliders,
  Sparkles,
  Thermometer,
  Wind
} from 'lucide-react';
import { PLANETARY_TARGETS } from './data/planetaryTargets';
import { EARTH_ANALOG_SITES } from './data/earthAnalogs';
import { AXIS_METADATA, DEFAULT_WEIGHTS, WEIGHT_PRESETS, computeSiteSimilarity } from './lib/scoring';
import { buildScientificCsv, buildScientificPdfBlob, buildScientificReport } from './lib/reportGenerator';
import type {
  DiscoveryCandidate,
  DiscoveryScanResponse,
  EarthAnalogSite,
  FeatureAxisKey,
  FeatureWeights,
  LiveSiteTelemetry,
  PlanetaryPdsDossier,
  PlanetaryTarget,
  SiteSimilarityResult,
  SiteTier,
  TargetBody
} from './types/analog';
import { SpaceBackdropCanvas, type SolarFocusMode } from './components/SpaceBackdropCanvas';
import { TwinSplitCompare } from './components/TwinSplitCompare';
import { TerrainMorph3D } from './components/TerrainMorph3D';
import { EarthGlobeHeatmap } from './components/EarthGlobeHeatmap';
import { SpaceRadarChart } from './components/SpaceRadarChart';
import { MissionPatchGenerator } from './components/MissionPatchGenerator';
import { ProvenanceBadge } from './components/ProvenanceBadge';
import { SourcesView } from './components/SourcesView';
import { GlobalDiscoveryPanel } from './components/GlobalDiscoveryPanel';
import {
  PlanetaryLocationFinder,
  type PlanetaryLocationAnalysisResult
} from './components/MoonLocationFinder';
import { ScientificReportModal } from './components/ScientificReportModal';
import { LandingPage } from './components/LandingPage';
import { Navbar, type AppMode, type ExplorerTab } from './components/Navbar';
import { AuthModal, type AuthModalMode } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import {
  SOLAR_PLANETS,
  dateToJulianDate,
  solveKeplerHeliocentricAu,
  type SolarEphemerisReport
} from './lib/solarSystemData';

type ActiveView = ExplorerTab;

interface BatchWeatherSite {
  weatherStatus: 'live' | 'unavailable';
  elevationM?: number;
  currentTempC?: number;
  windSpeedMs?: number;
}

export default function App() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { user, authReady, savedExplorations, saveExploration, removeExploration } = useAuth();

  // Restore shared target & site from URL params when present
  const initialQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('target');
    const s = params.get('site');
    const validTarget = PLANETARY_TARGETS.find((pt) => pt.id === t);
    const validSite = EARTH_ANALOG_SITES.find((es) => es.id === s);
    return {
      hasParams: Boolean(validTarget || validSite),
      targetId: validTarget ? validTarget.id : PLANETARY_TARGETS[0].id,
      siteId: validSite ? validSite.id : null
    };
  }, []);

  const [appMode, setAppMode] = useState<AppMode>('landing');
  const [activeLandingSection, setActiveLandingSection] = useState<string>('hero');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [authRedirectReason, setAuthRedirectReason] = useState<string | null>(null);
  const [pendingExplorerIntent, setPendingExplorerIntent] = useState<{
    tab: ActiveView;
    targetId?: string;
    siteId?: string;
  } | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>('mission');
  const [targetBodyFilter, setTargetBodyFilter] = useState<'all' | TargetBody>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialQuery.targetId);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    initialQuery.siteId ?? 'lonar-crater'
  );
  const [hasManualSiteSelection, setHasManualSiteSelection] = useState<boolean>(
    Boolean(initialQuery.siteId)
  );

  // Filters & ranking scope
  const [tierFilter, setTierFilter] = useState<'all' | SiteTier>('all');
  const [showAllSites, setShowAllSites] = useState(false);

  // Weights state
  const [weights, setWeights] = useState<FeatureWeights>(DEFAULT_WEIGHTS);
  const [activePresetId, setActivePresetId] = useState<string>('balanced');
  const [showInlineWeights, setShowInlineWeights] = useState(false);

  // Visual modes & scan animation
  const [stage3DMode, setStage3DMode] = useState<'terrain' | 'globe'>('terrain');
  const [solarFocus, setSolarFocus] = useState<SolarFocusMode>('overview');
  const [simDaysPerSec, setSimDaysPerSec] = useState<number>(5);
  const [solarEphemeris, setSolarEphemeris] = useState<SolarEphemerisReport | null>(null);
  const [scanning, setScanning] = useState(false);

  // Live telemetry state
  const [batchWeather, setBatchWeather] = useState<Record<string, BatchWeatherSite>>({});
  const [liveSiteCache, setLiveSiteCache] = useState<Record<string, LiveSiteTelemetry>>({});
  const [pdsDossierCache, setPdsDossierCache] = useState<Record<string, PlanetaryPdsDossier>>({});
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Global discovery, custom Moon location finder & scientific report modal state
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryScanResponse | null>(null);
  const [discoveryScanning, setDiscoveryScanning] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveredSitesMap, setDiscoveredSitesMap] = useState<Record<string, EarthAnalogSite>>({});
  const [customMoonTargets, setCustomMoonTargets] = useState<PlanetaryTarget[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const allTargets = useMemo(
    () => [...PLANETARY_TARGETS, ...customMoonTargets],
    [customMoonTargets]
  );

  const activeTarget: PlanetaryTarget = useMemo(
    () => allTargets.find((t) => t.id === selectedTargetId) ?? allTargets[0],
    [allTargets, selectedTargetId]
  );

  const accentHex = activeTarget.body === 'mars' ? '#F97316' : '#38BDF8';

  const visibleTargets = useMemo(() => {
    if (targetBodyFilter === 'all') return allTargets;
    return allTargets.filter((t) => t.body === targetBodyFilter);
  }, [allTargets, targetBodyFilter]);

  // Fetch lightweight batch weather for all 12 sites once on mount
  useEffect(() => {
    let active = true;
    fetch('/api/batch-weather')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sites?: Record<string, BatchWeatherSite> } | null) => {
        if (!active || !data?.sites || Array.isArray(data.sites)) return;
        setBatchWeather(data.sites);
      })
      .catch(() => {
        // Non-fatal; individual live site probe handles detailed telemetry
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch real NASA JPL Horizons DE441 solar system ephemeris
  useEffect(() => {
    let active = true;
    fetch('/api/solar-ephemeris')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SolarEphemerisReport | null) => {
        if (!active || !data?.planets) return;
        setSolarEphemeris(data);
      })
      .catch(() => {
        // Fallback smoothly uses client-side J2000 Keplerian solver
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch live NASA PDS API geology bundles + PDS ODE orbital frames + NASA Trek capabilities for active target
  useEffect(() => {
    if (pdsDossierCache[selectedTargetId]) return;
    if (!PLANETARY_TARGETS.some((t) => t.id === selectedTargetId)) return;
    let active = true;
    fetch(`/api/planetary/${encodeURIComponent(selectedTargetId)}/pds`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PlanetaryPdsDossier | null) => {
        if (!active || !data?.targetId) return;
        setPdsDossierCache((prev) => ({ ...prev, [data.targetId]: data }));
      })
      .catch(() => {
        // Non-fatal; PDS baseline citations still shown
      });
    return () => {
      active = false;
    };
  }, [selectedTargetId, pdsDossierCache]);

  // Unified catalog combining 12 curated sites + any discovered global candidates
  const allKnownSites = useMemo(() => {
    const discoveredList = Object.values(discoveredSitesMap);
    return [...EARTH_ANALOG_SITES, ...discoveredList];
  }, [discoveredSitesMap]);

  // Compute similarity scores across all known sites (curated + discovered)
  const similarityBySite = useMemo(() => {
    const map: Record<string, SiteSimilarityResult> = {};
    for (const site of allKnownSites) {
      map[site.id] = computeSiteSimilarity(site, activeTarget, weights, liveSiteCache[site.id]);
    }
    return map;
  }, [allKnownSites, activeTarget, weights, liveSiteCache]);

  // Ranked sites (optionally filtered by tier)
  const rankedSites = useMemo(() => {
    return allKnownSites
      .filter((site) => (tierFilter === 'all' ? true : site.tier === tierFilter))
      .map((site) => ({
        site,
        similarity: similarityBySite[site.id]
      }))
      .sort((a, b) => b.similarity.compositeScore - a.similarity.compositeScore);
  }, [allKnownSites, similarityBySite, tierFilter]);

  const topFiveRanked = useMemo(() => rankedSites.slice(0, 5), [rankedSites]);
  const displayedRanked = showAllSites ? rankedSites : topFiveRanked;

  // Keep selectedSiteId aligned to rank #1 whenever user switches target (unless manually picked after)
  useEffect(() => {
    if (!hasManualSiteSelection && rankedSites.length > 0) {
      setSelectedSiteId(rankedSites[0].site.id);
    }
  }, [rankedSites, hasManualSiteSelection]);

  const selectedEntry = useMemo(() => {
    const idx = rankedSites.findIndex((r) => r.site.id === selectedSiteId);
    if (idx >= 0) {
      return { site: rankedSites[idx].site, similarity: rankedSites[idx].similarity, rank: idx + 1 };
    }
    const fallbackSite =
      allKnownSites.find((s) => s.id === selectedSiteId) ?? rankedSites[0]?.site ?? EARTH_ANALOG_SITES[0];
    return {
      site: fallbackSite,
      similarity: similarityBySite[fallbackSite.id],
      rank: 1
    };
  }, [rankedSites, allKnownSites, selectedSiteId, similarityBySite]);

  const activeSite: EarthAnalogSite = selectedEntry.site;
  const activeSimilarity: SiteSimilarityResult = selectedEntry.similarity;
  const activeLive = liveSiteCache[activeSite.id];

  // Hydrate full live NASA/Open-Meteo/NCBI telemetry for selected site
  const fetchLiveSiteTelemetry = useCallback(async (siteId: string, force = false) => {
    if (!force && liveSiteCache[siteId]) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/live`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveSiteTelemetry;
      setLiveSiteCache((prev) => ({ ...prev, [siteId]: data }));
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Could not fetch live telemetry');
    } finally {
      setLiveLoading(false);
    }
  }, [liveSiteCache]);

  useEffect(() => {
    if (appMode === 'explorer') {
      fetchLiveSiteTelemetry(activeSite.id);
    }
  }, [appMode, activeSite.id, fetchLiveSiteTelemetry]);

  // Redirect unauthenticated users out of protected Explorer workspace on logout
  useEffect(() => {
    if (authReady && !user && appMode === 'explorer') {
      setAppMode('landing');
      setSolarFocus('overview');
    }
  }, [authReady, user, appMode]);

  const enterExplorerWorkspace = useCallback(
    async (tab: ActiveView = 'mission', targetId?: string, siteId?: string) => {
      if (targetId && PLANETARY_TARGETS.some((t) => t.id === targetId)) {
        setSelectedTargetId(targetId);
        setHasManualSiteSelection(Boolean(siteId));
      }
      if (siteId && EARTH_ANALOG_SITES.some((s) => s.id === siteId)) {
        setSelectedSiteId(siteId);
        setHasManualSiteSelection(true);
      }

      if (!user) {
        setPendingExplorerIntent({ tab, targetId, siteId });
        setAuthRedirectReason(
          'Sign in or create a researcher account to unlock Twin Worlds Mission Control, 3D Terrain Morphing, and Live Telemetry.'
        );
        setAuthModalMode('login');
        setAuthModalOpen(true);
        return;
      }

      setActiveView(tab);
      setAppMode('explorer');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Validate backend session token silently
      try {
        const token = await user.getIdToken();
        await fetch('/api/explorer/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ targetId: targetId ?? selectedTargetId })
        });
      } catch {
        // Non-blocking session log
      }
    },
    [user, selectedTargetId]
  );

  // Honor shared URL params automatically once user is authenticated
  useEffect(() => {
    if (authReady && user && initialQuery.hasParams) {
      setAppMode('explorer');
    }
  }, [authReady, user, initialQuery.hasParams]);

  const handleOpenAuth = useCallback((mode: AuthModalMode, reason?: string) => {
    setAuthModalMode(mode);
    setAuthRedirectReason(reason ?? null);
    setAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    setAuthRedirectReason(null);
    const intent = pendingExplorerIntent;
    setPendingExplorerIntent(null);
    setActiveView(intent?.tab ?? 'mission');
    if (intent?.targetId && PLANETARY_TARGETS.some((t) => t.id === intent.targetId)) {
      setSelectedTargetId(intent.targetId);
      setHasManualSiteSelection(Boolean(intent.siteId));
    }
    if (intent?.siteId && EARTH_ANALOG_SITES.some((s) => s.id === intent.siteId)) {
      setSelectedSiteId(intent.siteId);
      setHasManualSiteSelection(true);
    }
    setAppMode('explorer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingExplorerIntent]);

  const handleNavigateLandingSection = useCallback(
    (sectionId: string) => {
      if (appMode !== 'landing') {
        setAppMode('landing');
        setSolarFocus('overview');
        window.setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }
      setActiveLandingSection(sectionId);
    },
    [appMode]
  );

  const triggerScan = useCallback(() => {
    setScanning(true);
    window.setTimeout(() => setScanning(false), 2600);
  }, []);

  const handleSelectTarget = (targetId: string) => {
    setSelectedTargetId(targetId);
    setHasManualSiteSelection(false);
    const chosen = allTargets.find((t) => t.id === targetId);
    if (chosen) {
      setSolarFocus(chosen.body === 'mars' ? 'mars' : 'moon');
    }
    triggerScan();
  };

  const handleSelectBodyFilter = (body: 'all' | TargetBody) => {
    setTargetBodyFilter(body);
    if (body === 'all') {
      setSolarFocus('overview');
    } else if (activeTarget.body !== body) {
      const firstOfBody = allTargets.find((t) => t.body === body);
      if (firstOfBody) {
        setSelectedTargetId(firstOfBody.id);
        setHasManualSiteSelection(false);
        setSolarFocus(body);
        triggerScan();
      }
    } else {
      setSolarFocus(body);
    }
  };

  const handleSelectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setHasManualSiteSelection(true);
    setSolarFocus('earth');
  };

  const handleWeightChange = (key: FeatureAxisKey, value: number) => {
    setActivePresetId('custom');
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = WEIGHT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setWeights(preset.weights);
  };

  const handleRunGlobalDiscovery = useCallback(async () => {
    setDiscoveryScanning(true);
    setDiscoveryError(null);
    try {
      const isBuiltIn = PLANETARY_TARGETS.some((t) => t.id === activeTarget.id);
      const res = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: activeTarget.id,
          customTarget: isBuiltIn ? undefined : activeTarget,
          presetId: activePresetId === 'custom' ? undefined : activePresetId,
          weights
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DiscoveryScanResponse;
      setDiscoveryResult(data);
      const nextDiscovered: Record<string, EarthAnalogSite> = {};
      data.candidates.forEach((c) => {
        if (!c.isCurated) nextDiscovered[c.id] = c.siteModel;
      });
      setDiscoveredSitesMap(nextDiscovered);
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery scan failed');
    } finally {
      setDiscoveryScanning(false);
    }
  }, [activeTarget, activePresetId, weights]);

  const handleSelectDiscoveryCandidate = useCallback(
    (candidate: DiscoveryCandidate, navigateTo?: 'mission' | '3d-globe' | 'report') => {
      if (!candidate.isCurated) {
        setDiscoveredSitesMap((prev) => ({ ...prev, [candidate.id]: candidate.siteModel }));
      }
      setSelectedSiteId(candidate.id);
      setHasManualSiteSelection(true);
      setSolarFocus('earth');
      if (navigateTo === 'report') {
        setReportModalOpen(true);
      } else if (navigateTo) {
        setActiveView(navigateTo);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const handleApplyPlanetaryAnalysis = useCallback(
    (
      result: PlanetaryLocationAnalysisResult,
      selectedMatch?: DiscoveryCandidate,
      navigateTo?: 'mission' | '3d-globe'
    ) => {
      setCustomMoonTargets((prev) => {
        const filtered = prev.filter((t) => t.id !== result.target.id);
        return [result.target, ...filtered].slice(0, 6);
      });
      if (result.pdsDossier) {
        setPdsDossierCache((prev) => ({
          ...prev,
          [result.target.id]: result.pdsDossier
        }));
      }
      const nextDiscovered: Record<string, EarthAnalogSite> = {};
      result.rankedMatches.forEach((c) => {
        if (!c.isCurated) nextDiscovered[c.id] = c.siteModel;
      });
      setDiscoveredSitesMap((prev) => ({ ...prev, ...nextDiscovered }));
      setTargetBodyFilter((prev) =>
        prev !== 'all' && prev !== result.target.body ? 'all' : prev
      );
      setSelectedTargetId(result.target.id);

      const chosen = selectedMatch ?? result.topEarthMatch;
      if (chosen) {
        setSelectedSiteId(chosen.id);
        setHasManualSiteSelection(true);
      } else {
        setHasManualSiteSelection(false);
      }
      setSolarFocus(result.target.body === 'mars' ? 'mars' : 'moon');
      triggerScan();

      if (navigateTo) {
        setActiveView(navigateTo);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [triggerScan]
  );

  const handleExportReport = useCallback(() => {
    const report = buildScientificReport({
      target: activeTarget,
      site: activeSite,
      similarity: activeSimilarity,
      rank: selectedEntry.rank,
      live: activeLive
    });
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twin-worlds-report-${activeTarget.id}-${activeSite.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTarget, activeSite, activeSimilarity, selectedEntry.rank, activeLive]);

  const handleExportCsv = useCallback(() => {
    const report = buildScientificReport({
      target: activeTarget,
      site: activeSite,
      similarity: activeSimilarity,
      rank: selectedEntry.rank,
      live: activeLive
    });
    const csv = buildScientificCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twin-worlds-scientific-${activeTarget.id}-${activeSite.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTarget, activeSite, activeSimilarity, selectedEntry.rank, activeLive]);

  const handleExportPdf = useCallback(() => {
    const report = buildScientificReport({
      target: activeTarget,
      site: activeSite,
      similarity: activeSimilarity,
      rank: selectedEntry.rank,
      live: activeLive
    });
    const blob = buildScientificPdfBlob(report);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twin-worlds-scientific-${activeTarget.id}-${activeSite.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTarget, activeSite, activeSimilarity, selectedEntry.rank, activeLive]);

  const activeBatch = batchWeather[activeSite.id];
  const liveElev = activeLive?.openMeteoWeather.elevationM ?? activeBatch?.elevationM;
  const liveTemp = activeLive?.openMeteoWeather.currentTempC ?? activeBatch?.currentTempC;

  // Live JPL Horizons DE441 or J2000 Keplerian solar system metrics
  const solarMetrics = useMemo(() => {
    const jdNow = solarEphemeris?.julianDate ?? dateToJulianDate(Date.now());
    const earthEl = SOLAR_PLANETS.find((p) => p.id === 'earth')!;
    const marsEl = SOLAR_PLANETS.find((p) => p.id === 'mars')!;

    const eVec = solarEphemeris?.planets?.earth ?? {
      ...solveKeplerHeliocentricAu(earthEl, jdNow),
      status: 'archived' as const
    };
    const mVec = solarEphemeris?.planets?.mars ?? {
      ...solveKeplerHeliocentricAu(marsEl, jdNow),
      status: 'archived' as const
    };

    const earthMarsAu = Math.hypot(eVec.xAu - mVec.xAu, eVec.yAu - mVec.yAu, eVec.zAu - mVec.zAu);
    const earthMarsMkm = (earthMarsAu * 149.59787).toFixed(1);
    const lightDelayMin = ((earthMarsAu * 499.00478) / 60).toFixed(1);

    return {
      isLiveJpl: solarEphemeris?.source === 'nasa-jpl-horizons',
      earthRangeAu: eVec.rangeAu.toFixed(4),
      earthSpeedKmS: eVec.speedKmS.toFixed(2),
      marsRangeAu: mVec.rangeAu.toFixed(4),
      marsSpeedKmS: mVec.speedKmS.toFixed(2),
      earthMarsAu: earthMarsAu.toFixed(3),
      earthMarsMkm,
      lightDelayMin,
      moonDistKm: solarEphemeris?.moonGeocentric?.distanceKm ?? 384400,
      moonSpeedKmS: solarEphemeris?.moonGeocentric?.speedKmS?.toFixed(2) ?? '1.02'
    };
  }, [solarEphemeris]);

  // Feature-by-feature explicit comparison metrics using upgraded 8-axis model
  const detailedFeatureRows = useMemo(() => {
    return AXIS_METADATA.map((meta) => {
      const detail = activeSimilarity.axes[meta.key];
      return {
        axis: meta.key,
        title: detail.label,
        available: detail.available,
        score: detail.rawScore,
        confidencePct: detail.confidencePct,
        targetValue: detail.targetMeasurement,
        earthValue: detail.earthMeasurement,
        provenance: detail.provenance,
        datasetName: detail.provenanceDetail.datasetName
      };
    });
  }, [activeSimilarity]);

  const activeExplorationMatch = useMemo(
    () =>
      savedExplorations.find(
        (exp) => exp.targetId === activeTarget.id && exp.siteId === activeSite.id
      ),
    [savedExplorations, activeTarget.id, activeSite.id]
  );

  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const handleToggleBookmark = useCallback(async () => {
    if (!user || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      if (activeExplorationMatch) {
        await removeExploration(activeExplorationMatch.id);
      } else {
        await saveExploration(activeTarget.id, activeSite.id, activeSimilarity.compositeScore);
      }
    } finally {
      setBookmarkBusy(false);
    }
  }, [
    user,
    bookmarkBusy,
    activeExplorationMatch,
    removeExploration,
    saveExploration,
    activeTarget.id,
    activeSite.id,
    activeSimilarity.compositeScore
  ]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 relative overflow-x-hidden">
      {/* Animated Revolving Solar System & Data-Driven Planet Zoom Backdrop */}
      <SpaceBackdropCanvas
        targetBody={activeTarget.body}
        solarFocus={appMode === 'landing' ? 'overview' : solarFocus}
        ephemeris={solarEphemeris}
        simDaysPerSec={simDaysPerSec}
        targetSlopeDeg={activeTarget.typicalSlopeDeg}
        earthElevationM={liveElev ?? activeSite.topography.elevationM}
        similarityPct={activeSimilarity.compositeScore}
        reducedMotion={prefersReducedMotion}
      />

      {/* Shared Floating 3-Zone Navigation Bar */}
      <Navbar
        appMode={appMode}
        activeSection={activeLandingSection}
        explorerTab={activeView}
        accentHex={accentHex}
        onNavigateLandingSection={handleNavigateLandingSection}
        onOpenExplorer={(tab) => void enterExplorerWorkspace(tab ?? 'mission')}
        onOpenAuth={handleOpenAuth}
        onExportReport={appMode === 'explorer' ? handleExportReport : undefined}
      />

      {/* Authentication Modal (Sign Up, Login, Forgot Password, Google Sign-In) */}
      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        redirectReason={authRedirectReason}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthRedirectReason(null);
        }}
        onAuthSuccess={handleAuthSuccess}
      />

      {appMode === 'landing' || !user ? (
        <LandingPage
          reducedMotion={prefersReducedMotion}
          isAuthenticated={Boolean(user)}
          onEnterExplorer={(targetId, siteId) =>
            void enterExplorerWorkspace('mission', targetId, siteId)
          }
          onOpenAuth={handleOpenAuth}
          onActiveSectionChange={setActiveLandingSection}
        />
      ) : (
        <main className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 pt-22 pb-10 space-y-6">
          {/* TARGET SELECTION SECTION (Frosted Liquid Glass Column & Boxes) */}
          <section className="glass-surface rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                    Target Selection
                  </span>
                  <ProvenanceBadge kind="archived" detail="NASA PDS / Trek Benchmarks" />
                </div>
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-0.5">
                  Select Moon or Mars Base Destination
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Scientific Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleBookmark()}
                  disabled={bookmarkBusy}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                    activeExplorationMatch ? 'glass-btn-active' : 'glass-btn'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${activeExplorationMatch ? 'fill-sky-300 text-sky-300' : ''}`} />
                  <span>{activeExplorationMatch ? 'Saved Match' : 'Save Match'}</span>
                </button>

            <div className="glass-segmented flex items-center gap-1 rounded-full p-1 self-start">
              {(
                [
                  { id: 'all', label: `All (${allTargets.length})` },
                  { id: 'moon', label: `Moon (${allTargets.filter((t) => t.body === 'moon').length})` },
                  { id: 'mars', label: `Mars (${allTargets.filter((t) => t.body === 'mars').length})` }
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBodyFilter(b.id)}
                  title={
                    b.id === 'moon'
                      ? 'Filter Moon targets and open Custom Moon Location → Earth Twin Finder'
                      : b.id === 'mars'
                        ? 'Filter Mars targets and open Custom Mars Location → Earth Twin Finder'
                        : undefined
                  }
                  className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    targetBodyFilter === b.id
                      ? 'glass-btn-active'
                      : 'text-slate-200/80 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          {(targetBodyFilter === 'moon' || targetBodyFilter === 'mars') && (
            <PlanetaryLocationFinder
              body={targetBodyFilter}
              activePresetId={activePresetId}
              activeWeights={weights}
              onApplyAnalysis={handleApplyPlanetaryAnalysis}
            />
          )}

          {/* Planetary Target Glass Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {visibleTargets.map((target) => {
              const isSelected = target.id === activeTarget.id;
              const isMars = target.body === 'mars';
              const cardClass = isSelected
                ? isMars
                  ? 'glass-box-selected-mars'
                  : 'glass-box-selected-sky'
                : 'glass-box glass-box-interactive';

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleSelectTarget(target.id)}
                  className={`${cardClass} text-left rounded-2xl p-4 cursor-pointer`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        isMars
                          ? 'bg-orange-400/20 text-orange-200 border-orange-300/40'
                          : 'bg-sky-400/20 text-sky-200 border-sky-300/40'
                      }`}
                    >
                      {target.body}
                    </span>
                    <span className="font-mono text-[10px] text-slate-200 tabular-nums">
                      {target.coordinates}
                    </span>
                  </div>
                  <div className="mt-2.5 font-semibold text-sm text-white leading-snug">
                    {target.name}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">{target.region}</div>
                  <div className="mt-3 pt-2.5 border-t border-white/15 grid grid-cols-3 gap-1 font-mono text-[10px] tabular-nums text-slate-100">
                    <div>
                      <span className="text-slate-300/80 block">Mean</span>
                      {target.meanTempC}°C
                    </div>
                    <div>
                      <span className="text-slate-300/80 block">Slope</span>
                      {target.typicalSlopeDeg.toFixed(1)}°
                    </div>
                    <div>
                      <span className="text-slate-300/80 block">Rough</span>
                      {target.roughnessIndex.toFixed(2)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Target Telemetry Glass Strip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTarget.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="glass-box rounded-2xl p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center"
            >
              <div className="lg:col-span-5 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white">{activeTarget.name}</span>
                  <span className="font-mono text-[11px] text-sky-300 tabular-nums">
                    {activeTarget.coordinates}
                  </span>
                </div>
                <p className="text-xs text-slate-200/90 leading-relaxed">{activeTarget.missionSummary}</p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs tabular-nums">
                <div className="glass-box rounded-xl px-3 py-2">
                  <span className="text-[10px] text-slate-300 block">Thermal Range</span>
                  <span className="text-white">
                    {activeTarget.minTempC}..{activeTarget.maxTempC}°C
                  </span>
                </div>
                <div className="glass-box rounded-xl px-3 py-2">
                  <span className="text-[10px] text-slate-300 block">Gravity / Press</span>
                  <span className="text-white">
                    {activeTarget.gravityG}g · {activeTarget.surfacePressurePa < 1 ? 'Vacuum' : `${activeTarget.surfacePressurePa} Pa`}
                  </span>
                </div>
                <div className="glass-box rounded-xl px-3 py-2">
                  <span className="text-[10px] text-slate-300 block">Key Resource</span>
                  <span className="text-sky-200 truncate block" title={activeTarget.keyResource}>
                    {activeTarget.waterIceTargetScore >= 80 ? 'Polar Water Ice' : 'Hydrated Minerals'}
                  </span>
                </div>
                <div className="glass-box rounded-xl px-3 py-2">
                  <span className="text-[10px] text-slate-300 block">Dust Hazard</span>
                  <span className="text-amber-200">{activeTarget.dustHazardLevel}/100</span>
                </div>
              </div>

              {/* Live NASA PDS API Geology & PDS ODE Orbital Imagery Bar */}
              {pdsDossierCache[activeTarget.id] && (
                <div className="lg:col-span-12 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProvenanceBadge
                      kind={pdsDossierCache[activeTarget.id].pdsGeologyApi.status}
                      detail="NASA PDS API"
                    />
                    <span className="text-slate-200">
                      {pdsDossierCache[activeTarget.id].pdsGeologyApi.totalBundlesAvailable.toLocaleString()} PDS4 bundles ·{' '}
                      <span className="text-sky-200">
                        {pdsDossierCache[activeTarget.id].pdsGeologyApi.matchedBundles[0]?.title ?? 'Geological Archive'}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ProvenanceBadge
                      kind={pdsDossierCache[activeTarget.id].pdsOdeOrbital.status}
                      detail="PDS ODE Orbital"
                    />
                    <span className="font-mono text-[10px] text-slate-200">
                      {pdsDossierCache[activeTarget.id].pdsOdeOrbital.observationCount} frames (
                      {pdsDossierCache[activeTarget.id].pdsOdeOrbital.instrumentSummary})
                    </span>
                    <ProvenanceBadge
                      kind={pdsDossierCache[activeTarget.id].nasaTrek.status}
                      detail="NASA Trek WMTS"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Real NASA JPL Horizons DE441 Solar System Ephemeris & Orbital Speed Strip */}
          <div className="glass-box rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2">
                <ProvenanceBadge
                  kind={solarMetrics.isLiveJpl ? 'live' : 'archived'}
                  detail={solarMetrics.isLiveJpl ? 'JPL DE441 Live' : 'J2000 Keplerian'}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300">
                  Real Ephemeris
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[11px] tabular-nums text-slate-100">
                <span>
                  <span className="text-sky-300">Earth</span> {solarMetrics.earthRangeAu} AU · {solarMetrics.earthSpeedKmS} km/s
                </span>
                <span>
                  <span className="text-slate-300">Moon</span> {solarMetrics.moonDistKm.toLocaleString()} km
                </span>
                <span>
                  <span className="text-orange-300">Mars</span> {solarMetrics.marsRangeAu} AU · {solarMetrics.marsSpeedKmS} km/s
                </span>
                <span>
                  <span className="text-amber-200">Earth–Mars</span> {solarMetrics.earthMarsAu} AU ({solarMetrics.earthMarsMkm}M km · {solarMetrics.lightDelayMin}m light)
                </span>
              </div>
            </div>

            <div className="glass-segmented flex items-center gap-1 rounded-full p-0.5 shrink-0">
              {(
                [
                  { rate: 0, label: 'Live Now' },
                  { rate: 5, label: '5 d/s' },
                  { rate: 25, label: '25 d/s' },
                  { rate: 90, label: '90 d/s' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.rate}
                  type="button"
                  onClick={() => setSimDaysPerSec(opt.rate)}
                  className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-medium transition-all cursor-pointer ${
                    simDaysPerSec === opt.rate
                      ? 'glass-btn-active'
                      : 'text-slate-200/80 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* VIEW 1: MISSION CONTROL */}
        {activeView === 'mission' && (
          <div className="space-y-6">
            {/* ROW 1: TOP 5 RANKED EARTH ANALOGS + TWIN WORLDS SPLIT & 3D STAGE */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column (4 cols): Ranked Earth Analog Site Matching */}
              <section className="xl:col-span-4 glass-surface rounded-3xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                      Earth Analog Ranking
                    </span>
                    <h2 className="text-base font-semibold text-white">
                      {showAllSites ? `All ${rankedSites.length} Earth Sites` : 'Top 5 Earth Matches'}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInlineWeights((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer ${
                      showInlineWeights ? 'glass-btn-active' : 'glass-btn'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    Weights
                  </button>
                </div>

                {/* Tier Filter & Top 5 / All Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/15">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-300 mr-0.5" />
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'well-known', label: 'Well-Known' },
                        { id: 'hidden-gem', label: 'Hidden Gems' },
                        ...(Object.keys(discoveredSitesMap).length > 0
                          ? ([{ id: 'discovered-candidate', label: 'Discovered' }] as const)
                          : [])
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTierFilter(t.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                          tierFilter === t.id ? 'glass-btn-active' : 'glass-btn opacity-80 hover:opacity-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllSites((v) => !v)}
                    className="glass-btn px-2.5 py-1 rounded-full font-mono text-[10px] text-sky-200 cursor-pointer"
                  >
                    {showAllSites ? 'Show Top 5' : `View all ${rankedSites.length}`}
                  </button>
                </div>

                {/* Inline Quick Weights Drawer */}
                {showInlineWeights && (
                  <div className="glass-box rounded-2xl p-3 space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {WEIGHT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                            activePresetId === preset.id ? 'glass-btn-active' : 'glass-btn'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {AXIS_METADATA.map((axis) => (
                        <label key={axis.key} className="block">
                          <div className="flex justify-between text-[10px] text-slate-200">
                            <span>{axis.shortLabel}</span>
                            <span className="font-mono tabular-nums text-sky-300">
                              {weights[axis.key]}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={40}
                            value={weights[axis.key]}
                            onChange={(e) => handleWeightChange(axis.key, Number(e.target.value))}
                            className="w-full h-1.5 cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranked Site Glass Cards */}
                <div className="space-y-2.5 max-h-[610px] overflow-y-auto pr-1">
                  {displayedRanked.map((entry, idx) => {
                    const isSelected = entry.site.id === activeSite.id;
                    const bw = batchWeather[entry.site.id];
                    const score = entry.similarity.compositeScore;
                    return (
                      <button
                        key={entry.site.id}
                        type="button"
                        onClick={() => handleSelectSite(entry.site.id)}
                        className={`w-full text-left rounded-2xl p-3.5 cursor-pointer ${
                          isSelected
                            ? 'glass-box-selected-sky'
                            : 'glass-box glass-box-interactive'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-sky-300 tabular-nums">
                                #{idx + 1}
                              </span>
                              <span className="font-medium text-xs text-white truncate">
                                {entry.site.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                              {entry.site.region}, {entry.site.country}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className="font-mono text-sm font-semibold tabular-nums"
                              style={{ color: score >= 75 ? '#7DD3FC' : score >= 60 ? '#FCD34D' : '#E2E8F0' }}
                            >
                              {score.toFixed(1)}%
                            </span>
                            <span className="block font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                              Conf {entry.similarity.confidencePct}%
                            </span>
                            <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-300">
                              {entry.site.tier === 'discovered-candidate'
                                ? 'Discovered'
                                : entry.site.tier === 'hidden-gem'
                                  ? 'Hidden Gem'
                                  : 'Well-Known'}
                            </span>
                          </div>
                        </div>

                        {/* Score progress bar */}
                        <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, score)}%`,
                              backgroundColor: accentHex
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-200/90 tabular-nums">
                          <span>
                            {entry.site.lat.toFixed(2)}°, {entry.site.lon.toFixed(2)}°
                          </span>
                          <span>
                            {bw?.weatherStatus === 'live' && typeof bw.currentTempC === 'number'
                              ? `Live ${bw.currentTempC.toFixed(1)}°C · ${Math.round(bw.elevationM ?? entry.site.topography.elevationM)}m`
                              : `Mean ${entry.site.temperature.archivedAnnualMeanC}°C · ${entry.site.topography.elevationM}m`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Right Column (8 cols): Split Orbital Comparison + Interactive 3D & Globe Stage */}
              <div className="xl:col-span-8 space-y-6">
                <TwinSplitCompare
                  target={activeTarget}
                  site={activeSite}
                  liveElevationM={liveElev}
                  liveTempC={liveTemp}
                  scanning={scanning}
                  onTriggerScan={triggerScan}
                />

                {/* Interactive 3D Terrain Morph OR 3D Earth Globe Heatmap */}
                <section className="space-y-3">
                  <div className="glass-box rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-300" />
                      <h2 className="text-sm font-semibold text-white">
                        Interactive 3D Terrain Morph & Global Analog Heatmap
                      </h2>
                    </div>
                    <div className="glass-segmented flex items-center gap-1 rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => setStage3DMode('terrain')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          stage3DMode === 'terrain' ? 'glass-btn-active' : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        <Mountain className="w-3.5 h-3.5" />
                        3D Terrain Morph
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage3DMode('globe')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          stage3DMode === 'globe' ? 'glass-btn-active' : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        3D Globe Heatmap
                      </button>
                    </div>
                  </div>

                  {stage3DMode === 'terrain' ? (
                    <TerrainMorph3D
                      target={activeTarget}
                      site={activeSite}
                      scanning={scanning}
                      onTriggerScan={triggerScan}
                    />
                  ) : (
                    <EarthGlobeHeatmap
                      sites={allKnownSites}
                      scores={similarityBySite}
                      selectedSiteId={activeSite.id}
                      onSelectSite={handleSelectSite}
                    />
                  )}
                </section>
              </div>
            </div>

            {/* ROW 2: SIMILARITY ANALYSIS, RADAR FINGERPRINT & FEATURE BREAKDOWN */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Radar Fingerprint + Overall Similarity */}
              <div className="xl:col-span-5 glass-surface rounded-3xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                      Similarity Fingerprint
                    </span>
                    <h2 className="text-base font-semibold text-white mt-0.5">
                      #{selectedEntry.rank} {activeSite.name}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Compared against {activeTarget.name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-3xl font-bold text-white tabular-nums">
                      {activeSimilarity.compositeScore.toFixed(1)}%
                    </div>
                    <div className="font-mono text-[11px] text-emerald-300 tabular-nums mt-0.5">
                      Confidence {activeSimilarity.confidencePct}% · {activeSimilarity.availableWeightPct.toFixed(0)}% wt
                    </div>
                    <ProvenanceBadge
                      kind={activeSimilarity.liveAdjusted ? 'live' : 'archived'}
                      detail={activeSimilarity.liveAdjusted ? 'EO Live-Calibrated' : 'Archived Model'}
                    />
                  </div>
                </div>

                <div className="glass-box rounded-2xl p-2">
                  <SpaceRadarChart site={activeSite} result={activeSimilarity} accentHex={accentHex} />
                </div>

                <p className="text-xs text-slate-200/90 leading-relaxed border-t border-white/15 pt-3">
                  {activeSite.discoveryRationale}
                </p>

                <p className="text-[11px] font-mono text-slate-300/90 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
                  {activeSimilarity.methodologyNote}
                </p>

                {/* Use-case applicability */}
                <div className="flex flex-wrap gap-1.5">
                  {activeSite.useCases.map((uc) => (
                    <span
                      key={uc}
                      className="glass-box px-2.5 py-0.5 rounded-full font-mono text-[10px] text-slate-100"
                    >
                      {uc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature-by-Feature Breakdown & Percentage Bars */}
              <div className="xl:col-span-7 glass-surface rounded-3xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                      Eight-Dimension Earth Analog Suitability
                    </span>
                    <h2 className="text-base font-semibold text-white mt-0.5">
                      Measured Target vs. Earth Parameters &amp; Provenance
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="glass-btn px-3 py-1 rounded-full font-mono text-[11px] text-amber-200 cursor-pointer"
                    >
                      Open 8-Section Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('scoring-sources')}
                      className="glass-btn px-3 py-1 rounded-full font-mono text-[11px] text-sky-200 cursor-pointer"
                    >
                      Inspect Formula
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {detailedFeatureRows.map((row) => (
                    <div
                      key={row.axis}
                      className="glass-box rounded-2xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{row.title}</span>
                        <div className="flex items-center gap-2">
                          <ProvenanceBadge kind={row.provenance} confidencePct={row.confidencePct} />
                          <span className="font-mono text-xs font-semibold text-sky-200 tabular-nums">
                            {row.available && row.score !== null ? `${row.score.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${row.available && row.score !== null ? Math.min(100, Math.max(0, row.score)) : 0}%`,
                            backgroundColor: row.available ? accentHex : '#FB7185'
                          }}
                        />
                      </div>

                      <div className="space-y-1 font-mono text-[10px] leading-relaxed">
                        <div className="text-slate-300">
                          <span className="text-slate-400">Target:</span>{' '}
                          <span className="text-white">{row.targetValue}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">Earth:</span>{' '}
                          <span className="text-white">{row.earthValue}</span>
                        </div>
                        <div className="text-slate-400 truncate" title={row.datasetName}>
                          Source: {row.datasetName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ROW 3: LIVE NASA & EARTH TELEMETRY + MISSION PATCH + LIMITATIONS */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Live NASA CMR / Open-Meteo / Dust Proxy / NCBI PubMed + Limitations (7 cols) */}
              <div className="xl:col-span-7 space-y-5">
                <div className="glass-surface rounded-3xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                        Live Satellite & Environmental Feeds
                      </span>
                      <h2 className="text-base font-semibold text-white mt-0.5">
                        Real-Time Telemetry — {activeSite.name}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => fetchLiveSiteTelemetry(activeSite.id, true)}
                      disabled={liveLoading}
                      className="glass-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
                      Refresh Live Feeds
                    </button>
                  </div>

                  {liveError && (
                    <div className="glass-box rounded-2xl border-rose-400/50 p-3 text-xs text-rose-200">
                      Live telemetry request failed: {liveError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* NASA Langley POWER Satellite Climatology */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Satellite className="w-3.5 h-3.5 text-sky-300" />
                          NASA POWER (Skin Temp &amp; MODIS)
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.nasaPower?.status ?? (liveLoading ? 'archived' : 'unavailable')}
                          detail={activeLive?.nasaPower?.status === 'live' ? 'LaRC POWER Live' : undefined}
                        />
                      </div>
                      {activeLive?.nasaPower?.status === 'live' ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-slate-100">
                          <div>
                            <span className="text-slate-300 block">Skin Temp (TS)</span>
                            {activeLive.nasaPower.skinTempC?.toFixed(1) ?? '—'}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">Diurnal Range</span>
                            Δ{activeLive.nasaPower.diurnalRangeC?.toFixed(1) ?? '—'}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">Annual Precip</span>
                            {activeLive.nasaPower.annualPrecipMm?.toFixed(0) ?? '—'} mm/yr
                          </div>
                          <div>
                            <span className="text-slate-300 block">MODIS AOD_55</span>
                            {activeLive.nasaPower.modisAod55?.toFixed(3) ?? '—'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Querying NASA Langley POWER climatology...' : activeLive?.nasaPower?.error ?? 'Awaiting NASA POWER telemetry.'}
                        </p>
                      )}
                    </div>

                    {/* Copernicus GLO-90 10x10 DEM & OpenTopography */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Mountain className="w-3.5 h-3.5 text-sky-300" />
                          Copernicus GLO-90 10×10 DEM
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.copernicusDem?.status ?? (liveLoading ? 'archived' : 'unavailable')}
                          detail={activeLive?.copernicusDem?.status === 'live' ? '90m Grid Live' : undefined}
                        />
                      </div>
                      {activeLive?.copernicusDem?.status === 'live' ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-slate-100">
                          <div>
                            <span className="text-slate-300 block">Mean / Max Slope</span>
                            {activeLive.copernicusDem.meanSlopeDeg?.toFixed(1)}° / {activeLive.copernicusDem.maxSlopeDeg?.toFixed(1)}°
                          </div>
                          <div>
                            <span className="text-slate-300 block">TRI Roughness</span>
                            {activeLive.copernicusDem.roughnessIndex?.toFixed(2)}
                          </div>
                          <div>
                            <span className="text-slate-300 block">Local Relief</span>
                            {activeLive.copernicusDem.reliefM?.toFixed(0)} m
                          </div>
                          <div>
                            <span className="text-slate-300 block">OpenTopography</span>
                            {activeLive.openTopography.status === 'live' ? `${activeLive.openTopography.meanSlopeDeg}° (30m)` : 'Keyless COP90'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Computing 10×10 Copernicus DEM slope & Riley TRI...' : 'Awaiting DEM grid.'}
                        </p>
                      )}
                    </div>

                    {/* Open-Meteo Weather & Elevation */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Thermometer className="w-3.5 h-3.5 text-sky-300" />
                          Open-Meteo Live Weather
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.openMeteoWeather.status ?? (liveLoading ? 'archived' : 'unavailable')}
                          detail={liveLoading && !activeLive ? 'Fetching' : undefined}
                        />
                      </div>
                      {activeLive?.openMeteoWeather.status === 'live' ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-slate-100">
                          <div>
                            <span className="text-slate-300 block">Current Temp</span>
                            {activeLive.openMeteoWeather.currentTempC?.toFixed(1)}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">7-Day Swing</span>
                            Δ{activeLive.openMeteoWeather.observed7DaySwingC?.toFixed(1)}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">Elevation</span>
                            {activeLive.openMeteoWeather.elevationM} m
                          </div>
                          <div>
                            <span className="text-slate-300 block">Wind Speed</span>
                            {activeLive.openMeteoWeather.windSpeedMs?.toFixed(1)} m/s
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading
                            ? 'Querying Open-Meteo live weather...'
                            : activeLive?.openMeteoWeather.error ?? 'Awaiting Open-Meteo telemetry.'}
                        </p>
                      )}
                    </div>

                    {/* Open-Meteo Historical Earth Temperature (365-Day ERA5 Archive) */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Thermometer className="w-3.5 h-3.5 text-sky-300" />
                          Open-Meteo Historical (365d)
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.openMeteoHistorical?.status ?? (liveLoading ? 'archived' : 'unavailable')}
                          detail={activeLive?.openMeteoHistorical?.status === 'live' ? 'ERA5 Archive' : undefined}
                        />
                      </div>
                      {activeLive?.openMeteoHistorical?.status === 'live' ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-slate-100">
                          <div>
                            <span className="text-slate-300 block">365d Mean Temp</span>
                            {activeLive.openMeteoHistorical.annualMeanTempC?.toFixed(1)}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">Hist Min / Max</span>
                            {activeLive.openMeteoHistorical.historicalMinTempC?.toFixed(1)}° /{' '}
                            {activeLive.openMeteoHistorical.historicalMaxTempC?.toFixed(1)}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">Mean Diurnal Δ</span>
                            Δ{activeLive.openMeteoHistorical.meanDiurnalRangeC?.toFixed(1) ?? '—'}°C
                          </div>
                          <div>
                            <span className="text-slate-300 block">365d Precip</span>
                            {activeLive.openMeteoHistorical.annualPrecipMm?.toFixed(0) ?? '—'} mm
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Fetching 365-day historical Earth temperature...' : activeLive?.openMeteoHistorical?.error ?? 'Awaiting Open-Meteo archive.'}
                        </p>
                      )}
                    </div>

                    {/* NASA NSIDC Cryosphere & NASA MERRA-2 Dust */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Globe className="w-3.5 h-3.5 text-cyan-300" />
                          NASA NSIDC &amp; MERRA-2
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.nasaNsidc?.status ?? (liveLoading ? 'archived' : 'unavailable')}
                          detail={activeLive?.nasaNsidc?.status === 'live' ? 'NSIDC + MERRA-2' : undefined}
                        />
                      </div>
                      {activeLive?.nasaNsidc?.status === 'live' ? (
                        <div className="space-y-1.5">
                          <div className="font-mono text-[10px] text-slate-200 tabular-nums">
                            {activeLive.nasaNsidc.collectionsMatched} NSIDC snow/permafrost datasets · MERRA-2{' '}
                            {activeLive.nasaMerra2?.collectionShortName ?? 'M2TMNXAER'}
                          </div>
                          {activeLive.nasaNsidc.datasets.slice(0, 2).map((ds) => (
                            <a
                              key={ds.id}
                              href={ds.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-sky-200 hover:text-white truncate"
                            >
                              <span className="truncate">{ds.shortName}: {ds.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Querying NASA NSIDC & MERRA-2 catalogs...' : activeLive?.nasaNsidc?.error ?? 'Awaiting NSIDC telemetry.'}
                        </p>
                      )}
                    </div>

                    {/* Open-Meteo CAMS Dust Proxy */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Wind className="w-3.5 h-3.5 text-amber-300" />
                          CAMS Atmospheric Dust Proxy
                        </span>
                        <ProvenanceBadge
                          kind={
                            activeLive?.openMeteoAirQuality.status === 'live'
                              ? 'proxy'
                              : activeLive?.openMeteoAirQuality.status ?? 'proxy'
                          }
                          detail="Live Proxy"
                        />
                      </div>
                      {activeLive?.openMeteoAirQuality.status === 'live' ? (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums text-slate-100">
                            <div>
                              <span className="text-slate-300 block">Dust</span>
                              {activeLive.openMeteoAirQuality.dustUgM3?.toFixed(1)} µg/m³
                            </div>
                            <div>
                              <span className="text-slate-300 block">PM10</span>
                              {activeLive.openMeteoAirQuality.pm10UgM3?.toFixed(1)} µg/m³
                            </div>
                            <div>
                              <span className="text-slate-300 block">PM2.5</span>
                              {activeLive.openMeteoAirQuality.pm25UgM3?.toFixed(1)} µg/m³
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-200/90 leading-snug">
                            {activeSite.dust.proxyExplanation}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Loading CAMS mineral dust proxy...' : activeSite.dust.proxyExplanation}
                        </p>
                      )}
                    </div>

                    {/* NASA CMR Earthdata Collections */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Layers className="w-3.5 h-3.5 text-sky-300" />
                          NASA CMR Satellite Datasets
                        </span>
                        <ProvenanceBadge kind={activeLive?.nasaCmr.status ?? 'archived'} />
                      </div>
                      {activeLive?.nasaCmr.status === 'live' ? (
                        <div className="space-y-1.5">
                          <div className="font-mono text-[10px] text-slate-200 tabular-nums">
                            {activeLive.nasaCmr.totalHits.toLocaleString()} EOSDIS collections cover bounding box
                          </div>
                          <ul className="space-y-1">
                            {activeLive.nasaCmr.collections.slice(0, 3).map((col) => (
                              <li key={col.id}>
                                <a
                                  href={col.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-200 hover:text-white truncate max-w-full"
                                >
                                  <span className="truncate">{col.shortName || col.title}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Querying NASA CMR...' : activeLive?.nasaCmr.error ?? 'Awaiting CMR response.'}
                        </p>
                      )}
                    </div>

                    {/* NCBI PubMed Astrobiology Studies */}
                    <div className="glass-box rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                          <Compass className="w-3.5 h-3.5 text-slate-200" />
                          NCBI PubMed Astrobiology
                        </span>
                        <ProvenanceBadge
                          kind={activeLive?.ncbiPubmed.status ?? 'archived'}
                          detail={activeLive?.ncbiPubmed.status === 'live' ? `${activeLive.ncbiPubmed.totalCount} Studies` : undefined}
                        />
                      </div>
                      {activeLive?.ncbiPubmed.status === 'live' ? (
                        <div className="space-y-1">
                          {activeLive.ncbiPubmed.articles.slice(0, 2).map((art) => (
                            <a
                              key={art.pmid}
                              href={art.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-slate-100 hover:text-sky-200 truncate"
                            >
                              <span className="truncate">{art.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                          {activeLive.ncbiPubmed.articles.length === 0 && (
                            <p className="text-[11px] text-slate-300">No PubMed abstracts matched specific site query.</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200">
                          {liveLoading ? 'Searching NCBI PubMed citations...' : activeLive?.ncbiPubmed.error ?? 'Awaiting PubMed response.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explicit Earth-Moon-Mars Physical Limitations Glass Card */}
                <div className="glass-surface rounded-3xl border-amber-300/35 p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <h3 className="text-sm font-semibold">
                      Earth–{activeTarget.body === 'moon' ? 'Moon' : 'Mars'} Physical Limitations for {activeSite.name}
                    </h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200/95 list-disc pl-4 leading-relaxed">
                    {activeSite.limitations.map((lim) => (
                      <li key={lim}>{lim}</li>
                    ))}
                    <li>
                      Radiation & Vacuum Gap: Terrestrial analogs receive ~0.002 Sv/yr under 1 bar magnetosphere shielding, vs.{' '}
                      <span className="font-mono text-amber-200">{activeTarget.radiationSvPerYear} Sv/yr</span> at {activeTarget.name}.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column (5 cols): Downloadable NASA Mission Patch & Share / Report */}
              <div className="xl:col-span-5">
                <MissionPatchGenerator
                  target={activeTarget}
                  site={activeSite}
                  rank={selectedEntry.rank}
                  similarity={activeSimilarity}
                  onExportJson={handleExportReport}
                  onExportCsv={handleExportCsv}
                  onExportPdf={handleExportPdf}
                  onOpenReport={() => setReportModalOpen(true)}
                />
              </div>
            </section>
          </div>
        )}

        {/* VIEW 1B: GLOBAL EARTH ANALOG DISCOVERY */}
        {activeView === 'discovery' && (
          <GlobalDiscoveryPanel
            target={activeTarget}
            weights={weights}
            presetId={activePresetId}
            scanResult={discoveryResult}
            scanning={discoveryScanning}
            scanError={discoveryError}
            selectedSiteId={activeSite.id}
            onRunScan={handleRunGlobalDiscovery}
            onSelectCandidate={handleSelectDiscoveryCandidate}
          />
        )}

        {/* VIEW 2: DEDICATED 3D TERRAIN & INTERACTIVE GLOBE WORKSPACE */}
        {activeView === '3d-globe' && (
          <div className="space-y-6">
            <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                  Spatial Telemetry
                </span>
                <h2 className="text-xl font-semibold text-white">
                  3D Terrain Morphing & Global Similarity Heatmap
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {topFiveRanked.map((entry, idx) => (
                  <button
                    key={entry.site.id}
                    type="button"
                    onClick={() => handleSelectSite(entry.site.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      entry.site.id === activeSite.id ? 'glass-btn-active' : 'glass-btn'
                    }`}
                  >
                    <span className="font-mono text-sky-200 mr-1.5">#{idx + 1}</span>
                    {entry.site.name} ({entry.similarity.compositeScore.toFixed(0)}%)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <TerrainMorph3D
                target={activeTarget}
                site={activeSite}
                scanning={scanning}
                onTriggerScan={triggerScan}
              />
              <EarthGlobeHeatmap
                sites={allKnownSites}
                scores={similarityBySite}
                selectedSiteId={activeSite.id}
                onSelectSite={handleSelectSite}
              />
            </div>

            <TwinSplitCompare
              target={activeTarget}
              site={activeSite}
              liveElevationM={liveElev}
              liveTempC={liveTemp}
              scanning={scanning}
              onTriggerScan={triggerScan}
            />
          </div>
        )}

        {/* VIEW 3: SCORING WEIGHTS, FORMULA & DATA SOURCES */}
        {activeView === 'scoring-sources' && (
          <div className="space-y-8">
            <section className="glass-surface rounded-3xl p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/15">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                    Transparent Multi-Criteria Scoring
                  </span>
                  <h2 className="text-xl font-semibold text-white mt-0.5">
                    Editable Mission Weights & Scoring Formula
                  </h2>
                  <p className="text-xs text-slate-200/90 mt-1">
                    Composite Score S = Σ (wᵢ / Σw) · sᵢ across all 8 planetary analog dimensions. Adjust sliders or select a mission profile to re-rank Earth analogs live.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activePresetId === preset.id ? 'glass-btn-active' : 'glass-btn'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {AXIS_METADATA.map((meta) => {
                  const detail = activeSimilarity.axes[meta.key];
                  return (
                    <div
                      key={meta.key}
                      className="glass-box rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{meta.shortLabel}</span>
                        <span className="font-mono text-xs text-sky-200 tabular-nums">
                          {detail.normalizedWeight.toFixed(1)}% wt
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={weights[meta.key]}
                        onChange={(e) => handleWeightChange(meta.key, Number(e.target.value))}
                        className="w-full h-1.5 cursor-pointer"
                      />
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-200 tabular-nums">
                        <span>
                          Raw:{' '}
                          {detail.available && detail.rawScore !== null
                            ? `${detail.rawScore.toFixed(1)}/100`
                            : 'Unavailable'}
                        </span>
                        <span>+{detail.weightedContribution.toFixed(1)} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-200/85 leading-snug">{detail.formulaNote}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <SourcesView />
          </div>
        )}
      </main>
      )}

      <ScientificReportModal
        open={reportModalOpen}
        target={activeTarget}
        site={activeSite}
        similarity={activeSimilarity}
        rank={selectedEntry.rank}
        live={activeLive}
        onClose={() => setReportModalOpen(false)}
        onExportJson={handleExportReport}
      />
    </div>
  );
}
