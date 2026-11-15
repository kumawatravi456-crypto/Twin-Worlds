import type { PlanetaryTarget } from '../types/analog';

export const PLANETARY_TARGETS: PlanetaryTarget[] = [
  {
    id: 'moon-south-pole-rim',
    body: 'moon',
    name: 'Moon South Pole Crater Rim',
    region: 'Malapert / Shackleton Connecting Ridge',
    coordinates: '89.66°S, 129.17°E',
    lat: -89.66,
    lon: 129.17,
    elevationRelativeM: 1250,
    meanTempC: -145,
    minTempC: -220,
    maxTempC: -45,
    diurnalSwingC: 115,
    typicalSlopeDeg: 7.8,
    roughnessIndex: 0.58,
    gravityG: 0.165,
    surfacePressurePa: 3e-10,
    dominantMinerals: ['anorthosite', 'plagioclase', 'pyroxene', 'ilmenite', 'impact breccia'],
    waterIceStatus: 'Elevated solar-lit ridge adjacent to permanently shadowed volatile traps (<40 K)',
    waterIceTargetScore: 86,
    dustHazardLevel: 95,
    dustDescription: 'Ultra-fine (<20 µm) jagged electrostatic agglutinates & nanophase Fe⁰.',
    lavaTubeRelevance: 20,
    radiationSvPerYear: 0.42,
    keyHazard: 'Electrostatic jagged regolith dust & extreme low-angle shadowing',
    keyResource: 'Near-continuous solar illumination ridge + proximity to polar ice',
    missionSummary:
      'High-elevation Artemis permanent outpost ridge balancing >80% solar power availability with short rover traverses to polar cold traps.',
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Moon Trek / LRO WAC Mosaic 303ppd',
    pdsCitations: [
      'NASA PDS LRO LOLA Gridded Data Record (LRO-L-LOLA-4-GDR-V1.0)',
      'NASA PDS LRO Diviner Lunar Radiometer Experiment (Paige et al., 2010)'
    ]
  },
  {
    id: 'moon-shackleton-floor',
    body: 'moon',
    name: 'Moon Shackleton Crater Floor',
    region: 'Permanently Shadowed Polar Basin',
    coordinates: '89.54°S, 0.00°E',
    lat: -89.54,
    lon: 0.0,
    elevationRelativeM: -4200,
    meanTempC: -233,
    minTempC: -245,
    maxTempC: -205,
    diurnalSwingC: 18,
    typicalSlopeDeg: 4.2,
    roughnessIndex: 0.66,
    gravityG: 0.165,
    surfacePressurePa: 3e-10,
    dominantMinerals: ['anorthosite', 'subsurface water ice', 'impact breccia', 'plagioclase', 'ilmenite'],
    waterIceStatus: 'Cryogenic cold trap (~40 K) preserving surface frost & buried water-ice regolith (LRO/LCROSS)',
    waterIceTargetScore: 99,
    dustHazardLevel: 97,
    dustDescription: 'Cryogenic vacuum-welded regolith fines mixed with brittle ice-cemented grains.',
    lavaTubeRelevance: 10,
    radiationSvPerYear: 0.36,
    keyHazard: 'Zero direct sunlight, cryogenic 40 K hardware embrittlement, and steep 30° crater walls',
    keyResource: 'Harvestable polar water ice (H₂O) for LH₂/LOX propellant & life support',
    missionSummary:
      'Deep 4.2 km crater floor in permanent shadow acting as a primordial volatile sink for autonomous ISRU ice-mining rovers.',
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Moon Trek / LRO LOLA & Mini-RF Polar Mosaic',
    pdsCitations: [
      'Colaprete et al. (2010), LCROSS Water Detection, Science 330',
      'Zuber et al. (2012), Constraints on volatile distribution within Shackleton crater, Nature 486'
    ]
  },
  {
    id: 'mars-jezero',
    body: 'mars',
    name: 'Mars Jezero Crater',
    region: 'Isidis Planitia Western Margin',
    coordinates: '18.38°N, 77.58°E',
    lat: 18.38,
    lon: 77.58,
    elevationRelativeM: -2500,
    meanTempC: -63,
    minTempC: -102,
    maxTempC: -5,
    diurnalSwingC: 75,
    typicalSlopeDeg: 4.8,
    roughnessIndex: 0.52,
    gravityG: 0.379,
    surfacePressurePa: 610,
    dominantMinerals: ['basalt', 'olivine', 'carbonate', 'smectite clay', 'sulfate', 'perchlorate'],
    waterIceStatus: 'Hydrated phyllosilicates & carbonates in deltaic bedrock; low bulk free water ice',
    waterIceTargetScore: 55,
    dustHazardLevel: 76,
    dustDescription: '2–4 µm oxidized ferric dust, electrostatic clinging, and toxic 0.5–1 wt% soil perchlorates.',
    lavaTubeRelevance: 15,
    radiationSvPerYear: 0.24,
    keyHazard: 'Reactive perchlorate salts, global dust storms, and boulder-strewn delta scarps',
    keyResource: 'Hydrated clay minerals for ISRU water extraction + ancient lacustrine biosignature strata',
    missionSummary:
      'Ancient paleolake delta and volcanic floor mapped by MRO and Perseverance; premier science + clay-water ISRU Mars base target.',
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Mars Trek / Viking MDIM2.1 + MRO HiRISE',
    pdsCitations: [
      'NASA PDS MRO CRISM & HiRISE Jezero Landing Site Map Products',
      'Farley et al. (2020), Mars 2020 Mission Overview, Space Science Reviews'
    ]
  },
  {
    id: 'mars-gale',
    body: 'mars',
    name: 'Mars Gale Crater',
    region: 'Aeolis Palus & Mount Sharp Flank',
    coordinates: '5.40°S, 137.80°E',
    lat: -5.4,
    lon: 137.8,
    elevationRelativeM: -4500,
    meanTempC: -58,
    minTempC: -95,
    maxTempC: 2,
    diurnalSwingC: 72,
    typicalSlopeDeg: 3.9,
    roughnessIndex: 0.45,
    gravityG: 0.379,
    surfacePressurePa: 740,
    dominantMinerals: ['basalt', 'sulfate', 'gypsum', 'hematite', 'smectite clay', 'perchlorate'],
    waterIceStatus: 'Hydrated calcium & magnesium sulfates + clay-bearing mudstones across Mount Sharp',
    waterIceTargetScore: 48,
    dustHazardLevel: 79,
    dustDescription: 'Basaltic-ferric dust devils & seasonal global dust haze measured by Curiosity REMS.',
    lavaTubeRelevance: 12,
    radiationSvPerYear: 0.23,
    keyHazard: 'Abrasive aeolian ventifacts, seasonal dust opacity spikes, and steep Mount Sharp strata',
    keyResource: 'Low elevation atmospheric density for aerobraking + sulfate-bound structural water',
    missionSummary:
      '154 km equatorial impact crater featuring a 5.5 km layered sedimentary central peak investigated continuously by Curiosity since 2012.',
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Mars Trek / MGS MOLA & MSL Curiosity Landing Ellipse',
    pdsCitations: [
      'Grotzinger et al. (2012), Mars Science Laboratory Mission and Science Investigation, Space Science Reviews',
      'NASA PDS MSL REMS & ChemCam Gale Crater Mineralogy Archive'
    ]
  }
];
