export type SolarPlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface KeplerianElements {
  id: SolarPlanetId;
  name: string;
  jplId: string;
  a: number; // Semi-major axis (AU)
  e: number; // Eccentricity
  iDeg: number; // Inclination to ecliptic (deg)
  nodeDeg: number; // Longitude of ascending node (deg)
  omegaBarDeg: number; // Longitude of perihelion (deg)
  l0Deg: number; // Mean longitude at J2000.0 (deg)
  periodDays: number; // Sidereal orbital period (days)
  axialTiltDeg: number;
  rotationHours: number; // Negative = retrograde
  meanRadiusKm: number;
  displayScale: number;
  colorHex: string;
  orbitColorHex: string;
}

export interface JplBodyVector {
  id: string;
  name: string;
  status: 'live' | 'archived';
  xAu: number;
  yAu: number;
  zAu: number;
  vxAuDay: number;
  vyAuDay: number;
  vzAuDay: number;
  rangeAu: number;
  speedKmS: number;
}

export interface SolarEphemerisReport {
  epochIso: string;
  julianDate: number;
  source: 'nasa-jpl-horizons' | 'j2000-keplerian';
  planets: Record<SolarPlanetId, JplBodyVector>;
  moonGeocentric: {
    status: 'live' | 'archived';
    xKm: number;
    yKm: number;
    zKm: number;
    distanceKm: number;
    speedKmS: number;
  };
}

// NASA/JPL Standish (1992) & Planetary Fact Sheet J2000.0 Elements
export const SOLAR_PLANETS: KeplerianElements[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    jplId: '199',
    a: 0.387099,
    e: 0.205636,
    iDeg: 7.0049,
    nodeDeg: 48.3307,
    omegaBarDeg: 77.4578,
    l0Deg: 252.2503,
    periodDays: 87.969,
    axialTiltDeg: 0.03,
    rotationHours: 1407.6,
    meanRadiusKm: 2439.7,
    displayScale: 0.24,
    colorHex: '#A8A29E',
    orbitColorHex: '#94A3B8'
  },
  {
    id: 'venus',
    name: 'Venus',
    jplId: '299',
    a: 0.723336,
    e: 0.006777,
    iDeg: 3.3947,
    nodeDeg: 76.6798,
    omegaBarDeg: 131.6025,
    l0Deg: 181.9791,
    periodDays: 224.701,
    axialTiltDeg: 177.36,
    rotationHours: -5832.5,
    meanRadiusKm: 6051.8,
    displayScale: 0.42,
    colorHex: '#FCD34D',
    orbitColorHex: '#FDE68A'
  },
  {
    id: 'earth',
    name: 'Earth',
    jplId: '399',
    a: 1.000003,
    e: 0.016711,
    iDeg: 0.0,
    nodeDeg: 0.0,
    omegaBarDeg: 102.9377,
    l0Deg: 100.4646,
    periodDays: 365.256,
    axialTiltDeg: 23.44,
    rotationHours: 23.93,
    meanRadiusKm: 6371.0,
    displayScale: 0.5,
    colorHex: '#38BDF8',
    orbitColorHex: '#38BDF8'
  },
  {
    id: 'mars',
    name: 'Mars',
    jplId: '499',
    a: 1.52371,
    e: 0.093394,
    iDeg: 1.8497,
    nodeDeg: 49.5595,
    omegaBarDeg: -23.9436,
    l0Deg: -4.5534,
    periodDays: 686.98,
    axialTiltDeg: 25.19,
    rotationHours: 24.62,
    meanRadiusKm: 3389.5,
    displayScale: 0.38,
    colorHex: '#FB923C',
    orbitColorHex: '#FB923C'
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    jplId: '599',
    a: 5.202887,
    e: 0.048386,
    iDeg: 1.3044,
    nodeDeg: 100.4739,
    omegaBarDeg: 14.7285,
    l0Deg: 34.3964,
    periodDays: 4332.59,
    axialTiltDeg: 3.13,
    rotationHours: 9.93,
    meanRadiusKm: 69911,
    displayScale: 1.15,
    colorHex: '#FDBA74',
    orbitColorHex: '#F59E0B'
  },
  {
    id: 'saturn',
    name: 'Saturn',
    jplId: '699',
    a: 9.536676,
    e: 0.053862,
    iDeg: 2.4859,
    nodeDeg: 113.6624,
    omegaBarDeg: 92.5989,
    l0Deg: 49.9542,
    periodDays: 10759.22,
    axialTiltDeg: 26.73,
    rotationHours: 10.7,
    meanRadiusKm: 58232,
    displayScale: 0.96,
    colorHex: '#FDE68A',
    orbitColorHex: '#FCD34D'
  },
  {
    id: 'uranus',
    name: 'Uranus',
    jplId: '799',
    a: 19.189165,
    e: 0.047257,
    iDeg: 0.7726,
    nodeDeg: 74.0169,
    omegaBarDeg: 170.9543,
    l0Deg: 313.2381,
    periodDays: 30685.4,
    axialTiltDeg: 97.77,
    rotationHours: -17.24,
    meanRadiusKm: 25362,
    displayScale: 0.62,
    colorHex: '#67E8F9',
    orbitColorHex: '#22D3EE'
  },
  {
    id: 'neptune',
    name: 'Neptune',
    jplId: '899',
    a: 30.069923,
    e: 0.00859,
    iDeg: 1.77,
    nodeDeg: 131.7842,
    omegaBarDeg: 44.9648,
    l0Deg: -55.12,
    periodDays: 60189.0,
    axialTiltDeg: 28.32,
    rotationHours: 16.11,
    meanRadiusKm: 24622,
    displayScale: 0.6,
    colorHex: '#60A5FA',
    orbitColorHex: '#3B82F6'
  }
];

export function dateToJulianDate(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

const DEG2RAD = Math.PI / 180;

// Power-law AU compression so Mercury (0.39 AU) through Neptune (30.1 AU) remain balanced in 3D space
// while preserving true eccentricity, inclination, and heliocentric longitude
export function auToDisplayCoords(xAu: number, yAu: number, zAu: number): { x: number; y: number; z: number } {
  const rAu = Math.hypot(xAu, yAu, zAu);
  if (rAu < 1e-6) return { x: 0, y: 0, z: 0 };
  const rDisplay = 3.6 + Math.pow(rAu, 0.56) * 4.55;
  const scale = rDisplay / rAu;
  // Map ecliptic (X, Y, Z) -> Three.js (X, Z_up, -Y)
  return {
    x: xAu * scale,
    y: zAu * scale,
    z: -yAu * scale
  };
}

export function solveKeplerHeliocentricAu(
  el: KeplerianElements,
  julianDate: number
): { xAu: number; yAu: number; zAu: number; rangeAu: number; speedKmS: number } {
  const d = julianDate - 2451545.0; // Days since J2000.0
  const n = 360 / el.periodDays; // deg/day
  const L = (el.l0Deg + n * d) % 360;
  const omega = el.omegaBarDeg - el.nodeDeg;
  let M = (L - el.omegaBarDeg) % 360;
  if (M < -180) M += 360;
  if (M > 180) M -= 360;
  const mRad = M * DEG2RAD;

  // Solve Kepler's equation M = E - e sin(E) via Newton-Raphson
  let E = mRad + el.e * Math.sin(mRad);
  for (let iter = 0; iter < 6; iter++) {
    const f = E - el.e * Math.sin(E) - mRad;
    const fp = 1 - el.e * Math.cos(E);
    E -= f / fp;
  }

  const xOrb = el.a * (Math.cos(E) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const wRad = omega * DEG2RAD;
  const nodeRad = el.nodeDeg * DEG2RAD;
  const iRad = el.iDeg * DEG2RAD;

  const cosW = Math.cos(wRad);
  const sinW = Math.sin(wRad);
  const cosO = Math.cos(nodeRad);
  const sinO = Math.sin(nodeRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);

  const xAu =
    (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
  const yAu =
    (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
  const zAu = sinW * sinI * xOrb + cosW * sinI * yOrb;

  const rangeAu = Math.hypot(xAu, yAu, zAu);
  // Vis-viva orbital speed (km/s): mu_sun = 29.7847^2 * 1 AU
  const speedKmS = 29.7847 * Math.sqrt(2 / rangeAu - 1 / el.a);

  return { xAu, yAu, zAu, rangeAu, speedKmS };
}

export function buildKeplerOrbitDisplayPoints(
  el: KeplerianElements,
  segments = 192
): Array<{ x: number; y: number; z: number }> {
  const pts: Array<{ x: number; y: number; z: number }> = [];
  for (let s = 0; s < segments; s++) {
    const jdSample = 2451545.0 + (s / segments) * el.periodDays;
    const { xAu, yAu, zAu } = solveKeplerHeliocentricAu(el, jdSample);
    pts.push(auToDisplayCoords(xAu, yAu, zAu));
  }
  return pts;
}
