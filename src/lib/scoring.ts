import type {
  AxisScoreDetail,
  EarthAnalogSite,
  FeatureAxisKey,
  FeatureWeights,
  LiveSiteTelemetry,
  PlanetaryTarget,
  ProvenanceKind,
  ProvenanceRecord,
  SiteSimilarityResult
} from '../types/analog';

export const AXIS_METADATA: Array<{
  key: FeatureAxisKey;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    key: 'geology',
    label: 'Geology & Mineralogy',
    shortLabel: 'Geology',
    description:
      'Weighted mineral overlap (Sorensen-Dice + diagnostic planetary minerals) and crater/volcanic lithology process matching.'
  },
  {
    key: 'topography',
    label: 'Topography & Relief',
    shortLabel: 'Topography',
    description:
      'Gaussian distance decay over real DEM mean slope (°), Riley TRI roughness index, and crater-morphology fidelity.'
  },
  {
    key: 'temperature',
    label: 'Temperature & Diurnal Swing',
    shortLabel: 'Thermal',
    description:
      'NASA POWER surface skin temperature (TS) / air thermal stress & observed diurnal cycling vs. planetary regolith regime.'
  },
  {
    key: 'waterIce',
    label: 'Water, Ice & Volatiles',
    shortLabel: 'Water/Ice',
    description:
      'Cryogenic permafrost/ice-table mechanism fit, hydrated mineral abundance, and precipitation scarcity penalty.'
  },
  {
    key: 'dust',
    label: 'Dust & Regolith Hazard (Proxy)',
    shortLabel: 'Dust Proxy',
    description:
      'Abrasive regolith hazard combined with NASA MODIS AOD_55 & CAMS atmospheric mineral dust proxy.'
  },
  {
    key: 'cavesTubes',
    label: 'Caves & Lava Tubes',
    shortLabel: 'Lava Tubes',
    description:
      'Verified subterranean basaltic lava tubes and skylight voids for cosmic radiation shielding.'
  },
  {
    key: 'biology',
    label: 'Biology & Extremophiles',
    shortLabel: 'Biology',
    description:
      'Extremophile biosignature utility (Mars) or hyper-oligotrophic sterile regolith fidelity (Moon).'
  },
  {
    key: 'exploration',
    label: 'Exploration & Engineering',
    shortLabel: 'Engineering',
    description:
      'Rover traversability, landing-zone flatness, rotary/percussive drilling ISRU, and habitat construction.'
  }
];

export const DEFAULT_WEIGHTS: FeatureWeights = {
  geology: 18,
  topography: 14,
  temperature: 12,
  waterIce: 16,
  dust: 10,
  cavesTubes: 10,
  biology: 8,
  exploration: 12
};

export const WEIGHT_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  weights: FeatureWeights;
}> = [
  {
    id: 'balanced',
    name: 'Balanced Base Site',
    description: 'Equalized multi-disciplinary weights for permanent outpost analog evaluation.',
    weights: DEFAULT_WEIGHTS
  },
  {
    id: 'isru-ice',
    name: 'ISRU & Water Prospecting',
    description: 'Prioritizes subsurface ice, cryogenic thermal regime, and drilling/mineral extraction.',
    weights: {
      geology: 16,
      topography: 10,
      temperature: 15,
      waterIce: 28,
      dust: 6,
      cavesTubes: 4,
      biology: 6,
      exploration: 15
    }
  },
  {
    id: 'lava-tube',
    name: 'Subsurface Lava Tube Habitat',
    description: 'Prioritizes intact basaltic tubes, volcanic mineralogy, and underground construction.',
    weights: {
      geology: 16,
      topography: 10,
      temperature: 6,
      waterIce: 8,
      dust: 8,
      cavesTubes: 32,
      biology: 4,
      exploration: 16
    }
  },
  {
    id: 'rover-dust',
    name: 'Rover Mobility & Dust Seals',
    description: 'Prioritizes terrain roughness, slope traversability, abrasive fines, and mobility testing.',
    weights: {
      geology: 12,
      topography: 24,
      temperature: 10,
      waterIce: 4,
      dust: 22,
      cavesTubes: 4,
      biology: 2,
      exploration: 22
    }
  },
  {
    id: 'astrobiology',
    name: 'Astrobiology & Biosignatures',
    description: 'Prioritizes extremophile resilience, evaporite/sulfate/clay chemistry, and sterile limits.',
    weights: {
      geology: 20,
      topography: 6,
      temperature: 10,
      waterIce: 16,
      dust: 6,
      cavesTubes: 6,
      biology: 28,
      exploration: 8
    }
  }
];

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Number(v.toFixed(1))));
}

function gaussianDecay(diff: number, sigma: number): number {
  return Math.exp(-0.5 * Math.pow(diff / sigma, 2)) * 100;
}

const DIAGNOSTIC_MINERAL_WEIGHTS: Record<string, number> = {
  anorthosite: 2.2,
  perchlorate: 2.1,
  'impact breccia': 2.0,
  'subsurface water ice': 2.0,
  'smectite clay': 1.9,
  ilmenite: 1.8,
  jarosite: 1.8,
  gypsum: 1.5,
  sulfate: 1.5,
  olivine: 1.4,
  carbonate: 1.4,
  basalt: 1.3,
  plagioclase: 1.2,
  pyroxene: 1.2,
  hematite: 1.2,
  halite: 1.0,
  quartz: 0.6
};

function provenanceConfidenceBase(p: ProvenanceKind): number {
  if (p === 'live') return 92;
  if (p === 'archived') return 78;
  if (p === 'proxy') return 58;
  return 0;
}

function provenanceQuality(p: ProvenanceKind): ProvenanceRecord['dataQuality'] {
  if (p === 'live') return 'high';
  if (p === 'archived') return 'moderate';
  if (p === 'proxy') return 'proxy-limited';
  return 'missing';
}

export function computeSiteSimilarity(
  site: EarthAnalogSite,
  target: PlanetaryTarget,
  weights: FeatureWeights,
  live?: LiveSiteTelemetry
): SiteSimilarityResult {
  const nowIso = live?.fetchedAt?.slice(0, 10) ?? 'Archival Baseline';

  // =========================================================================
  // 1. Geology & Mineralogy (Weighted Sorensen-Dice + Lithology Process)
  // =========================================================================
  const siteMinerals = new Set(site.geology.minerals.map((m) => m.toLowerCase()));
  const targetMinerals = target.dominantMinerals.map((m) => m.toLowerCase());
  const matchedMinerals = targetMinerals.filter((m) => siteMinerals.has(m));
  const unmatchedTargetMinerals = targetMinerals.filter((m) => !siteMinerals.has(m));

  const wOf = (m: string) => DIAGNOSTIC_MINERAL_WEIGHTS[m] ?? 1.0;
  const matchedWeightSum = matchedMinerals.reduce((s, m) => s + wOf(m), 0);
  const targetWeightSum = targetMinerals.reduce((s, m) => s + wOf(m), 0) || 1;
  const siteWeightSum = [...siteMinerals].reduce((s, m) => s + wOf(m), 0) || 1;

  // Weighted Sorensen-Dice coefficient (prevents inflated score from 1 common mineral like quartz/basalt)
  const weightedDice = (2 * matchedWeightSum) / (targetWeightSum + siteWeightSum);
  const targetCoverage = matchedWeightSum / targetWeightSum;
  // Require at least 2 shared minerals for high geological fidelity; single-mineral match is damped
  const singleMatchPenalty = matchedMinerals.length <= 1 ? 0.72 : 1.0;

  const targetIsImpact =
    target.id.includes('shackleton') ||
    target.id.includes('south-pole') ||
    target.id.includes('jezero') ||
    target.id.includes('gale');
  const processScore =
    site.geology.craterOrigin && targetIsImpact
      ? 22
      : siteMinerals.has('basalt') && targetMinerals.includes('basalt')
        ? 15
        : siteMinerals.has('anorthosite') && targetMinerals.includes('anorthosite')
          ? 20
          : 5;

  const geologyAvail = site.geology.provenance !== 'unavailable' && siteMinerals.size > 0;
  const geologyRaw = geologyAvail
    ? clampScore((targetCoverage * 48 + weightedDice * 30) * singleMatchPenalty + processScore)
    : null;

  const geologySim: string[] = [];
  const geologyDiff: string[] = [];
  if (matchedMinerals.length > 0) {
    geologySim.push(`Shared diagnostic phases: ${matchedMinerals.join(', ')}.`);
  }
  if (site.geology.craterOrigin && targetIsImpact) {
    geologySim.push('Impact-cratered geological formation mirrors planetary basin architecture.');
  }
  if (unmatchedTargetMinerals.length > 0) {
    geologyDiff.push(`Missing target phases: ${unmatchedTargetMinerals.slice(0, 4).join(', ')}.`);
  }
  if (site.geology.minerals.includes('quartz') || site.geology.minerals.includes('carbonate')) {
    geologyDiff.push('Contains terrestrial quartz/sedimentary carbonates absent or rare at lunar sites.');
  }

  // =========================================================================
  // 2. Topography & Relief (Live OpenTopography / Copernicus 90m DEM priority)
  // =========================================================================
  const hasOpenTopo =
    live?.openTopography.status === 'live' && typeof live.openTopography.meanSlopeDeg === 'number';
  const hasCop90 =
    live?.copernicusDem?.status === 'live' && typeof live.copernicusDem.meanSlopeDeg === 'number';

  const effSlope = hasOpenTopo
    ? live!.openTopography.meanSlopeDeg!
    : hasCop90
      ? live!.copernicusDem!.meanSlopeDeg!
      : site.topography.meanSlopeDeg;
  const effRough =
    hasCop90 && typeof live?.copernicusDem?.roughnessIndex === 'number'
      ? live.copernicusDem.roughnessIndex
      : site.topography.roughnessIndex;
  const effElev =
    live?.openMeteoWeather.elevationM ?? live?.copernicusDem?.maxM ?? site.topography.elevationM;

  const topoProvenance: ProvenanceKind =
    hasOpenTopo || hasCop90 ? 'live' : site.topography.provenance;
  const topoAvail = topoProvenance !== 'unavailable';

  // Non-linear Gaussian distance decay for slope & roughness
  const slopeScore = gaussianDecay(Math.abs(effSlope - target.typicalSlopeDeg), 4.2);
  const roughScore = gaussianDecay(Math.abs(effRough - target.roughnessIndex), 0.28);
  const targetCraterPreference = target.id.includes('shackleton') ? 85 : target.id.includes('south-pole') ? 75 : 55;
  const craterMorphScore = 100 - Math.abs(site.topography.craterDensityAnalog - targetCraterPreference);
  const topographyRaw = topoAvail
    ? clampScore(slopeScore * 0.4 + roughScore * 0.38 + craterMorphScore * 0.22)
    : null;

  const topoSim: string[] = [];
  const topoDiff: string[] = [];
  if (Math.abs(effSlope - target.typicalSlopeDeg) <= 2.5) {
    topoSim.push(
      `Mean slope (${effSlope.toFixed(1)}°) closely matches ${target.name} (${target.typicalSlopeDeg.toFixed(1)}°).`
    );
  } else {
    topoDiff.push(
      `Terrain slope diverges (${effSlope.toFixed(1)}° Earth vs. ${target.typicalSlopeDeg.toFixed(1)}° target).`
    );
  }
  if (Math.abs(effRough - target.roughnessIndex) <= 0.18) {
    topoSim.push(`Surface ruggedness (${effRough.toFixed(2)}) matches boulder/relief complexity (${target.roughnessIndex.toFixed(2)}).`);
  } else {
    topoDiff.push(`Micro-topography roughness differs (${effRough.toFixed(2)} vs. ${target.roughnessIndex.toFixed(2)}).`);
  }

  // =========================================================================
  // 3. Temperature & Diurnal Swing (NASA POWER Skin Temp TS + Open-Meteo Historical Archive)
  // =========================================================================
  const hasPowerTemp =
    live?.nasaPower?.status === 'live' && typeof live.nasaPower.skinTempC === 'number';
  const hasHistoricalTemp =
    live?.openMeteoHistorical?.status === 'live' &&
    typeof live.openMeteoHistorical.annualMeanTempC === 'number';
  const hasWeatherSwing =
    live?.openMeteoWeather.status === 'live' &&
    typeof live.openMeteoWeather.observed7DaySwingC === 'number';

  const effectiveEarthTempC = hasPowerTemp
    ? live!.nasaPower!.skinTempC!
    : hasHistoricalTemp
      ? live!.openMeteoHistorical!.annualMeanTempC!
      : site.temperature.archivedAnnualMeanC;

  const effectiveSwingC =
    hasPowerTemp && typeof live?.nasaPower?.diurnalRangeC === 'number'
      ? live.nasaPower.diurnalRangeC
      : hasHistoricalTemp && typeof live?.openMeteoHistorical?.meanDiurnalRangeC === 'number'
        ? live.openMeteoHistorical.meanDiurnalRangeC
        : hasWeatherSwing
          ? site.temperature.archivedDiurnalSwingC * 0.65 + live!.openMeteoWeather.observed7DaySwingC! * 0.35
          : site.temperature.archivedDiurnalSwingC;

  const tempProvenance: ProvenanceKind =
    hasPowerTemp || hasHistoricalTemp || live?.openMeteoWeather.status === 'live'
      ? 'live'
      : site.temperature.provenance;
  const tempAvail = tempProvenance !== 'unavailable';

  // Non-linear thermal fit: Earth coldest (-50°C) vs Mars (-63°C) is strong; vs Moon (-233°C) has an unavoidable radiation-sink gap
  const tempDiff = Math.abs(effectiveEarthTempC - target.meanTempC);
  const thermalProximity = gaussianDecay(tempDiff, target.body === 'mars' ? 42 : 125);
  const targetSwingRef = Math.max(18, Math.min(75, target.diurnalSwingC));
  const swingFit = gaussianDecay(Math.abs(effectiveSwingC - targetSwingRef * 0.45), 14);
  const temperatureRaw = tempAvail ? clampScore(thermalProximity * 0.66 + swingFit * 0.34) : null;

  const tempSim: string[] = [];
  const tempDiffNotes: string[] = [];
  if (effectiveEarthTempC <= 0) {
    tempSim.push(
      `Sub-freezing mean thermal regime (${effectiveEarthTempC.toFixed(1)}°C ${
        hasPowerTemp ? 'NASA POWER skin' : hasHistoricalTemp ? 'Open-Meteo 365-day historical' : 'mean'
      }) provides realistic cold hardware stress.`
    );
  }
  if (effectiveSwingC >= 15) {
    tempSim.push(`Wide diurnal cycling (Δ${effectiveSwingC.toFixed(1)}°C) exercises thermal expansion joints.`);
  }
  tempDiffNotes.push(
    target.body === 'moon'
      ? `Terrestrial thermal minimum cannot replicate ${target.meanTempC}°C cryogenic lunar cold traps without LN₂/LHe chambers.`
      : `Terrestrial air pressure (1 bar) causes convective cooling absent in Mars 6 mbar CO₂ atmosphere.`
  );

  // =========================================================================
  // 4. Water, Ice & Volatiles (NASA NSIDC Cryosphere + Precipitation Penalty)
  // =========================================================================
  const effectivePrecipMm =
    live?.nasaPower?.status === 'live' && typeof live.nasaPower.annualPrecipMm === 'number'
      ? live.nasaPower.annualPrecipMm
      : live?.openMeteoHistorical?.status === 'live' &&
          typeof live.openMeteoHistorical.annualPrecipMm === 'number'
        ? live.openMeteoHistorical.annualPrecipMm
        : site.waterIce.annualPrecipMm;

  const waterProvenance: ProvenanceKind =
    live?.nasaPower?.status === 'live' ||
    live?.nasaNsidc?.status === 'live' ||
    hasHistoricalTemp
      ? 'live'
      : site.waterIce.provenance;
  const waterAvail = waterProvenance !== 'unavailable';

  // Penalize high liquid rainfall for modern Mars/Moon analogs
  const rainPenalty = effectivePrecipMm > 450 ? Math.min(28, (effectivePrecipMm - 450) / 35) : 0;
  const iceFit = gaussianDecay(Math.abs(site.waterIce.subsurfaceIceScore - target.waterIceTargetScore), 28);
  const aridityFit = (1 - Math.min(1, site.waterIce.aridityIndex)) * 100;
  const waterIceRaw = waterAvail
    ? clampScore(iceFit * 0.72 + aridityFit * 0.28 - rainPenalty)
    : null;

  const waterSim: string[] = [
    site.waterIce.iceMechanism
  ];
  const waterDiff: string[] = [];
  if (effectivePrecipMm > 300) {
    waterDiff.push(`Annual precipitation (${Math.round(effectivePrecipMm)} mm/yr) introduces liquid runoff absent on modern Mars or Moon.`);
  } else {
    waterSim.push(`Moisture-scarce regime (${Math.round(effectivePrecipMm)} mm/yr) limits liquid alteration.`);
  }

  // =========================================================================
  // 5. Dust & Regolith Hazard (Proxy: MODIS AOD_55 + CAMS + Particle Sharpness)
  // =========================================================================
  const hasAod = live?.nasaPower?.status === 'live' && typeof live.nasaPower.modisAod55 === 'number';
  const hasCamsDust =
    live?.openMeteoAirQuality.status === 'live' && typeof live.openMeteoAirQuality.dustUgM3 === 'number';

  const aodBoost = hasAod ? Math.min(10, live!.nasaPower!.modisAod55! * 22) : 0;
  const camsBoost = hasCamsDust ? Math.min(8, live!.openMeteoAirQuality.dustUgM3! / 18) : 0;
  const effectiveDust = Math.min(100, site.dust.regolithDustHazardScore + Math.max(aodBoost, camsBoost));
  const dustRaw = clampScore(gaussianDecay(Math.abs(effectiveDust - target.dustHazardLevel), 36));

  const dustSim = [
    `Fine ${site.dust.particleComposition} provides mechanical seal & optics abrasion testing (${effectiveDust.toFixed(0)}/100 proxy).`
  ];
  const dustDiff = [
    target.body === 'moon'
      ? 'Terrestrial weathered silt lacks sharp impact-welded lunar agglutinates, nanophase Fe⁰, and vacuum electrostatic levitation.'
      : 'Earth atmospheric aerosol dust (MODIS AOD / CAMS) lacks toxic Martian ferric perchlorates (0.5–1 wt%).'
  ];

  // =========================================================================
  // 6. Caves & Lava Tubes (Honest missing-data handling)
  // =========================================================================
  const cavesAvail = site.cavesTubes.provenance !== 'unavailable';
  const cavesTubesRaw = cavesAvail
    ? clampScore(gaussianDecay(Math.abs(site.cavesTubes.tubePresenceScore - target.lavaTubeRelevance), 38))
    : null;

  const cavesSim = cavesAvail
    ? [`${site.cavesTubes.systemName} (${site.cavesTubes.tubePresenceScore}/100) evaluated against ${target.lavaTubeRelevance}/100 target tube priority.`]
    : [];
  const cavesDiff = cavesAvail
    ? [
        target.body === 'moon'
          ? 'Lunar gravity (0.165g) allows much wider stable lava tubes (>100 m) than Earth 1g volcanic roofs.'
          : 'Earth terrestrial karst/basalt humidity alters cave wall chemistry compared to dry Martian tubes.'
      ]
    : ['No verified subsurface cave/lava-tube survey available in remote global scan; excluded from scoring.'];

  // =========================================================================
  // 7. Biology & Extremophiles
  // =========================================================================
  const bioAvail = site.biology.provenance !== 'unavailable';
  const biologyRaw = bioAvail
    ? target.body === 'mars'
      ? clampScore(site.biology.extremophileScore)
      : clampScore(
          // For Moon (abiotic), hyper-oligotrophic sterile deserts score better than lush ecosystems
          (100 - site.biology.extremophileScore) * 0.45 + (1 - Math.min(1, site.waterIce.aridityIndex)) * 55
        )
    : null;

  const bioSim = bioAvail
    ? [
        target.body === 'mars'
          ? `Extremophile pathways (${site.biology.metabolicStrategy}) provide realistic biosignature detection targets.`
          : 'Hyper-oligotrophic low-biomass terrain supports planetary-protection & forward-contamination testing.'
      ]
    : [];
  const bioDiff = bioAvail
    ? ['All Earth sites harbor active terrestrial biosphere contamination unlike sterile lunar regolith or radiation-sterilized Mars surfaces.']
    : ['No site-specific extremophile field assay cataloged; axis excluded and weights renormalized.'];

  // =========================================================================
  // 8. Exploration & Engineering Suitability
  // =========================================================================
  const explAvail = site.exploration.provenance !== 'unavailable';
  let explorationRaw: number | null = null;
  if (explAvail) {
    if (target.lavaTubeRelevance >= 70) {
      explorationRaw = clampScore(
        site.exploration.habitatConstructionScore * 0.4 +
          site.exploration.roverMobilityScore * 0.28 +
          site.exploration.drillingIsruScore * 0.2 +
          site.exploration.landingFlatnessScore * 0.12
      );
    } else if (target.waterIceTargetScore >= 80) {
      explorationRaw = clampScore(
        site.exploration.drillingIsruScore * 0.4 +
          site.exploration.landingFlatnessScore * 0.24 +
          site.exploration.roverMobilityScore * 0.22 +
          site.exploration.habitatConstructionScore * 0.14
      );
    } else {
      explorationRaw = clampScore(
        site.exploration.roverMobilityScore * 0.35 +
          site.exploration.drillingIsruScore * 0.3 +
          site.exploration.landingFlatnessScore * 0.2 +
          site.exploration.habitatConstructionScore * 0.15
      );
    }
  }

  const explSim = [site.exploration.engineeringNotes];
  const explDiff = [
    `1g terrestrial weight and atmospheric buoyancy alter rover wheel slip, drill cuttings transport, and ${target.gravityG}g structural loads.`
  ];

  // Assemble per-axis details & ProvenanceRecords
  const axisRawSpecs: Record<
    FeatureAxisKey,
    {
      available: boolean;
      raw: number | null;
      earthMeasurement: string;
      targetMeasurement: string;
      unit: string;
      formulaNote: string;
      provenance: ProvenanceKind;
      provenanceDetail: ProvenanceRecord;
      similarities: string[];
      differences: string[];
    }
  > = {
    geology: {
      available: geologyAvail,
      raw: geologyRaw,
      earthMeasurement: site.geology.minerals.slice(0, 4).join(', '),
      targetMeasurement: target.dominantMinerals.slice(0, 4).join(', '),
      unit: 'Mineral phase match (Sorensen-Dice)',
      formulaNote: `${matchedMinerals.length}/${targetMinerals.length} target minerals matched (${site.geology.craterOrigin ? 'impact crater' : 'non-impact'} lithology).`,
      provenance: site.geology.provenance,
      provenanceDetail: {
        status: site.geology.provenance,
        datasetName: site.geology.source,
        provider: 'Peer-Reviewed Field Geology / USGS / GLiM',
        acquisitionDate: 'Archival Survey',
        spatialResolution: 'Site-level lithological mapping',
        temporalCoverage: 'Geological baseline',
        units: 'Mineral assemblage & lithology',
        processingMethod: 'Weighted Sorensen-Dice diagnostic mineral overlap',
        dataQuality: provenanceQuality(site.geology.provenance),
        missingDataPct: geologyAvail ? 0 : 100
      },
      similarities: geologySim,
      differences: geologyDiff
    },
    topography: {
      available: topoAvail,
      raw: topographyRaw,
      earthMeasurement: `${effSlope.toFixed(1)}° slope · TRI ${effRough.toFixed(2)} · ${Math.round(effElev)} m`,
      targetMeasurement: `${target.typicalSlopeDeg.toFixed(1)}° slope · TRI ${target.roughnessIndex.toFixed(2)} · ${target.elevationRelativeM} m rel`,
      unit: 'Degrees / Riley TRI (0–1)',
      formulaNote: `Gaussian slope (${effSlope.toFixed(1)}° vs ${target.typicalSlopeDeg.toFixed(1)}°) & TRI (${effRough.toFixed(2)} vs ${target.roughnessIndex.toFixed(2)}).`,
      provenance: topoProvenance,
      provenanceDetail: {
        status: topoProvenance,
        datasetName: hasOpenTopo
          ? 'OpenTopography Copernicus GLO-30'
          : hasCop90
            ? 'Open-Meteo Copernicus GLO-90 10×10 DEM'
            : site.topography.source,
        provider: hasCop90 || hasOpenTopo ? 'ESA Copernicus / Open-Meteo' : 'USGS / SRTM Baseline',
        sourceUrl: live?.copernicusDem?.sourceUrl,
        acquisitionDate: nowIso,
        spatialResolution: hasOpenTopo ? '30 m' : hasCop90 ? '90 m (10×10 grid)' : 'Regional DEM',
        temporalCoverage: 'Static global DEM epoch',
        units: 'Meters / Degrees slope / Riley TRI',
        processingMethod: 'Central finite differences & 8-neighbor Riley TRI',
        dataQuality: provenanceQuality(topoProvenance),
        missingDataPct: topoAvail ? 0 : 100
      },
      similarities: topoSim,
      differences: topoDiff
    },
    temperature: {
      available: tempAvail,
      raw: temperatureRaw,
      earthMeasurement: `${effectiveEarthTempC.toFixed(1)}°C ${hasPowerTemp ? 'skin' : hasHistoricalTemp ? '365d hist' : 'mean'} · Δ${effectiveSwingC.toFixed(1)}°C`,
      targetMeasurement: `${target.meanTempC}°C mean (${target.minTempC}..${target.maxTempC}°C) · Δ${target.diurnalSwingC}°C`,
      unit: '°C (Surface / Historical)',
      formulaNote: `${
        hasPowerTemp
          ? 'NASA POWER Skin Temp (TS)'
          : hasHistoricalTemp
            ? 'Open-Meteo 365d Historical Archive'
            : 'Climatology'
      } ${effectiveEarthTempC.toFixed(1)}°C vs ${target.meanTempC}°C; Δ${effectiveSwingC.toFixed(1)}°C.`,
      provenance: tempProvenance,
      provenanceDetail: {
        status: tempProvenance,
        datasetName: hasPowerTemp && hasHistoricalTemp
          ? 'NASA POWER (TS) + Open-Meteo Historical Archive'
          : hasHistoricalTemp
            ? 'Open-Meteo Historical Earth Temperature Archive'
            : hasPowerTemp
              ? 'NASA Langley POWER (TS, T2M_RANGE)'
              : site.temperature.source,
        provider: hasPowerTemp || hasHistoricalTemp ? 'Open-Meteo Historical / NASA POWER' : 'WMO / Climatology',
        sourceUrl: live?.openMeteoHistorical?.sourceUrl ?? live?.nasaPower?.sourceUrl ?? live?.openMeteoWeather.sourceUrl,
        acquisitionDate: nowIso,
        spatialResolution: hasHistoricalTemp ? '0.25° ERA5 / 0.5° MERRA-2' : 'Site station',
        temporalCoverage:
          live?.openMeteoHistorical?.status === 'live'
            ? `${live.openMeteoHistorical.startDate} to ${live.openMeteoHistorical.endDate}`
            : live?.nasaPower?.acquisitionSpan ?? '1991–2020 Climatology',
        units: '°C',
        processingMethod: 'Gaussian distance decay over skin/historical mean temp & diurnal amplitude',
        dataQuality: provenanceQuality(tempProvenance),
        missingDataPct: tempAvail ? 0 : 100
      },
      similarities: tempSim,
      differences: tempDiffNotes
    },
    waterIce: {
      available: waterAvail,
      raw: waterIceRaw,
      earthMeasurement: `Ice idx ${site.waterIce.subsurfaceIceScore}/100 · ${Math.round(effectivePrecipMm)} mm/yr${
        live?.nasaNsidc?.status === 'live' ? ` · ${live.nasaNsidc.collectionsMatched} NSIDC` : ''
      }`,
      targetMeasurement: `Ice priority ${target.waterIceTargetScore}/100 (${target.body === 'moon' ? 'Polar cold trap' : 'Hydrated minerals'})`,
      unit: 'Index (0–100) / mm yr⁻¹',
      formulaNote: `Ice mechanism ${site.waterIce.subsurfaceIceScore} vs ${target.waterIceTargetScore}; precip ${Math.round(effectivePrecipMm)} mm/yr.`,
      provenance: waterProvenance,
      provenanceDetail: {
        status: waterProvenance,
        datasetName:
          live?.nasaNsidc?.status === 'live'
            ? `NASA NSIDC DAAC (${live.nasaNsidc.datasets[0]?.shortName ?? 'Permafrost/Snow'})`
            : live?.nasaPower?.status === 'live'
              ? 'NASA POWER PRECTOTCORR + NSIDC Permafrost'
              : site.waterIce.source,
        provider: 'NASA NSIDC / LaRC POWER',
        sourceUrl: live?.nasaNsidc?.sourceUrl ?? live?.nasaPower?.sourceUrl,
        acquisitionDate: nowIso,
        spatialResolution: '0.5° / NSIDC Cryosphere Basin',
        temporalCoverage: live?.nasaPower?.acquisitionSpan ?? 'Multi-decadal',
        units: 'mm/yr & Ice Index (0–100)',
        processingMethod: 'NSIDC snow/glacier/permafrost catalog + Gaussian ice match minus rainfall penalty',
        dataQuality: provenanceQuality(waterProvenance),
        missingDataPct: waterAvail ? 0 : 100
      },
      similarities: waterSim,
      differences: waterDiff
    },
    dust: {
      available: true,
      raw: dustRaw,
      earthMeasurement: `Proxy ${effectiveDust.toFixed(0)}/100${hasAod ? ` · MERRA-2 AOD ${live!.nasaPower!.modisAod55!.toFixed(2)}` : ''}${hasCamsDust ? ` · ${live!.openMeteoAirQuality.dustUgM3!.toFixed(1)} µg/m³` : ''}`,
      targetMeasurement: `${target.dustHazardLevel}/100 regolith hazard`,
      unit: 'MERRA-2 AOD_55 / µg m⁻³',
      formulaNote: `Proxy ${effectiveDust.toFixed(1)} vs target ${target.dustHazardLevel}${hasAod ? ` (MERRA-2/MODIS AOD_55=${live!.nasaPower!.modisAod55!.toFixed(2)})` : ''}.`,
      provenance: 'proxy',
      provenanceDetail: {
        status: 'proxy',
        datasetName:
          live?.nasaMerra2?.status === 'live' || hasAod
            ? 'NASA MERRA-2 (M2TMNXAER / POWER AOD_55) + CAMS Dust'
            : 'Copernicus CAMS Dust + Field Regolith Proxy',
        provider: 'NASA GMAO MERRA-2 / ECMWF CAMS',
        sourceUrl: live?.nasaMerra2?.sourceUrl ?? live?.openMeteoAirQuality.sourceUrl,
        acquisitionDate: nowIso,
        spatialResolution: '0.5° × 0.625° MERRA-2 / 0.4° CAMS',
        temporalCoverage: 'Near-real-time + MERRA-2 reanalysis',
        units: 'Dimensionless AOD / µg/m³',
        processingMethod: 'MERRA-2 atmospheric aerosol & mechanical abrasion proxy (non-equivalent to vacuum dust)',
        dataQuality: 'proxy-limited',
        missingDataPct: 0
      },
      similarities: dustSim,
      differences: dustDiff
    },
    cavesTubes: {
      available: cavesAvail,
      raw: cavesTubesRaw,
      earthMeasurement: cavesAvail ? `${site.cavesTubes.tubePresenceScore}/100 (${site.cavesTubes.systemName})` : 'Not verified in scan',
      targetMeasurement: `${target.lavaTubeRelevance}/100 tube habitat relevance`,
      unit: 'Structural Index (0–100)',
      formulaNote: cavesAvail
        ? `Tube index ${site.cavesTubes.tubePresenceScore} vs target relevance ${target.lavaTubeRelevance}.`
        : 'Unavailable — no subsurface cave survey verified for this coordinate.',
      provenance: site.cavesTubes.provenance,
      provenanceDetail: {
        status: site.cavesTubes.provenance,
        datasetName: site.cavesTubes.source,
        provider: 'Speleological / Volcanic Survey',
        acquisitionDate: 'Archival Survey',
        spatialResolution: 'Subsurface feature mapping',
        temporalCoverage: 'Static',
        units: 'Structural presence score (0–100)',
        processingMethod: cavesAvail ? 'Direct presence & documented tube scale comparison' : 'Excluded (missing)',
        dataQuality: provenanceQuality(site.cavesTubes.provenance),
        missingDataPct: cavesAvail ? 0 : 100
      },
      similarities: cavesSim,
      differences: cavesDiff
    },
    biology: {
      available: bioAvail,
      raw: biologyRaw,
      earthMeasurement: bioAvail
        ? `${site.biology.extremophileScore}/100 extremophile (${site.biology.organisms.slice(0, 2).join(', ')})`
        : 'Not cataloged',
      targetMeasurement: target.body === 'mars' ? 'Astrobiological biosignature target' : 'Sterile abiotic baseline',
      unit: 'Extremophile Index (0–100)',
      formulaNote: bioAvail
        ? target.body === 'mars'
          ? `Extremophile biosignature index ${site.biology.extremophileScore}/100.`
          : 'Hyper-oligotrophic low-biomass blend for lunar sterile regolith baseline.'
        : 'Unavailable — no local microbiology assay cataloged.',
      provenance: site.biology.provenance,
      provenanceDetail: {
        status: site.biology.provenance,
        datasetName: live?.ncbiPubmed.status === 'live' ? `NCBI PubMed (${live.ncbiPubmed.totalCount} studies)` : site.biology.source,
        provider: 'NCBI PubMed / Astrobiology Literature',
        sourceUrl: live?.ncbiPubmed.sourceUrl,
        acquisitionDate: nowIso,
        spatialResolution: 'Field site sampling',
        temporalCoverage: 'Peer-reviewed index',
        units: 'Biosignature utility index (0–100)',
        processingMethod: bioAvail ? 'Body-conditioned extremophile vs abiotic fidelity' : 'Excluded (missing)',
        dataQuality: provenanceQuality(site.biology.provenance),
        missingDataPct: bioAvail ? 0 : 100
      },
      similarities: bioSim,
      differences: bioDiff
    },
    exploration: {
      available: explAvail,
      raw: explorationRaw,
      earthMeasurement: `Mobility ${site.exploration.roverMobilityScore} · Drill ${site.exploration.drillingIsruScore} · Flat ${site.exploration.landingFlatnessScore}`,
      targetMeasurement: `${target.gravityG}g · ${target.surfacePressurePa < 1 ? 'Vacuum' : `${target.surfacePressurePa} Pa`}`,
      unit: 'Readiness Index (0–100)',
      formulaNote: `Mobility (${site.exploration.roverMobilityScore}), drilling (${site.exploration.drillingIsruScore}), flatness (${site.exploration.landingFlatnessScore}), construction (${site.exploration.habitatConstructionScore}).`,
      provenance: site.exploration.provenance,
      provenanceDetail: {
        status: site.exploration.provenance,
        datasetName: site.exploration.source,
        provider: 'NASA Field Campaigns / DEM Mobility Model',
        acquisitionDate: nowIso,
        spatialResolution: 'Field traverse scale',
        temporalCoverage: 'Campaign & DEM baseline',
        units: 'Engineering score (0–100)',
        processingMethod: 'Target-conditioned engineering sub-weight blend',
        dataQuality: provenanceQuality(site.exploration.provenance),
        missingDataPct: explAvail ? 0 : 100
      },
      similarities: explSim,
      differences: explDiff
    }
  };

  // Strict missing-data renormalization: exclude unavailable axes instead of silently scoring them as 0
  const requestedTotalWeight = AXIS_METADATA.reduce((sum, a) => sum + Math.max(0, weights[a.key]), 0) || 1;
  const availableWeightSum =
    AXIS_METADATA.reduce(
      (sum, a) => sum + (axisRawSpecs[a.key].available ? Math.max(0, weights[a.key]) : 0),
      0
    ) || 1;

  const axes = {} as Record<FeatureAxisKey, AxisScoreDetail>;
  const unavailableAxes: FeatureAxisKey[] = [];
  let composite = 0;
  let weightedConfSum = 0;

  for (const meta of AXIS_METADATA) {
    const w = Math.max(0, weights[meta.key]);
    const spec = axisRawSpecs[meta.key];
    const axisConf = provenanceConfidenceBase(spec.provenance);

    if (!spec.available || spec.raw === null) {
      unavailableAxes.push(meta.key);
      axes[meta.key] = {
        axis: meta.key,
        label: meta.label,
        available: false,
        rawScore: null,
        weight: w,
        normalizedWeight: 0,
        weightedContribution: 0,
        confidencePct: 0,
        earthMeasurement: spec.earthMeasurement,
        targetMeasurement: spec.targetMeasurement,
        unit: spec.unit,
        formulaNote: spec.formulaNote,
        provenance: 'unavailable',
        provenanceDetail: spec.provenanceDetail,
        similarities: spec.similarities,
        differences: spec.differences
      };
      continue;
    }

    const nw = w / availableWeightSum;
    const contribution = spec.raw * nw;
    composite += contribution;
    weightedConfSum += axisConf * nw;

    axes[meta.key] = {
      axis: meta.key,
      label: meta.label,
      available: true,
      rawScore: spec.raw,
      weight: w,
      normalizedWeight: Number((nw * 100).toFixed(1)),
      weightedContribution: Number(contribution.toFixed(2)),
      confidencePct: axisConf,
      earthMeasurement: spec.earthMeasurement,
      targetMeasurement: spec.targetMeasurement,
      unit: spec.unit,
      formulaNote: spec.formulaNote,
      provenance: spec.provenance,
      provenanceDetail: spec.provenanceDetail,
      similarities: spec.similarities,
      differences: spec.differences
    };
  }

  const availableWeightPct = Number(((availableWeightSum / requestedTotalWeight) * 100).toFixed(1));
  // Independent data confidence penalizes missing axes linearly on top of source quality
  const confidencePct = Math.round(
    Math.max(15, Math.min(98, weightedConfSum * (0.45 + 0.55 * (availableWeightPct / 100))))
  );

  const methodologyNote =
    unavailableAxes.length > 0
      ? `Weights dynamically renormalized over ${8 - unavailableAxes.length}/8 available scientific dimensions (${availableWeightPct}% of requested weights; excluded unavailable: ${unavailableAxes.join(', ')}). Earth Analog Suitability is not a probability of physical equivalence.`
      : `All 8 scientific dimensions evaluated using non-linear Gaussian distance decay & weighted mineral Sorensen-Dice matching. Earth Analog Suitability (${composite.toFixed(1)}%) is distinct from Data Confidence (${confidencePct}%).`;

  return {
    siteId: site.id,
    targetId: target.id,
    compositeScore: Number(composite.toFixed(1)),
    confidencePct,
    availableWeightPct,
    unavailableAxes,
    methodologyNote,
    axes,
    liveAdjusted:
      live?.openMeteoWeather.status === 'live' ||
      live?.openMeteoAirQuality.status === 'live' ||
      live?.nasaPower?.status === 'live' ||
      live?.copernicusDem?.status === 'live' ||
      live?.openTopography.status === 'live'
  };
}
