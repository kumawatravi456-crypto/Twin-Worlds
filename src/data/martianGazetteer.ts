import type { PlanetaryTarget } from '../types/analog';

export interface MarsLandmark {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  province:
    | 'lacustrine-delta'
    | 'sulfate-sedimentary'
    | 'lava-tube'
    | 'volcanic-shield'
    | 'buried-ice-plain'
    | 'polar-ice-cap'
    | 'hydrothermal-clay'
    | 'basalt-plain';
  notes: string;
}

export const MARS_LANDMARKS: MarsLandmark[] = [
  {
    id: 'jezero-delta',
    name: 'Jezero Crater Delta',
    region: 'Isidis Planitia Western Margin',
    lat: 18.38,
    lon: 77.58,
    province: 'lacustrine-delta',
    notes: 'Perseverance landing site preserving an ancient river delta, carbonates, and smectite clays.'
  },
  {
    id: 'gale-mt-sharp',
    name: 'Gale Crater (Mount Sharp)',
    region: 'Aeolis Palus',
    lat: -5.4,
    lon: 137.8,
    province: 'sulfate-sedimentary',
    notes: 'Curiosity traverse across lacustrine mudstones transitioning into hydrated sulfate-bearing strata.'
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris (Coprates)',
    region: 'Equatorial Rift Canyon',
    lat: -13.4,
    lon: -61.4,
    province: 'sulfate-sedimentary',
    notes: '7 km deep tectonic canyon exposing layered polyhydrated sulfates, basalts, and recurring slope streaks.'
  },
  {
    id: 'arsia-skylight',
    name: 'Arsia Mons Lava Tube Pit',
    region: 'Tharsis Volcanic Flank (Jeanne Pit)',
    lat: -5.64,
    lon: -118.77,
    province: 'lava-tube',
    notes: 'Deep volcanic collapse skylight opening into subterranean Martian basaltic lava caves.'
  },
  {
    id: 'olympus-mons',
    name: 'Olympus Mons Summit Caldera',
    region: 'Tharsis Montes',
    lat: 18.65,
    lon: -133.8,
    province: 'volcanic-shield',
    notes: '21 km shield volcano with stacked tholeiitic lava flows and ultra-low ~72 Pa summit pressure.'
  },
  {
    id: 'oxia-planum',
    name: 'Oxia Planum (ExoMars)',
    region: 'Chryse Planitia Margin',
    lat: 18.2,
    lon: -24.37,
    province: 'lacustrine-delta',
    notes: 'Broad low-relief Fe/Mg phyllosilicate plain targeted for deep organic biosignature drilling.'
  },
  {
    id: 'arcadia-ice',
    name: 'Arcadia Planitia Ice Sheet',
    region: 'Northern Lowlands ISRU Zone',
    lat: 39.2,
    lon: -171.0,
    province: 'buried-ice-plain',
    notes: 'Flat dust-mantled volcanic plain with high-purity water ice buried <1 m beneath regolith.'
  },
  {
    id: 'utopia-planitia',
    name: 'Utopia Planitia (Viking 2 / Zhurong)',
    region: 'Northern Periglacial Basin',
    lat: 47.67,
    lon: 134.26,
    province: 'buried-ice-plain',
    notes: 'Polygonally patterned periglacial plain holding a massive ~100 m thick buried water-ice deposit.'
  },
  {
    id: 'hellas-floor',
    name: 'Hellas Planitia Basin Floor',
    region: 'Southern Impact Megabasin',
    lat: -42.4,
    lon: 70.5,
    province: 'basalt-plain',
    notes: 'Deepest Martian basin (-7.1 km) with ~1,150 Pa surface pressure and major regional dust-storm genesis.'
  },
  {
    id: 'mawrth-vallis',
    name: 'Mawrth Vallis Clay Gorge',
    region: 'Margartifer Terra / Chryse',
    lat: 24.0,
    lon: -19.0,
    province: 'lacustrine-delta',
    notes: 'Thick ancient Noachian clay-mineral sequence recording prolonged liquid water alteration.'
  },
  {
    id: 'nili-fossae',
    name: 'Nili Fossae Carbonate Trench',
    region: 'Syrtis Major Northwest',
    lat: 21.0,
    lon: 74.5,
    province: 'hydrothermal-clay',
    notes: 'Olivine-carbonate hydrothermal alteration fractures prime for serpentinization astrobiology.'
  },
  {
    id: 'elysium-insight',
    name: 'Elysium Planitia (InSight)',
    region: 'Equatorial Volcanic Plain',
    lat: 4.5,
    lon: 135.62,
    province: 'basalt-plain',
    notes: 'Smooth regolith-covered basaltic plain with frequent dust devils and seismic boundary monitoring.'
  },
  {
    id: 'korolev-crater',
    name: 'Korolev Crater Water-Ice Lake',
    region: 'North Polar Boreal Margin',
    lat: 72.77,
    lon: -164.55,
    province: 'polar-ice-cap',
    notes: '81 km impact crater cold-trapping a permanent 1.8 km thick exposed water-ice mound.'
  },
  {
    id: 'planum-boreum',
    name: 'Planum Boreum Polar Cap',
    region: 'North Polar Layered Deposits',
    lat: 83.5,
    lon: 15.0,
    province: 'polar-ice-cap',
    notes: 'Spiral-troughed water ice and seasonal CO2 frost cap recording Martian paleoclimate cycles.'
  }
];

export interface MarsDemStatsInput {
  elevationRelativeM?: number;
  meanSlopeDeg?: number;
  roughnessIndex?: number;
}

export function formatMarsCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

export function makeCustomMarsTargetId(lat: number, lon: number): string {
  const latTag = `${lat >= 0 ? 'n' : 's'}${Math.abs(lat).toFixed(2).replace('.', '_')}`;
  const lonTag = `${lon >= 0 ? 'e' : 'w'}${Math.abs(lon).toFixed(2).replace('.', '_')}`;
  return `mars-loc-${latTag}-${lonTag}`;
}

function angularDistanceDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const p1 = lat1 * toRad;
  const p2 = lat2 * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const cosD = Math.max(
    -1,
    Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dLon))
  );
  return (Math.acos(cosD) * 180) / Math.PI;
}

function inferMarsProvince(
  lat: number,
  lon: number,
  dem?: MarsDemStatsInput
): {
  province: MarsLandmark['province'];
  nearestLandmark: MarsLandmark | null;
  distanceDeg: number;
} {
  let nearest: MarsLandmark | null = null;
  let bestDist = Infinity;
  for (const lm of MARS_LANDMARKS) {
    const d = angularDistanceDeg(lat, lon, lm.lat, lm.lon);
    if (d < bestDist) {
      bestDist = d;
      nearest = lm;
    }
  }

  if (nearest && bestDist <= 4.0) {
    return { province: nearest.province, nearestLandmark: nearest, distanceDeg: bestDist };
  }

  const absLat = Math.abs(lat);
  const elev = dem?.elevationRelativeM ?? 0;

  if (absLat >= 68) {
    return { province: 'polar-ice-cap', nearestLandmark: nearest, distanceDeg: bestDist };
  }
  if (absLat >= 35 && elev < -1500) {
    return { province: 'buried-ice-plain', nearestLandmark: nearest, distanceDeg: bestDist };
  }
  if (elev >= 4500) {
    return { province: 'volcanic-shield', nearestLandmark: nearest, distanceDeg: bestDist };
  }
  if (lat >= -20 && lat <= 25 && lon >= -95 && lon <= -30) {
    return { province: 'sulfate-sedimentary', nearestLandmark: nearest, distanceDeg: bestDist };
  }
  return { province: 'basalt-plain', nearestLandmark: nearest, distanceDeg: bestDist };
}

export function buildCustomMarsTarget(input: {
  lat: number;
  lon: number;
  name?: string;
  dem?: MarsDemStatsInput;
}): PlanetaryTarget {
  const lat = Math.max(-90, Math.min(90, Number(input.lat.toFixed(4))));
  const lon = Math.max(-180, Math.min(180, Number(input.lon.toFixed(4))));
  const absLat = Math.abs(lat);
  const { province, nearestLandmark, distanceDeg } = inferMarsProvince(lat, lon, input.dem);

  const elevM = Math.round(
    input.dem?.elevationRelativeM ??
      (province === 'volcanic-shield'
        ? 8500
        : province === 'buried-ice-plain'
          ? -3800
          : province === 'sulfate-sedimentary'
            ? -3200
            : -1800)
  );
  const slopeDeg = Number(
    Math.max(
      0.8,
      Math.min(
        40,
        input.dem?.meanSlopeDeg ??
          (province === 'basalt-plain' || province === 'buried-ice-plain'
            ? 2.6
            : province === 'sulfate-sedimentary' || province === 'lava-tube'
              ? 8.5
              : 4.9)
      )
    ).toFixed(2)
  );
  const roughness = Number(
    Math.max(
      0.12,
      Math.min(
        0.95,
        input.dem?.roughnessIndex ??
          (province === 'basalt-plain' || province === 'buried-ice-plain' ? 0.32 : 0.54)
      )
    ).toFixed(2)
  );

  // Martian surface temperature calibrated by latitude & MOLA elevation (~1.5 K/km lapse)
  const cosLat = Math.cos((absLat * Math.PI) / 180);
  const lapseShift = -(elevM / 1000) * 1.4;
  const meanTempC = Math.round(-118 + 64 * Math.pow(cosLat, 0.55) + lapseShift);
  const diurnalSwingC = Math.round(28 + 52 * cosLat);
  const minTempC = Math.round(meanTempC - diurnalSwingC * 0.52);
  const maxTempC = Math.round(meanTempC + diurnalSwingC * 0.62);

  // Martian hydrostatic CO2 scale height (~11.1 km from 610 Pa datum)
  const surfacePressurePa = Math.max(40, Math.round(610 * Math.exp(-elevM / 11100)));

  let dominantMinerals: string[];
  let waterIceTargetScore: number;
  let waterIceStatus: string;
  let dustHazardLevel: number;
  let lavaTubeRelevance: number;
  let keyHazard: string;
  let keyResource: string;
  let regionLabel: string;

  switch (province) {
    case 'lacustrine-delta':
      dominantMinerals = ['basalt', 'smectite clay', 'carbonate', 'olivine', 'sulfate', 'perchlorate'];
      waterIceTargetScore = 58;
      waterIceStatus = 'Hydrated phyllosilicates & carbonates storing mineral-bound water';
      dustHazardLevel = 76;
      lavaTubeRelevance = 14;
      keyHazard = 'Oxidizing soil perchlorates, seasonal dust storms, and boulder-strewn delta scarps';
      keyResource = 'Clay-bound ISRU water + ancient lacustrine organic biosignature strata';
      regionLabel = 'Martian Paleolake & Delta Province';
      break;
    case 'sulfate-sedimentary':
      dominantMinerals = ['basalt', 'sulfate', 'gypsum', 'jarosite', 'hematite', 'perchlorate'];
      waterIceTargetScore = 54;
      waterIceStatus = 'Polyhydrated sulfates (gypsum/kieserite) and acidic evaporite mudstones';
      dustHazardLevel = 78;
      lavaTubeRelevance = 12;
      keyHazard = 'Steep canyon/layered-scarp slopes, acidic sulfate brines, and abrasive ferric dust';
      keyResource = 'Gypsum/sulfate thermal water extraction + low-elevation aerobraking density';
      regionLabel = 'Sulfate Evaporite & Canyon Terrain';
      break;
    case 'lava-tube':
      dominantMinerals = ['basalt', 'olivine', 'pyroxene', 'plagioclase', 'hematite', 'perchlorate'];
      waterIceTargetScore = 36;
      waterIceStatus = 'Deep volcanic basalt fractures; potential subsurface cave ice cold-trapping';
      dustHazardLevel = 74;
      lavaTubeRelevance = 94;
      keyHazard = 'Steep skylight collapse rims, high-altitude thin atmosphere, and basaltic dust';
      keyResource = 'Massive subterranean basaltic lava tubes for radiation & dust-storm shielding';
      regionLabel = 'Martian Volcanic Skylight & Lava Tube';
      break;
    case 'volcanic-shield':
      dominantMinerals = ['basalt', 'olivine', 'pyroxene', 'plagioclase', 'hematite'];
      waterIceTargetScore = 24;
      waterIceStatus = 'Arid high-altitude mafic lava plains; minimal surface volatiles';
      dustHazardLevel = 72;
      lavaTubeRelevance = 78;
      keyHazard = 'Ultra-low atmospheric pressure hindering EDL aerobraking & steep caldera flanks';
      keyResource = 'Pristine basaltic bedrock + extensive shield-flank lava tube networks';
      regionLabel = 'Tharsis Volcanic Shield Province';
      break;
    case 'buried-ice-plain':
      dominantMinerals = ['subsurface water ice', 'basalt', 'smectite clay', 'perchlorate', 'hematite'];
      waterIceTargetScore = 92;
      waterIceStatus = 'High-purity mid-latitude buried glacier ice sheet <1 m beneath dry dust mantle';
      dustHazardLevel = 74;
      lavaTubeRelevance = 10;
      keyHazard = 'Cryogenic permafrost overburden, perchlorate brines, and seasonal polar frost';
      keyResource = 'Shallow mineable water-ice sheet ideal for Mars LOX/CH4 ISRU propellant';
      regionLabel = 'Mid-Latitude Buried Permafrost & Ice Plain';
      break;
    case 'polar-ice-cap':
      dominantMinerals = ['subsurface water ice', 'gypsum', 'basalt', 'perchlorate', 'sulfate'];
      waterIceTargetScore = 99;
      waterIceStatus = 'Exposed kilometer-thick water-ice & seasonal CO2 polar layered deposits';
      dustHazardLevel = 66;
      lavaTubeRelevance = 6;
      keyHazard = 'Extreme polar winter (-135°C) with CO2 dry-ice snowfall and months of darkness';
      keyResource = 'Unlimited exposed surface water ice & paleoclimate gypsum dust strata';
      regionLabel = 'Martian Polar Ice Cap & Cold Trap';
      break;
    case 'hydrothermal-clay':
      dominantMinerals = ['carbonate', 'olivine', 'smectite clay', 'basalt', 'sulfate', 'perchlorate'];
      waterIceTargetScore = 64;
      waterIceStatus = 'Carbonate-serpentine hydrothermal alteration zones with structural OH/H2O';
      dustHazardLevel = 75;
      lavaTubeRelevance = 18;
      keyHazard = 'Fractured trench scarps, reactive perchlorates, and sharp olivine bedrock blocks';
      keyResource = 'Ancient serpentinization & hydrothermal biosignature preservation targets';
      regionLabel = 'Hydrothermal Carbonate & Clay Province';
      break;
    default:
      dominantMinerals = ['basalt', 'olivine', 'hematite', 'sulfate', 'perchlorate'];
      waterIceTargetScore = absLat >= 35 ? 68 : 34;
      waterIceStatus =
        absLat >= 35
          ? 'High-latitude periglacial ground ice possible below ~0.5–1.5 m regolith lag'
          : 'Dust-mantled basaltic regolith with hydrated mineral traces & perchlorate salts';
      dustHazardLevel = 82;
      lavaTubeRelevance = 22;
      keyHazard = 'Global ferric dust storms, electrostatic fines, and ~0.5–1 wt% toxic perchlorates';
      keyResource = 'Smooth landing plains, accessible basalt regolith, and aerobraking density';
      regionLabel = 'Martian Basaltic Plain & Dust Regime';
      break;
  }

  const coordsText = formatMarsCoords(lat, lon);
  const customTitle = input.name?.trim()
    ? input.name.trim()
    : nearestLandmark && distanceDeg <= 4.5
      ? `${nearestLandmark.name} Sector`
      : `Mars Site (${coordsText})`;

  const landmarkContext =
    nearestLandmark && distanceDeg <= 12
      ? `Located ~${distanceDeg.toFixed(1)}° from ${nearestLandmark.name}. ${nearestLandmark.notes}`
      : `Custom Martian coordinate (${coordsText}) modeled via live NASA MGS MOLA DEM relief, hydrostatic scale-height pressure (~${surfacePressurePa} Pa), and latitude-calibrated thermal regime.`;

  return {
    id: makeCustomMarsTargetId(lat, lon),
    body: 'mars',
    name: customTitle,
    region: regionLabel,
    coordinates: coordsText,
    lat,
    lon,
    elevationRelativeM: elevM,
    meanTempC,
    minTempC,
    maxTempC,
    diurnalSwingC,
    typicalSlopeDeg: slopeDeg,
    roughnessIndex: roughness,
    gravityG: 0.379,
    surfacePressurePa,
    dominantMinerals,
    waterIceStatus,
    waterIceTargetScore,
    dustHazardLevel,
    dustDescription:
      '2–4 µm oxidized ferric basaltic dust, electrostatic clinging, and ~0.5–1 wt% soil perchlorates.',
    lavaTubeRelevance,
    radiationSvPerYear: province === 'lava-tube' ? 0.08 : 0.24,
    keyHazard,
    keyResource,
    missionSummary: landmarkContext,
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Mars Trek / Viking MDIM2.1 + MGS MOLA',
    pdsCitations: [
      'NASA PDS MGS MOLA Precision Experiment Data Record (MGS-M-MOLA-3-PEDR-L1A-V1.0)',
      'NASA PDS MRO CRISM & Mars Odyssey THEMIS Thermal Inertia Archive'
    ]
  };
}
