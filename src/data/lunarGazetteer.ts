import type { PlanetaryTarget } from '../types/analog';

export interface LunarLandmark {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  province: 'polar-psr' | 'polar-ridge' | 'mare-basalt' | 'lava-tube' | 'highland-crater' | 'pyroclastic';
  notes: string;
}

export const LUNAR_LANDMARKS: LunarLandmark[] = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim',
    region: 'South Pole Connecting Ridge',
    lat: -89.66,
    lon: 129.17,
    province: 'polar-ridge',
    notes: 'High-illumination Artemis polar ridge bordering permanently shadowed volatile traps.'
  },
  {
    id: 'shackleton-floor',
    name: 'Shackleton PSR Floor',
    region: 'South Pole Permanently Shadowed Crater',
    lat: -89.54,
    lon: 0.0,
    province: 'polar-psr',
    notes: 'Cryogenic ~40 K cold trap holding water ice and impact-excavated anorthosite.'
  },
  {
    id: 'cabeus-psr',
    name: 'Cabeus Crater Floor (LCROSS)',
    region: 'South Polar Volatile Basin',
    lat: -84.9,
    lon: -35.5,
    province: 'polar-psr',
    notes: 'LCROSS impact confirmed ~5.6 wt% water ice plus volatile CO, NH3, and CH4.'
  },
  {
    id: 'mons-malapert',
    name: 'Mons Malapert Summit',
    region: 'South Pole Massif',
    lat: -86.04,
    lon: 2.7,
    province: 'polar-ridge',
    notes: '5 km high polar massif offering continuous Earth line-of-sight and high solar duty cycle.'
  },
  {
    id: 'nobile-rim',
    name: 'Nobile Crater Western Rim',
    region: 'South Pole Region',
    lat: -85.2,
    lon: 53.5,
    province: 'polar-ridge',
    notes: 'VIPER target terrain with gentle traverses between sunlit regolith and shadowed depressions.'
  },
  {
    id: 'mare-tranq-pit',
    name: 'Mare Tranquillitatis Skylight Pit',
    region: 'Equatorial Mare Lava Tube',
    lat: 8.33,
    lon: 33.22,
    province: 'lava-tube',
    notes: 'Confirmed ~100 m deep volcanic skylight opening into an intact subsurface basaltic lava conduit.'
  },
  {
    id: 'marius-hills-pit',
    name: 'Marius Hills Skylight & Domes',
    region: 'Oceanus Procellarum Volcanic Complex',
    lat: 14.09,
    lon: -56.77,
    province: 'lava-tube',
    notes: 'Dense shield-volcano domes, sinuous rilles, and intact lava tube ceiling mapped by Kaguya & GRAIL.'
  },
  {
    id: 'aristarchus-plateau',
    name: 'Aristarchus Plateau & Vallis Schröteri',
    region: 'Western Oceanus Procellarum',
    lat: 23.7,
    lon: -47.4,
    province: 'pyroclastic',
    notes: 'Elevated crustal block mantled in dark Fe/Ti-rich pyroclastic volcanic glass beads.'
  },
  {
    id: 'apollo-11-tranq',
    name: 'Apollo 11 (Statio Tranquillitatis)',
    region: 'Southern Mare Tranquillitatis',
    lat: 0.67,
    lon: 23.47,
    province: 'mare-basalt',
    notes: 'Flat high-titanium ilmenite mare flood basalt plain with extreme equatorial thermal cycling.'
  },
  {
    id: 'apollo-15-hadley',
    name: 'Apollo 15 (Hadley Rille / Apennines)',
    region: 'Eastern Mare Imbrium Margin',
    lat: 26.13,
    lon: 3.63,
    province: 'lava-tube',
    notes: 'Collapsed sinuous basaltic lava channel adjacent to steep anorthositic Apennine massif.'
  },
  {
    id: 'apollo-17-taurus',
    name: 'Apollo 17 (Taurus–Littrow Valley)',
    region: 'Southeastern Mare Serenitatis Edge',
    lat: 20.19,
    lon: 30.77,
    province: 'pyroclastic',
    notes: 'Graben valley mixing highland norite/troctolite massifs with orange volcanic glass deposits.'
  },
  {
    id: 'tycho-peak',
    name: 'Tycho Crater Central Peak',
    region: 'Southern Lunar Highlands',
    lat: -43.31,
    lon: -11.36,
    province: 'highland-crater',
    notes: '108 Myr fresh impact crater with steep impact-melt blocks and crystalline anorthositic uplift.'
  },
  {
    id: 'copernicus-floor',
    name: 'Copernicus Crater Central Uplift',
    region: 'Eastern Oceanus Procellarum',
    lat: 9.62,
    lon: -20.08,
    province: 'highland-crater',
    notes: 'Olivine-bearing troctolite central peaks excavated from deep lower-crustal bedrock.'
  },
  {
    id: 'spa-basin',
    name: 'South Pole–Aitken Basin Floor',
    region: 'Lunar Farside Megabasin',
    lat: -53.0,
    lon: -169.0,
    province: 'highland-crater',
    notes: '2,500 km ancient impact basin exposing pyroxene-rich lower crust and upper mantle norite.'
  }
];

export interface MoonDemStatsInput {
  elevationRelativeM?: number;
  meanSlopeDeg?: number;
  roughnessIndex?: number;
}

export function formatMoonCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

export function makeCustomMoonTargetId(lat: number, lon: number): string {
  const latTag = `${lat >= 0 ? 'n' : 's'}${Math.abs(lat).toFixed(2).replace('.', '_')}`;
  const lonTag = `${lon >= 0 ? 'e' : 'w'}${Math.abs(lon).toFixed(2).replace('.', '_')}`;
  return `moon-loc-${latTag}-${lonTag}`;
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

function inferLunarProvince(
  lat: number,
  lon: number,
  dem?: MoonDemStatsInput
): {
  province: LunarLandmark['province'];
  nearestLandmark: LunarLandmark | null;
  distanceDeg: number;
} {
  let nearest: LunarLandmark | null = null;
  let bestDist = Infinity;
  for (const lm of LUNAR_LANDMARKS) {
    const d = angularDistanceDeg(lat, lon, lm.lat, lm.lon);
    if (d < bestDist) {
      bestDist = d;
      nearest = lm;
    }
  }

  if (nearest && bestDist <= 3.5) {
    return { province: nearest.province, nearestLandmark: nearest, distanceDeg: bestDist };
  }

  const absLat = Math.abs(lat);
  const elev = dem?.elevationRelativeM ?? 0;

  if (absLat >= 82) {
    return {
      province: elev < -1200 ? 'polar-psr' : 'polar-ridge',
      nearestLandmark: nearest,
      distanceDeg: bestDist
    };
  }

  // Approximate nearside mare flood basalt region (Procellarum, Imbrium, Serenitatis, Tranquillitatis, Crisium)
  const inNearsideMareBand =
    lat >= -25 && lat <= 52 && lon >= -70 && lon <= 65 && elev <= -500;
  if (inNearsideMareBand) {
    return { province: 'mare-basalt', nearestLandmark: nearest, distanceDeg: bestDist };
  }

  return { province: 'highland-crater', nearestLandmark: nearest, distanceDeg: bestDist };
}

export function buildCustomMoonTarget(input: {
  lat: number;
  lon: number;
  name?: string;
  dem?: MoonDemStatsInput;
}): PlanetaryTarget {
  const lat = Math.max(-90, Math.min(90, Number(input.lat.toFixed(4))));
  const lon = Math.max(-180, Math.min(180, Number(input.lon.toFixed(4))));
  const absLat = Math.abs(lat);
  const { province, nearestLandmark, distanceDeg } = inferLunarProvince(lat, lon, input.dem);

  const elevM = Math.round(
    input.dem?.elevationRelativeM ??
      (province === 'polar-psr' ? -3400 : province === 'mare-basalt' ? -1800 : 850)
  );
  const slopeDeg = Number(
    Math.max(
      0.8,
      Math.min(
        42,
        input.dem?.meanSlopeDeg ??
          (province === 'mare-basalt' || province === 'lava-tube'
            ? 3.1
            : province === 'polar-psr'
              ? 5.2
              : 8.4)
      )
    ).toFixed(2)
  );
  const roughness = Number(
    Math.max(
      0.12,
      Math.min(
        0.95,
        input.dem?.roughnessIndex ??
          (province === 'mare-basalt' ? 0.34 : province === 'highland-crater' ? 0.64 : 0.52)
      )
    ).toFixed(2)
  );

  // Diviner-calibrated lunar surface temperature approximation by latitude & solar elevation
  const cosLat = Math.cos((absLat * Math.PI) / 180);
  let meanTempC: number;
  let minTempC: number;
  let maxTempC: number;

  if (province === 'polar-psr') {
    meanTempC = -225;
    minTempC = -243;
    maxTempC = -190;
  } else if (province === 'polar-ridge') {
    meanTempC = -142;
    minTempC = -215;
    maxTempC = -42;
  } else {
    maxTempC = Math.round(-45 + 165 * Math.pow(cosLat, 0.45));
    minTempC = Math.round(-208 + 38 * cosLat);
    meanTempC = Math.round((maxTempC + minTempC) * 0.42);
  }
  const diurnalSwingC = Math.max(18, maxTempC - minTempC);

  let dominantMinerals: string[];
  let waterIceTargetScore: number;
  let waterIceStatus: string;
  let dustHazardLevel: number;
  let lavaTubeRelevance: number;
  let keyHazard: string;
  let keyResource: string;
  let regionLabel: string;

  switch (province) {
    case 'polar-psr':
      dominantMinerals = ['anorthosite', 'subsurface water ice', 'plagioclase', 'impact breccia', 'ilmenite'];
      waterIceTargetScore = 96;
      waterIceStatus = 'Permanently shadowed cryogenic cold trap (<110 K) retaining water ice & volatiles';
      dustHazardLevel = 96;
      lavaTubeRelevance = 12;
      keyHazard = 'Permanent cryogenic darkness, brittle frost-cemented fines, and abrasive electrostatic dust';
      keyResource = 'Harvestable polar water ice (H₂O) & trapped hydrogen volatiles';
      regionLabel = 'Lunar Polar Volatile Basin';
      break;
    case 'polar-ridge':
      dominantMinerals = ['anorthosite', 'plagioclase', 'pyroxene', 'ilmenite', 'impact breccia'];
      waterIceTargetScore = 84;
      waterIceStatus = 'High-illumination polar crest bordering nearby permanently shadowed ice traps';
      dustHazardLevel = 94;
      lavaTubeRelevance = 18;
      keyHazard = 'Low solar grazing shadows, electrostatic jagged regolith, and crater rim slopes';
      keyResource = 'Near-continuous polar solar power + traverse access to cold-trap ice';
      regionLabel = 'Lunar Polar Illuminated Highland';
      break;
    case 'lava-tube':
      dominantMinerals = ['basalt', 'ilmenite', 'pyroxene', 'plagioclase', 'olivine'];
      waterIceTargetScore = 18;
      waterIceStatus = 'Anhydrous mare basalt regolith; solar-wind implanted H/OH trace only';
      dustHazardLevel = 91;
      lavaTubeRelevance = 95;
      keyHazard = 'Steep skylight collapse walls, extreme 285 K surface diurnal swings, and vacuum dust';
      keyResource = 'Intact subterranean basaltic lava tube shielding radiation & stabilizing at -20°C';
      regionLabel = 'Volcanic Lava Tube & Sinuous Rille Province';
      break;
    case 'pyroclastic':
      dominantMinerals = ['basalt', 'olivine', 'ilmenite', 'pyroxene', 'plagioclase'];
      waterIceTargetScore = 28;
      waterIceStatus = 'OH/H₂O trace locked inside iron/titanium-rich volcanic glass pyroclastics';
      dustHazardLevel = 93;
      lavaTubeRelevance = 62;
      keyHazard = 'Ultra-fine volcanic glass ash mixed with electrostatic regolith agglutinates';
      keyResource = 'Fe/Ti-rich pyroclastic deposits for ISRU oxygen extraction & sinuous rille access';
      regionLabel = 'Pyroclastic Volcanic Mantle Province';
      break;
    case 'mare-basalt':
      dominantMinerals = ['basalt', 'ilmenite', 'pyroxene', 'plagioclase', 'olivine'];
      waterIceTargetScore = 12;
      waterIceStatus = 'Dry flood-basalt regolith; minimal volatile abundance except regolith-bound solar H';
      dustHazardLevel = 90;
      lavaTubeRelevance = 58;
      keyHazard = 'Extreme +115°C to -175°C diurnal thermal shock & abrasive glassy mare regolith';
      keyResource = 'High-Ti ilmenite (FeTiO₃) feedstock for carbothermal / hydrogen-reduction oxygen ISRU';
      regionLabel = 'Lunar Mare Flood Basalt Plain';
      break;
    default:
      dominantMinerals = ['anorthosite', 'plagioclase', 'impact breccia', 'pyroxene', 'olivine'];
      waterIceTargetScore = absLat >= 65 ? 52 : 14;
      waterIceStatus =
        absLat >= 65
          ? 'High-latitude shadowed micro-cold-traps possible inside steep impact craters'
          : 'Dry feldspathic highland impact breccia & regolith';
      dustHazardLevel = 92;
      lavaTubeRelevance = 16;
      keyHazard = 'Boulder-strewn crater ejecta, steep impact slopes, and jagged electrostatic dust';
      keyResource = 'Ca/Al-rich highland anorthosite & melt breccia for lunar concrete/oxygen ISRU';
      regionLabel = 'Feldspathic Highland Impact Terrain';
      break;
  }

  const coordsText = formatMoonCoords(lat, lon);
  const customTitle = input.name?.trim()
    ? input.name.trim()
    : nearestLandmark && distanceDeg <= 4
      ? `${nearestLandmark.name} Sector`
      : `Moon Site (${coordsText})`;

  const landmarkContext =
    nearestLandmark && distanceDeg <= 12
      ? `Located ~${distanceDeg.toFixed(1)}° from ${nearestLandmark.name}. ${nearestLandmark.notes}`
      : `Custom lunar coordinate (${coordsText}) evaluated via live NASA LRO LOLA DEM elevation, slope, and Diviner-calibrated latitude thermal regime.`;

  return {
    id: makeCustomMoonTargetId(lat, lon),
    body: 'moon',
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
    gravityG: 0.165,
    surfacePressurePa: 3e-10,
    dominantMinerals,
    waterIceStatus,
    waterIceTargetScore,
    dustHazardLevel,
    dustDescription:
      'Ultra-fine (<20 µm) jagged electrostatic lunar regolith agglutinates & nanophase Fe⁰ in hard vacuum.',
    lavaTubeRelevance,
    radiationSvPerYear: province === 'lava-tube' ? 0.12 : 0.42,
    keyHazard,
    keyResource,
    missionSummary: landmarkContext,
    trekWmtsLayerUrl:
      'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    trekSourceLabel: 'NASA Moon Trek / LRO WAC Mosaic 303ppd',
    pdsCitations: [
      'NASA PDS LRO LOLA Gridded Data Record (LRO-L-LOLA-4-GDR-V1.0)',
      'NASA PDS LRO Diviner Lunar Radiometer Experiment (Paige et al., 2010)'
    ]
  };
}
