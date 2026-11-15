import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Compass,
  Database,
  Globe,
  Layers,
  MapPin,
  Orbit,
  Radio,
  Rocket,
  ShieldCheck,
  Sparkles,
  Thermometer
} from 'lucide-react';
import { PLANETARY_TARGETS } from '../data/planetaryTargets';
import { EARTH_ANALOG_SITES } from '../data/earthAnalogs';
import { AXIS_METADATA, DEFAULT_WEIGHTS, computeSiteSimilarity } from '../lib/scoring';
import type { SiteSimilarityResult } from '../types/analog';
import type { AuthModalMode } from './AuthModal';
import { HeroOrbitalStage } from './HeroOrbitalStage';
import { EarthGlobeHeatmap } from './EarthGlobeHeatmap';
import { SpaceRadarChart } from './SpaceRadarChart';
import { ProvenanceBadge } from './ProvenanceBadge';

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  reducedMotion: boolean;
  isAuthenticated: boolean;
  onEnterExplorer: (targetId?: string, siteId?: string) => void;
  onOpenAuth: (mode: AuthModalMode, reason?: string) => void;
  onActiveSectionChange: (sectionId: string) => void;
}

const ABOUT_BRIDGE_NODES = [
  {
    id: 'geology',
    label: 'Geology & Mineralogy',
    earthMetric: 'Deccan flood basalt, maskelynite & Fe-smectite clays',
    marsMetric: 'Jezero basalt, olivine, smectite clay & carbonate strata',
    detail: 'Matches bedrock mineralogy, volcanic glass, sulfates, and hypervelocity impact breccias.'
  },
  {
    id: 'topography',
    label: 'Terrain & Slope',
    earthMetric: '1.6° – 7.8° mean slope · 0.24 – 0.68 surface roughness',
    marsMetric: '3.9° – 7.8° landing & traverse grades across crater basins',
    detail: 'Evaluates crater morphology, ridge relief, and rover wheel-slip hazards across DEMs.'
  },
  {
    id: 'climate',
    label: 'Climate & Volatiles',
    earthMetric: 'Hyper-arid 2 mm/yr Atacama & −23.4°C Antarctic permafrost',
    marsMetric: '−63°C Martian equator & −233°C lunar Shackleton cold traps',
    detail: 'Scores cold-stress margins, diurnal thermal cycling, aridity, and shallow ice-table depth.'
  },
  {
    id: 'subsurface',
    label: 'Subsurface Habitats',
    earthMetric: '18.5 km Skull Cave tubes & 7.6 km La Corona lava galleries',
    marsMetric: 'Shielded regolith & basaltic lava-tube skylights (0.24–0.42 Sv/yr)',
    detail: 'Identifies intact volcanic tunnels and radiation-shielded construction environments.'
  }
] as const;

const PROBLEM_CARDS = [
  {
    index: '01',
    title: 'Prohibitive Off-World Testing Cost',
    body: 'Launching rovers, drills, and habitats directly to the Moon or Mars leaves zero margin for hardware redesign once in transit.'
  },
  {
    index: '02',
    title: 'Need for Realistic Field Testbeds',
    body: 'Space agencies and research teams require terrestrial proving grounds that replicate real slope grades, regolith dust, and extreme cold.'
  },
  {
    index: '03',
    title: 'Multi-Parameter Complexity',
    body: 'No single Earth site matches another world completely—researchers must weigh mineralogy, roughness, ice stability, and dust simultaneously.'
  },
  {
    index: '04',
    title: 'Fragmented Planetary Datasets',
    body: 'Comparing NASA PDS orbital records against live Earth weather, aerosol dust, and peer-reviewed field biology demands unified scoring.'
  }
] as const;

const CORE_FEATURES = [
  {
    icon: MapPin,
    title: 'Earth Analog Discovery',
    desc: `Explore ${EARTH_ANALOG_SITES.length} peer-reviewed terrestrial analog environments spanning the Arctic, Atacama, Antarctica, Iceland, India, and volcanic rift zones.`
  },
  {
    icon: Layers,
    title: 'Planetary Site Comparison',
    desc: 'Inspect side-by-side terrain splits, coordinate geometry, mineral overlap, and 3D topographic morphing against Moon and Mars landing targets.'
  },
  {
    icon: BarChart3,
    title: 'Multi-Criteria Similarity Scoring',
    desc: 'Rank analogs dynamically using transparent weighted equations across 8 scientific axes with mission-specific engineering presets.'
  },
  {
    icon: Orbit,
    title: 'Interactive 3D Visualization',
    desc: 'Navigate a real JPL Horizons DE441 solar system ephemeris camera, interactive Earth heatmap globe, and real-time terrain morphing stage.'
  },
  {
    icon: Radio,
    title: 'Live Environmental Telemetry',
    desc: 'Pull live Open-Meteo temperatures, 90m elevation, CAMS atmospheric dust proxies, NASA Earthdata CMR hits, and NCBI PubMed literature.'
  },
  {
    icon: ShieldCheck,
    title: 'Scientific Data & Provenance',
    desc: 'Every figure carries explicit Live, Archived, Proxy, or Unavailable verification alongside physical Earth–Moon–Mars analog caveats.'
  }
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: 'Step 01',
    title: 'Select Planetary Destination',
    desc: 'Choose from four curated NASA targets: Moon South Pole Crater Rim, Shackleton Crater Floor, Mars Jezero Crater, or Gale Crater.'
  },
  {
    step: 'Step 02',
    title: 'Discover Earth Analogs',
    desc: 'Screen 12 well-known NASA/ESA proving grounds and lesser-known hidden-gem field sites across every continent.'
  },
  {
    step: 'Step 03',
    title: 'Analyze Scientific Parameters',
    desc: 'Compare geology, slope, roughness, temperature cycling, subsurface ice, dust proxies, lava tubes, and extremophile biology.'
  },
  {
    step: 'Step 04',
    title: 'Calculate Similarity',
    desc: 'Compute normalized 0–100 composite scores across custom engineering weights for ISRU, rover mobility, or subsurface habitats.'
  },
  {
    step: 'Step 05',
    title: 'Explore Results',
    desc: 'Inspect 3D terrain morphing, interactive globe heatmaps, live satellite datasets, and exportable mission patches and JSON reports.'
  }
] as const;

export function LandingPage({
  reducedMotion,
  isAuthenticated,
  onEnterExplorer,
  onOpenAuth,
  onActiveSectionChange
}: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeBridgeId, setActiveBridgeId] = useState<string>(ABOUT_BRIDGE_NODES[0].id);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [selectedDestId, setSelectedDestId] = useState<string>('mars-jezero');
  const [siteFilterTier, setSiteFilterTier] = useState<'featured' | 'all'>('featured');
  const [previewSiteId, setPreviewSiteId] = useState<string>('haughton-crater');
  const [methodologyTargetId, setMethodologyTargetId] = useState<string>('mars-jezero');
  const [methodologySiteId, setMethodologySiteId] = useState<string>('atacama-yungay');

  // Track visible section for navbar highlight
  useEffect(() => {
    const sections = ['hero', 'about', 'features', 'destinations', 'locations', 'methodology'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          const id = visible.target.id;
          if (id === 'hero' || id === 'about' || id === 'features' || id === 'methodology') {
            onActiveSectionChange(id);
          } else if (id === 'destinations' || id === 'locations') {
            onActiveSectionChange('features');
          }
        }
      },
      { threshold: [0.22, 0.45] }
    );

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [onActiveSectionChange]);

  // GSAP ScrollTrigger reveal choreographies
  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.72,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true
            }
          }
        );
      });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const activeBridge = useMemo(
    () => ABOUT_BRIDGE_NODES.find((n) => n.id === activeBridgeId) ?? ABOUT_BRIDGE_NODES[0],
    [activeBridgeId]
  );

  const selectedDestination = useMemo(
    () => PLANETARY_TARGETS.find((t) => t.id === selectedDestId) ?? PLANETARY_TARGETS[2],
    [selectedDestId]
  );

  const marsTargets = useMemo(() => PLANETARY_TARGETS.filter((t) => t.body === 'mars'), []);
  const moonTargets = useMemo(() => PLANETARY_TARGETS.filter((t) => t.body === 'moon'), []);

  // Compute similarity scores for globe preview & methodology interactive radar
  const marsScoresBySite = useMemo(() => {
    const target = PLANETARY_TARGETS.find((t) => t.id === methodologyTargetId) ?? PLANETARY_TARGETS[2];
    const map: Record<string, SiteSimilarityResult> = {};
    for (const s of EARTH_ANALOG_SITES) {
      map[s.id] = computeSiteSimilarity(s, target, DEFAULT_WEIGHTS);
    }
    return map;
  }, [methodologyTargetId]);

  const displayedLocations = useMemo(() => {
    if (siteFilterTier === 'all') return EARTH_ANALOG_SITES;
    return [
      EARTH_ANALOG_SITES.find((s) => s.id === 'haughton-crater')!,
      EARTH_ANALOG_SITES.find((s) => s.id === 'atacama-yungay')!,
      EARTH_ANALOG_SITES.find((s) => s.id === 'lonar-crater')!,
      EARTH_ANALOG_SITES.find((s) => s.id === 'mcmurdo-dry-valleys')!,
      EARTH_ANALOG_SITES.find((s) => s.id === 'askja-dyngjufjoll')!,
      EARTH_ANALOG_SITES.find((s) => s.id === 'lava-beds-nm')!
    ].filter(Boolean);
  }, [siteFilterTier]);

  const methodologyTarget = useMemo(
    () => PLANETARY_TARGETS.find((t) => t.id === methodologyTargetId) ?? PLANETARY_TARGETS[2],
    [methodologyTargetId]
  );
  const methodologySite = useMemo(
    () => EARTH_ANALOG_SITES.find((s) => s.id === methodologySiteId) ?? EARTH_ANALOG_SITES[1],
    [methodologySiteId]
  );
  const methodologyResult = useMemo(
    () => computeSiteSimilarity(methodologySite, methodologyTarget, DEFAULT_WEIGHTS),
    [methodologySite, methodologyTarget]
  );

  const totalDefaultWeight = useMemo(
    () => Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0),
    []
  );

  return (
    <div ref={rootRef} className="relative z-10 text-slate-100">
      {/* =========================================================
          SECTION 1: CINEMATIC FULL-SCREEN 3D HERO
         ========================================================= */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden"
      >
        {/* Soft atmospheric gradient vignette for legibility */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#02050f]/88 via-[#02050f]/48 to-transparent"
          aria-hidden="true"
        />

        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Copy Column */}
          <div className="lg:col-span-6 relative z-10 space-y-6">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.26em] text-sky-300">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Planetary Research Platform · Moon &amp; Mars Analogs</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl font-bold tracking-[-0.03em] leading-[0.98] text-white hero-title-glow">
                TWIN WORLDS
              </h1>

              <p className="font-display text-xl sm:text-2xl font-medium text-sky-200/95 leading-snug max-w-xl">
                Discover Earth&apos;s Hidden Worlds. Explore the Future of Humanity.
              </p>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                An intelligent planetary exploration platform that identifies Earth&apos;s most extreme
                environments and compares them with the geological, climatic, and environmental
                conditions of Mars and the Moon.
              </p>
            </motion.div>

            {/* Primary Hero CTAs */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3.5 pt-1"
            >
              <button
                type="button"
                onClick={() => onEnterExplorer()}
                className="glass-btn-primary px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore the Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#about"
                className="glass-btn px-6 py-3 rounded-full text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Discover Our Mission</span>
              </a>
            </motion.div>

            {/* Compact Real Dataset Telemetry Strip */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="pt-4 grid grid-cols-3 gap-4 max-w-lg border-t border-white/15"
            >
              <div>
                <div className="font-mono text-2xl font-semibold text-white tabular-nums">
                  {EARTH_ANALOG_SITES.length}
                </div>
                <div className="text-[11px] text-slate-400">Earth Analog Sites</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-sky-300 tabular-nums">
                  {PLANETARY_TARGETS.length}
                </div>
                <div className="text-[11px] text-slate-400">Moon &amp; Mars Targets</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-orange-300 tabular-nums">
                  {AXIS_METADATA.length}
                </div>
                <div className="text-[11px] text-slate-400">Scientific Dimensions</div>
              </div>
            </motion.div>
          </div>

          {/* Right Hero 3D Interactive Triad Stage */}
          <div className="lg:col-span-6 relative h-[380px] sm:h-[480px] lg:h-[600px]">
            <HeroOrbitalStage reducedMotion={reducedMotion} />

            {/* Subtle Orbital Coordinate Labels */}
            <div className="pointer-events-none absolute top-6 right-4 glass-box rounded-xl px-3 py-1.5 font-mono text-[10px] text-orange-200">
              MARS · JEZERO / GALE
            </div>
            <div className="pointer-events-none absolute top-10 left-2 glass-box rounded-xl px-3 py-1.5 font-mono text-[10px] text-sky-200">
              LUNA · SOUTH POLE
            </div>
            <div className="pointer-events-none absolute bottom-10 right-6 glass-box rounded-xl px-3 py-1.5 font-mono text-[10px] text-slate-200">
              EARTH · ANALOG NETWORK
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#about"
          aria-label="Scroll to discover Twin Worlds"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.24em]">Scroll</span>
          <motion.span
            animate={reducedMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-7 h-7 rounded-full glass-box flex items-center justify-center"
          >
            <ArrowDown className="w-3.5 h-3.5 text-sky-300" />
          </motion.span>
        </a>
      </section>

      {/* =========================================================
          SECTION 2: ABOUT THE PROJECT
         ========================================================= */}
      <section id="about" className="relative py-24 sm:py-32 px-4 sm:px-6 border-t border-white/10 bg-[#02050f]/65">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div data-reveal className="lg:col-span-5 space-y-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
              About Twin Worlds
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              What is Twin Worlds?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Twin Worlds is an intelligent Earth analog exploration platform that identifies
              terrestrial locations with environmental and geological similarities to planetary
              destinations such as Mars and the Moon.
            </p>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              It evaluates extreme environments across Earth and quantifies how closely they
              resemble extraterrestrial conditions—helping researchers evaluate potential landing
              sites, rover testing environments, ISRU resource exploration opportunities, and future
              human settlement habitats.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              {ABOUT_BRIDGE_NODES.map((node) => {
                const active = node.id === activeBridge.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setActiveBridgeId(node.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active ? 'glass-btn-active' : 'glass-btn'
                    }`}
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Earth-to-Mars Visual Telemetry Connection */}
          <div data-reveal className="lg:col-span-7 glass-panel-deep rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/45 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-sky-300" />
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                    Terrestrial Baseline
                  </div>
                  <div className="text-sm font-semibold text-white">Earth Analog Network</div>
                </div>
              </div>

              <div className="hidden sm:flex items-center flex-1 px-4">
                <div className="h-[2px] w-full bg-gradient-to-r from-sky-400 via-blue-300 to-orange-400 rounded-full relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#060d1e] px-2 font-mono text-[10px] text-sky-200 whitespace-nowrap">
                    ANALOG BRIDGE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-orange-300">
                    Off-World Target
                  </div>
                  <div className="text-sm font-semibold text-white">Mars &amp; Moon</div>
                </div>
                <span className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/45 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-orange-300" />
                </span>
              </div>
            </div>

            <motion.div
              key={activeBridge.id}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="glass-box rounded-2xl p-4 space-y-1.5 border-sky-400/30">
                <div className="font-mono text-[10px] uppercase tracking-wider text-sky-300">
                  Earth Signature · {activeBridge.label}
                </div>
                <div className="text-sm font-medium text-white leading-snug">
                  {activeBridge.earthMetric}
                </div>
              </div>

              <div className="glass-box rounded-2xl p-4 space-y-1.5 border-orange-400/30">
                <div className="font-mono text-[10px] uppercase tracking-wider text-orange-300">
                  Planetary Benchmark
                </div>
                <div className="text-sm font-medium text-white leading-snug">
                  {activeBridge.marsMetric}
                </div>
              </div>
            </motion.div>

            <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-4">
              {activeBridge.detail}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3: THE PROBLEM WE SOLVE
         ========================================================= */}
      <section className="relative py-24 px-4 sm:px-6 border-t border-white/10 bg-[#030714]/75">
        <div className="max-w-[1440px] mx-auto space-y-12">
          <div data-reveal className="max-w-2xl space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
              Mission Challenge
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Understanding Other Worlds Through Earth
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Before hardware ever touches lunar regolith or Martian bedrock, teams must solve four
              coupled engineering and environmental matching challenges here on Earth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {PROBLEM_CARDS.map((card) => (
              <div
                key={card.index}
                data-reveal
                className="glass-panel-deep rounded-3xl p-6 space-y-4 hover:border-sky-400/45 transition-colors"
              >
                <div className="font-mono text-xs text-sky-300 tracking-widest">{card.index}</div>
                <h3 className="font-display text-lg font-semibold text-white leading-snug">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4: CORE FEATURES
         ========================================================= */}
      <section id="features" className="relative py-24 sm:py-28 px-4 sm:px-6 border-t border-white/10 bg-[#02050f]/65">
        <div className="max-w-[1440px] mx-auto space-y-12">
          <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
                Platform Capabilities
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
                Explore the Intelligence Behind Twin Worlds
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onEnterExplorer()}
              className="glass-btn px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 self-start whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Launch Interactive Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {CORE_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  data-reveal
                  className="glass-box glass-box-interactive rounded-3xl p-6 space-y-4"
                >
                  <div className="w-11 h-11 rounded-2xl bg-sky-400/12 border border-sky-300/35 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-sky-300" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5: HOW IT WORKS (5-STEP WORKFLOW)
         ========================================================= */}
      <section className="relative py-24 px-4 sm:px-6 border-t border-white/10 bg-[#030714]/75">
        <div className="max-w-[1440px] mx-auto space-y-10">
          <div data-reveal className="max-w-2xl space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
              Research Workflow
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              From Earth to Another World
            </h2>
          </div>

          <div data-reveal className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
            {HOW_IT_WORKS_STEPS.map((item, idx) => {
              const active = idx === activeStepIdx;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStepIdx(idx)}
                  className={`text-left rounded-3xl p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    active ? 'glass-box-selected-sky' : 'glass-box glass-box-interactive'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                        {item.step}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          active ? 'text-sky-200 translate-x-0.5' : 'text-slate-500'
                        }`}
                      />
                    </div>
                    <h3 className="font-display text-base font-semibold text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 6: PLANETARY DESTINATIONS (MARS & MOON)
         ========================================================= */}
      <section id="destinations" className="relative py-24 sm:py-28 px-4 sm:px-6 border-t border-white/10 bg-[#02050f]/65">
        <div className="max-w-[1440px] mx-auto space-y-10">
          <div data-reveal className="max-w-2xl space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
              Planetary Destinations
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Two Worlds. Endless Possibilities.
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Select a Moon or Mars mission destination below to inspect real NASA PDS orbital
              benchmarks and open it directly inside the Twin Worlds Explorer.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Mars & Moon Cards */}
            <div data-reveal className="lg:col-span-6 space-y-5">
              {/* MARS Group */}
              <div className="glass-panel-deep rounded-3xl p-5 border-orange-400/25 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_12px_#f97316]" />
                    <span className="font-display text-lg font-bold tracking-wide text-white">
                      MARS
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-orange-300">0.379g · 610–740 Pa CO₂</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {marsTargets.map((t) => {
                    const active = t.id === selectedDestination.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedDestId(t.id)}
                        className={`text-left rounded-2xl p-4 cursor-pointer transition-all ${
                          active ? 'glass-box-selected-mars' : 'glass-box glass-box-interactive'
                        }`}
                      >
                        <div className="font-mono text-[10px] text-orange-300 tabular-nums">
                          {t.coordinates}
                        </div>
                        <div className="font-semibold text-sm text-white mt-1">{t.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5 truncate">{t.region}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MOON Group */}
              <div className="glass-panel-deep rounded-3xl p-5 border-sky-400/25 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-sky-300 shadow-[0_0_12px_#38bdf8]" />
                    <span className="font-display text-lg font-bold tracking-wide text-white">
                      MOON
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-sky-300">0.165g · Vacuum / Cold Traps</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {moonTargets.map((t) => {
                    const active = t.id === selectedDestination.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedDestId(t.id)}
                        className={`text-left rounded-2xl p-4 cursor-pointer transition-all ${
                          active ? 'glass-box-selected-sky' : 'glass-box glass-box-interactive'
                        }`}
                      >
                        <div className="font-mono text-[10px] text-sky-300 tabular-nums">
                          {t.coordinates}
                        </div>
                        <div className="font-semibold text-sm text-white mt-1">{t.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5 truncate">{t.region}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Destination Environmental & Mission Detail Panel */}
            <div data-reveal className="lg:col-span-6 glass-panel-deep rounded-3xl p-6 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-4">
                <div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      selectedDestination.body === 'mars' ? 'text-orange-300' : 'text-sky-300'
                    }`}
                  >
                    {selectedDestination.body.toUpperCase()} MISSION TARGET · {selectedDestination.coordinates}
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white mt-1">
                    {selectedDestination.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedDestination.region}</p>
                </div>

                <ProvenanceBadge kind="archived" detail="NASA PDS Record" />
              </div>

              <p className="text-sm text-slate-200 leading-relaxed">
                {selectedDestination.missionSummary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
                <div className="glass-box rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">Mean Temp</span>
                  <span className="text-white font-semibold">{selectedDestination.meanTempC}°C</span>
                </div>
                <div className="glass-box rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">Typical Slope</span>
                  <span className="text-white font-semibold">
                    {selectedDestination.typicalSlopeDeg.toFixed(1)}°
                  </span>
                </div>
                <div className="glass-box rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">Ice Priority</span>
                  <span className="text-sky-300 font-semibold">
                    {selectedDestination.waterIceTargetScore}/100
                  </span>
                </div>
                <div className="glass-box rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">Dust Hazard</span>
                  <span className="text-amber-300 font-semibold">
                    {selectedDestination.dustHazardLevel}/100
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div>
                  <span className="font-semibold text-white">Key Resource: </span>
                  {selectedDestination.keyResource}
                </div>
                <div>
                  <span className="font-semibold text-white">Primary Hazard: </span>
                  {selectedDestination.keyHazard}
                </div>
                <div>
                  <span className="font-semibold text-white">Dominant Minerals: </span>
                  {selectedDestination.dominantMinerals.join(', ')}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-slate-400">
                  {selectedDestination.trekSourceLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onEnterExplorer(selectedDestination.id)}
                  className="glass-btn-primary px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Analyze {selectedDestination.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 7: REAL EARTH ANALOG LOCATIONS & INTERACTIVE GLOBE
         ========================================================= */}
      <section id="locations" className="relative py-24 sm:py-28 px-4 sm:px-6 border-t border-white/10 bg-[#030714]/75">
        <div className="max-w-[1440px] mx-auto space-y-10">
          <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
                Verified Terrestrial Network
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
                Earth Is Our Testing Ground
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                Every location below is sourced from verified planetary geology &amp; polar archives—never
                placeholder data. Click any glowing beacon on the 3D Earth globe or select a field
                site card.
              </p>
            </div>

            <div className="glass-segmented flex items-center gap-1 rounded-full p-1 self-start">
              <button
                type="button"
                onClick={() => setSiteFilterTier('featured')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                  siteFilterTier === 'featured' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                }`}
              >
                Featured (6)
              </button>
              <button
                type="button"
                onClick={() => setSiteFilterTier('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                  siteFilterTier === 'all' ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                }`}
              >
                All Sites ({EARTH_ANALOG_SITES.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Interactive 3D Globe Heatmap */}
            <div data-reveal className="xl:col-span-5">
              <EarthGlobeHeatmap
                sites={EARTH_ANALOG_SITES}
                scores={marsScoresBySite}
                selectedSiteId={previewSiteId}
                onSelectSite={(id) => setPreviewSiteId(id)}
              />
            </div>

            {/* Real Analog Location Cards */}
            <div data-reveal className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedLocations.map((site) => {
                const isSelected = site.id === previewSiteId;
                return (
                  <div
                    key={site.id}
                    onClick={() => setPreviewSiteId(site.id)}
                    className={`rounded-2xl p-4 space-y-2.5 cursor-pointer transition-all ${
                      isSelected ? 'glass-box-selected-sky' : 'glass-box glass-box-interactive'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{site.name}</div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {site.region}, {site.country}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-sky-300 shrink-0 uppercase">
                        {site.primaryTargets.join(' · ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300/95 leading-relaxed line-clamp-2">
                      {site.summary}
                    </p>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-300 tabular-nums">
                      <span>
                        <Thermometer className="w-3 h-3 inline mr-1 text-sky-300" />
                        {site.temperature.archivedAnnualMeanC}°C · {site.topography.elevationM}m
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnterExplorer(selectedDestination.id, site.id);
                        }}
                        className="text-sky-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        Compare <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 8: SCIENTIFIC METHODOLOGY
         ========================================================= */}
      <section id="methodology" className="relative py-24 sm:py-28 px-4 sm:px-6 border-t border-white/10 bg-[#02050f]/75">
        <div className="max-w-[1440px] mx-auto space-y-10">
          <div data-reveal className="max-w-3xl space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300 block">
              Transparent Weighted Evaluation
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Science Behind the Similarity
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Twin Worlds uses a deterministic weighted multi-criteria scoring equation (
              <code className="font-mono text-sky-300">S = &Sigma; (wᵢ / &Sigma;w) &middot; sᵢ</code>
              ) across 8 geophysical and operational axes—never opaque black-box guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Interactive Radar Fingerprint */}
            <div data-reveal className="xl:col-span-5 glass-panel-deep rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-sky-300">
                    Live Radar Preview
                  </span>
                  <h3 className="text-base font-semibold text-white mt-0.5">
                    {methodologySite.name} &harr; {methodologyTarget.name}
                  </h3>
                </div>
                <div className="font-mono text-2xl font-bold text-white tabular-nums">
                  {methodologyResult.compositeScore.toFixed(1)}%
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1">
                    Planetary Target
                  </span>
                  <select
                    value={methodologyTargetId}
                    onChange={(e) => setMethodologyTargetId(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs"
                  >
                    {PLANETARY_TARGETS.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#060c1c] text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1">
                    Earth Analog Site
                  </span>
                  <select
                    value={methodologySiteId}
                    onChange={(e) => setMethodologySiteId(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs"
                  >
                    {EARTH_ANALOG_SITES.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#060c1c] text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="glass-box rounded-2xl p-2">
                <SpaceRadarChart
                  site={methodologySite}
                  result={methodologyResult}
                  accentHex={methodologyTarget.body === 'mars' ? '#F97316' : '#38BDF8'}
                />
              </div>
            </div>

            {/* 8 Scientific Axes Weights & Provenance Taxonomy */}
            <div data-reveal className="xl:col-span-7 space-y-5">
              <div className="glass-panel-deep rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-white">
                    8-Axis Parameter Breakdown &amp; Default Weights
                  </h3>
                  <Database className="w-4 h-4 text-sky-300" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AXIS_METADATA.map((axis) => {
                    const weightVal = DEFAULT_WEIGHTS[axis.key];
                    const weightPct = Math.round((weightVal / totalDefaultWeight) * 100);
                    const scoreVal = methodologyResult.axes[axis.key].rawScore;
                    return (
                      <div key={axis.key} className="glass-box rounded-2xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{axis.label}</span>
                          <span className="font-mono text-[11px] text-sky-300 tabular-nums">
                            {weightPct}% wt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300/90 leading-snug">
                          {axis.description}
                        </p>
                        <div className="pt-1 flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                          <span>Match: {scoreVal !== null ? `${scoreVal.toFixed(1)}/100` : 'N/A'}</span>
                          <ProvenanceBadge kind={methodologyResult.axes[axis.key].provenance} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provenance Taxonomy Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-box rounded-2xl p-3.5 space-y-1.5">
                  <ProvenanceBadge kind="live" detail="Live Feed" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Real-time Open-Meteo, NASA CMR, &amp; JPL Horizons APIs.
                  </p>
                </div>
                <div className="glass-box rounded-2xl p-3.5 space-y-1.5">
                  <ProvenanceBadge kind="archived" detail="Archived PDS" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Verified LRO, MRO, MSL, and peer-reviewed field baselines.
                  </p>
                </div>
                <div className="glass-box rounded-2xl p-3.5 space-y-1.5">
                  <ProvenanceBadge kind="proxy" detail="Dust Proxy" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    CAMS airborne dust proxy noting 1 bar vs. vacuum gap.
                  </p>
                </div>
                <div className="glass-box rounded-2xl p-3.5 space-y-1.5">
                  <ProvenanceBadge kind="unavailable" detail="Keyless Safe" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Honest fallback when optional keys (COP30) are absent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 9: FINAL CALL TO ACTION + FOOTER
         ========================================================= */}
      <section className="relative py-28 sm:py-36 px-4 sm:px-6 border-t border-white/10 overflow-hidden bg-gradient-to-b from-[#02050f]/80 via-[#040c22]/90 to-[#02050f]">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[620px] h-[320px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, #2563eb 50%, transparent 100%)' }}
          aria-hidden="true"
        />

        <div data-reveal className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300">
            <Compass className="w-3.5 h-3.5" />
            <span>Begin Planetary Analog Exploration</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            The Next World Starts With Understanding This One.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Sign in or register to unlock full Mission Control telemetry, split-screen terrain
            sliders, 3D terrain morphing, custom scoring weights, and downloadable mission patches.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onEnterExplorer()}
              className="glass-btn-primary px-7 py-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="glass-btn px-7 py-3.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Your Account
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#02050f]/95 py-8 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Orbit className="w-4 h-4 text-sky-300" />
            <span>Twin Worlds — Earth Analog Explorer</span>
          </div>
          <div className="font-mono text-[11px] text-center sm:text-right">
            Data: NASA PDS (LRO/MRO/MSL) · JPL Horizons DE441 · NASA Earthdata CMR · Open-Meteo · NCBI PubMed
          </div>
        </div>
      </footer>
    </div>
  );
}
