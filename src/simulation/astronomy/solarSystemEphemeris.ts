import * as Astronomy from 'astronomy-engine';

export type SolarSystemScaleMode = 'educational' | 'true-scale';

export type CelestialFocusTarget =
  | 'Earth'
  | 'Moon'
  | 'Earth-Moon-System'
  | 'Sun'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

export type CelestialBodyId =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Earth'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

export const KM_PER_AU = 149_597_870.7;
export const EARTH_EQUATORIAL_RADIUS_KM = 6_371.0;
export const TRUE_SCALE_EARTH_RADII_PER_AU = KM_PER_AU / EARTH_EQUATORIAL_RADIUS_KM; // ~23,481.07 R_earth

/**
 * IAU WGCCRE equatorial radii (km) and approximate sidereal orbital periods (Earth days)
 * used for trajectory ring sampling and true-scale radius conversion.
 */
export const BODY_PHYSICAL_CONSTANTS: Record<
  CelestialBodyId,
  {
    equatorialRadiusKm: number;
    orbitalPeriodDays: number;
    educationalRadiusScene: number;
    colorHex: string;
    textureFilename: string;
  }
> = {
  Sun: {
    equatorialRadiusKm: 695_700,
    orbitalPeriodDays: 0,
    educationalRadiusScene: 7.5,
    colorHex: '#fbbf24',
    textureFilename: 'sun.jpg',
  },
  Moon: {
    equatorialRadiusKm: 1_737.4,
    orbitalPeriodDays: 27.321661,
    educationalRadiusScene: 0.34,
    colorHex: '#cbd5e1',
    textureFilename: 'moon.jpg',
  },
  Mercury: {
    equatorialRadiusKm: 2_439.7,
    orbitalPeriodDays: 87.969,
    educationalRadiusScene: 0.45,
    colorHex: '#94a3b8',
    textureFilename: 'mercury.jpg',
  },
  Venus: {
    equatorialRadiusKm: 6_051.8,
    orbitalPeriodDays: 224.701,
    educationalRadiusScene: 0.88,
    colorHex: '#fde047',
    textureFilename: 'venus.jpg',
  },
  Earth: {
    equatorialRadiusKm: 6_371.0,
    orbitalPeriodDays: 365.256,
    educationalRadiusScene: 1.0,
    colorHex: '#38bdf8',
    textureFilename: 'earth_daymap.jpg',
  },
  Mars: {
    equatorialRadiusKm: 3_389.5,
    orbitalPeriodDays: 686.98,
    educationalRadiusScene: 0.62,
    colorHex: '#f97316',
    textureFilename: 'mars.jpg',
  },
  Jupiter: {
    equatorialRadiusKm: 69_911,
    orbitalPeriodDays: 4_332.59,
    educationalRadiusScene: 2.75,
    colorHex: '#fdba74',
    textureFilename: 'jupiter.jpg',
  },
  Saturn: {
    equatorialRadiusKm: 58_232,
    orbitalPeriodDays: 10_759.22,
    educationalRadiusScene: 2.35,
    colorHex: '#fde68a',
    textureFilename: 'saturn.jpg',
  },
  Uranus: {
    equatorialRadiusKm: 25_362,
    orbitalPeriodDays: 30_688.5,
    educationalRadiusScene: 1.55,
    colorHex: '#67e8f9',
    textureFilename: 'uranus.jpg',
  },
  Neptune: {
    equatorialRadiusKm: 24_622,
    orbitalPeriodDays: 60_182,
    educationalRadiusScene: 1.5,
    colorHex: '#60a5fa',
    textureFilename: 'neptune.jpg',
  },
};

export interface ComputedBodyEphemeris {
  id: CelestialBodyId;
  heliocentricAu: [number, number, number];
  geocentricAu: [number, number, number];
  distanceFromSunAu: number;
  distanceFromSunMillionKm: number;
  distanceFromEarthAu: number;
  distanceFromEarthKm: number;
  orbitalSpeedKmS: number;
  equatorialRadiusKm: number;
  radiusInEarthRadii: number;
  siderealDayHours: number;
  solarDayHours: number;
  axialTiltDeg: number;
  spinAngleDeg: number;
  /** Scene position in Three.js coordinates (Earth = [0, 0, 0], R_earth = 1.0) */
  scenePosition: [number, number, number];
  /** Scene radius in Three.js units according to active scaleMode */
  sceneRadius: number;
}

export interface LunarTelemetry {
  distanceKm: number;
  distanceEarthRadii: number;
  phaseAngleDeg: number; // 0..360 (0=New, 90=First Quarter, 180=Full, 270=Third Quarter)
  illuminatedFraction: number; // 0..1
  phaseName: string;
  subEarthLonLatRotRad: number; // Tidal-lock yaw angle facing Earth
}

export interface SolarSystemSnapshot {
  timestampMs: number;
  scaleMode: SolarSystemScaleMode;
  bodies: Record<CelestialBodyId, ComputedBodyEphemeris>;
  sunDirectionFromEarth: [number, number, number];
  lunar: LunarTelemetry;
}

/**
 * Converts J2000 Equatorial (x, y, z) where +z is North Celestial Pole
 * into right-handed Three.js scene coordinates (X, Y, Z) where +Y is North Pole.
 */
export function equatorialToSceneAxes(
  xEq: number,
  yEq: number,
  zEq: number
): [number, number, number] {
  return [xEq, zEq, -yEq];
}

/**
 * Converts a heliocentric distance in AU into scene units (R_earth = 1.0)
 * for either 'true-scale' or 'educational' scale mode.
 */
export function scaleHeliocentricDistanceAu(
  distanceAu: number,
  scaleMode: SolarSystemScaleMode
): number {
  if (distanceAu <= 0.00001) return 0;
  if (scaleMode === 'true-scale') {
    return distanceAu * TRUE_SCALE_EARTH_RADII_PER_AU;
  }
  // Educational mode: power-law compression that keeps Mercury outside the Sun and Neptune reachable
  return 24.0 + 44.0 * Math.pow(distanceAu, 0.52);
}

/**
 * Converts a geocentric Moon distance in AU into scene units (R_earth = 1.0).
 * Preserves real perigee/apogee eccentricity variation in both modes.
 */
export function scaleLunarGeocentricDistanceAu(
  distanceAu: number,
  scaleMode: SolarSystemScaleMode
): number {
  const trueEarthRadii = (distanceAu * KM_PER_AU) / EARTH_EQUATORIAL_RADIUS_KM; // ~56 to ~63.8 R_earth
  if (scaleMode === 'true-scale') {
    return trueEarthRadii;
  }
  // Educational mode: map 60.3 R_earth mean distance to ~6.8 R_earth while preserving perigee/apogee ratio
  return trueEarthRadii * 0.112;
}

export function getBodySceneRadius(
  id: CelestialBodyId,
  scaleMode: SolarSystemScaleMode
): number {
  const meta = BODY_PHYSICAL_CONSTANTS[id];
  const trueRatio = meta.equatorialRadiusKm / EARTH_EQUATORIAL_RADIUS_KM;
  if (scaleMode === 'true-scale') {
    return trueRatio;
  }
  return meta.educationalRadiusScene;
}

export function classifyLunarPhaseName(phaseDeg: number): string {
  const norm = ((phaseDeg % 360) + 360) % 360;
  if (norm < 22.5 || norm >= 337.5) return 'New Moon';
  if (norm < 67.5) return 'Waxing Crescent';
  if (norm < 112.5) return 'First Quarter';
  if (norm < 157.5) return 'Waxing Gibbous';
  if (norm < 202.5) return 'Full Moon';
  if (norm < 247.5) return 'Waning Gibbous';
  if (norm < 292.5) return 'Third Quarter';
  return 'Waning Crescent';
}

/**
 * Computes sidereal and solar day lengths (in hours) and axial tilt directly from
 * astronomy-engine's IAU WGCCRE RotationAxis ephemeris at the given timestamp.
 */
function computeRotationalTelemetry(
  body: Astronomy.Body,
  time0: Astronomy.AstroTime,
  orbitalPeriodDays: number
): { siderealDayHours: number; solarDayHours: number; axialTiltDeg: number; spinAngleDeg: number } {
  const dtHours = 2.0;
  const time1 = time0.AddDays(dtHours / 24.0);

  const axis0 = Astronomy.RotationAxis(body, time0);
  const axis1 = Astronomy.RotationAxis(body, time1);

  // Spin rate in degrees per hour (unwrapping 360-degree rollover)
  let deltaSpin = axis1.spin - axis0.spin;
  if (deltaSpin > 180) deltaSpin -= 360;
  if (deltaSpin < -180) deltaSpin += 360;

  const degPerHour = deltaSpin / dtHours;
  const siderealDayHours =
    Math.abs(degPerHour) > 1e-6 ? 360.0 / degPerHour : 0;

  // Compute solar day from sidereal rotation and orbital period: 1/T_solar = 1/T_sidereal - 1/T_orbit
  let solarDayHours = Math.abs(siderealDayHours);
  if (orbitalPeriodDays > 0 && Math.abs(siderealDayHours) > 0) {
    const orbitHours = orbitalPeriodDays * 24.0;
    const invSolar = 1.0 / siderealDayHours - 1.0 / orbitHours;
    if (Math.abs(invSolar) > 1e-8) {
      solarDayHours = Math.abs(1.0 / invSolar);
    }
  }

  // Approximate obliquity relative to J2000 ecliptic pole (RA=270 deg, Dec=66.5607 deg)
  const eclPoleRaRad = (270 * Math.PI) / 180;
  const eclPoleDecRad = (66.5607 * Math.PI) / 180;
  const raRad = (axis0.ra * 15 * Math.PI) / 180;
  const decRad = (axis0.dec * Math.PI) / 180;

  const cosTilt =
    Math.sin(decRad) * Math.sin(eclPoleDecRad) +
    Math.cos(decRad) * Math.cos(eclPoleDecRad) * Math.cos(raRad - eclPoleRaRad);
  const axialTiltDeg = (Math.acos(Math.max(-1, Math.min(1, cosTilt))) * 180) / Math.PI;

  return {
    siderealDayHours: Number(siderealDayHours.toFixed(2)),
    solarDayHours: Number(solarDayHours.toFixed(2)),
    axialTiltDeg: Number(axialTiltDeg.toFixed(2)),
    spinAngleDeg: Number((axis0.spin % 360).toFixed(2)),
  };
}

/**
 * Computes real orbital speed (km/s) via central finite difference of Heliocentric (or Geocentric for Moon) vectors.
 */
function computeInstantaneousSpeedKmS(
  body: Astronomy.Body,
  time0: Astronomy.AstroTime,
  isMoon = false
): number {
  const dtSeconds = 600; // 10-minute window
  const dtDays = dtSeconds / 86_400;
  const tMinus = time0.AddDays(-dtDays);
  const tPlus = time0.AddDays(dtDays);

  const v0 = isMoon
    ? Astronomy.GeoVector(body, tMinus, false)
    : Astronomy.HelioVector(body, tMinus);
  const v1 = isMoon
    ? Astronomy.GeoVector(body, tPlus, false)
    : Astronomy.HelioVector(body, tPlus);

  const dxAu = v1.x - v0.x;
  const dyAu = v1.y - v0.y;
  const dzAu = v1.z - v0.z;
  const distKm = Math.hypot(dxAu, dyAu, dzAu) * KM_PER_AU;

  return Number((distKm / (2 * dtSeconds)).toFixed(2));
}

/**
 * Master ephemeris computation for all 10 solar system bodies at `simulatedTimestampMs`.
 */
export function computeSolarSystemEphemeris(
  simulatedTimestampMs: number,
  scaleMode: SolarSystemScaleMode
): SolarSystemSnapshot {
  const dateObj = new Date(simulatedTimestampMs);
  const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const astroTime = Astronomy.MakeTime(safeDate);

  // 1. Earth Heliocentric Vector (used to anchor Earth at scene [0, 0, 0])
  const earthHelio = Astronomy.HelioVector(Astronomy.Body.Earth, astroTime);
  const earthHelioSceneDir = equatorialToSceneAxes(earthHelio.x, earthHelio.y, earthHelio.z);
  const earthHelioDistAu = Math.hypot(earthHelio.x, earthHelio.y, earthHelio.z);
  const scaledEarthSunDist = scaleHeliocentricDistanceAu(earthHelioDistAu, scaleMode);

  const earthDirUnit: [number, number, number] =
    earthHelioDistAu > 0
      ? [
          earthHelioSceneDir[0] / earthHelioDistAu,
          earthHelioSceneDir[1] / earthHelioDistAu,
          earthHelioSceneDir[2] / earthHelioDistAu,
        ]
      : [1, 0, 0];

  // Since Earth = Sun + scaledEarthSunDist * earthDirUnit = [0, 0, 0],
  // the Sun's scene position is -scaledEarthSunDist * earthDirUnit:
  const sunScenePosition: [number, number, number] = [
    -earthDirUnit[0] * scaledEarthSunDist,
    -earthDirUnit[1] * scaledEarthSunDist,
    -earthDirUnit[2] * scaledEarthSunDist,
  ];

  const sunDirectionFromEarth: [number, number, number] = [
    -earthDirUnit[0],
    -earthDirUnit[1],
    -earthDirUnit[2],
  ];

  // 2. Compute Moon Geocentric Ephemeris & Phase
  const moonGeo = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
  const moonGeoDistAu = Math.hypot(moonGeo.x, moonGeo.y, moonGeo.z);
  const moonDistKm = moonGeoDistAu * KM_PER_AU;
  const moonDistEarthRadii = moonDistKm / EARTH_EQUATORIAL_RADIUS_KM;
  const scaledMoonDist = scaleLunarGeocentricDistanceAu(moonGeoDistAu, scaleMode);

  const moonSceneAxes = equatorialToSceneAxes(moonGeo.x, moonGeo.y, moonGeo.z);
  const moonUnit: [number, number, number] =
    moonGeoDistAu > 0
      ? [
          moonSceneAxes[0] / moonGeoDistAu,
          moonSceneAxes[1] / moonGeoDistAu,
          moonSceneAxes[2] / moonGeoDistAu,
        ]
      : [1, 0, 0];

  const moonScenePosition: [number, number, number] = [
    moonUnit[0] * scaledMoonDist,
    moonUnit[1] * scaledMoonDist,
    moonUnit[2] * scaledMoonDist,
  ];

  const moonPhaseDeg = Astronomy.MoonPhase(astroTime);
  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);

  // Tidal-lock rotation angle so the Moon's near side always faces Earth at [0, 0, 0]
  const subEarthYawRad = Math.atan2(-moonScenePosition[0], -moonScenePosition[2]);

  const lunar: LunarTelemetry = {
    distanceKm: Number(moonDistKm.toFixed(0)),
    distanceEarthRadii: Number(moonDistEarthRadii.toFixed(2)),
    phaseAngleDeg: Number(moonPhaseDeg.toFixed(1)),
    illuminatedFraction: Number(moonIllum.phase_fraction.toFixed(4)),
    phaseName: classifyLunarPhaseName(moonPhaseDeg),
    subEarthLonLatRotRad: subEarthYawRad,
  };

  // 3. Assemble all 10 bodies
  const bodyList: Array<{ id: CelestialBodyId; astroBody: Astronomy.Body }> = [
    { id: 'Sun', astroBody: Astronomy.Body.Sun },
    { id: 'Moon', astroBody: Astronomy.Body.Moon },
    { id: 'Mercury', astroBody: Astronomy.Body.Mercury },
    { id: 'Venus', astroBody: Astronomy.Body.Venus },
    { id: 'Earth', astroBody: Astronomy.Body.Earth },
    { id: 'Mars', astroBody: Astronomy.Body.Mars },
    { id: 'Jupiter', astroBody: Astronomy.Body.Jupiter },
    { id: 'Saturn', astroBody: Astronomy.Body.Saturn },
    { id: 'Uranus', astroBody: Astronomy.Body.Uranus },
    { id: 'Neptune', astroBody: Astronomy.Body.Neptune },
  ];

  const bodies = {} as Record<CelestialBodyId, ComputedBodyEphemeris>;

  for (const { id, astroBody } of bodyList) {
    const meta = BODY_PHYSICAL_CONSTANTS[id];
    const helio =
      id === 'Sun'
        ? { x: 0, y: 0, z: 0 }
        : Astronomy.HelioVector(astroBody, astroTime);
    const geo =
      id === 'Earth'
        ? { x: 0, y: 0, z: 0 }
        : Astronomy.GeoVector(astroBody, astroTime, true);

    const distSunAu = Math.hypot(helio.x, helio.y, helio.z);
    const distEarthAu = Math.hypot(geo.x, geo.y, geo.z);

    let scenePos: [number, number, number] = [0, 0, 0];
    if (id === 'Sun') {
      scenePos = sunScenePosition;
    } else if (id === 'Earth') {
      scenePos = [0, 0, 0];
    } else if (id === 'Moon') {
      scenePos = moonScenePosition;
    } else {
      const helioScene = equatorialToSceneAxes(helio.x, helio.y, helio.z);
      const scaledHelioRadius = scaleHeliocentricDistanceAu(distSunAu, scaleMode);
      const u: [number, number, number] =
        distSunAu > 0
          ? [
              helioScene[0] / distSunAu,
              helioScene[1] / distSunAu,
              helioScene[2] / distSunAu,
            ]
          : [1, 0, 0];
      scenePos = [
        sunScenePosition[0] + u[0] * scaledHelioRadius,
        sunScenePosition[1] + u[1] * scaledHelioRadius,
        sunScenePosition[2] + u[2] * scaledHelioRadius,
      ];
    }

    const rot = computeRotationalTelemetry(astroBody, astroTime, meta.orbitalPeriodDays);
    const speedKmS =
      id === 'Sun'
        ? 0
        : computeInstantaneousSpeedKmS(astroBody, astroTime, id === 'Moon');

    bodies[id] = {
      id,
      heliocentricAu: [
        Number(helio.x.toFixed(5)),
        Number(helio.y.toFixed(5)),
        Number(helio.z.toFixed(5)),
      ],
      geocentricAu: [
        Number(geo.x.toFixed(5)),
        Number(geo.y.toFixed(5)),
        Number(geo.z.toFixed(5)),
      ],
      distanceFromSunAu: Number(distSunAu.toFixed(4)),
      distanceFromSunMillionKm: Number(((distSunAu * KM_PER_AU) / 1e6).toFixed(2)),
      distanceFromEarthAu: Number(distEarthAu.toFixed(5)),
      distanceFromEarthKm: Number((distEarthAu * KM_PER_AU).toFixed(0)),
      orbitalSpeedKmS: speedKmS,
      equatorialRadiusKm: meta.equatorialRadiusKm,
      radiusInEarthRadii: Number(
        (meta.equatorialRadiusKm / EARTH_EQUATORIAL_RADIUS_KM).toFixed(3)
      ),
      siderealDayHours: rot.siderealDayHours,
      solarDayHours: rot.solarDayHours,
      axialTiltDeg: rot.axialTiltDeg,
      spinAngleDeg: rot.spinAngleDeg,
      scenePosition: scenePos,
      sceneRadius: getBodySceneRadius(id, scaleMode),
    };
  }

  return {
    timestampMs: simulatedTimestampMs,
    scaleMode,
    bodies,
    sunDirectionFromEarth,
    lunar,
  };
}

/**
 * Samples a closed 3D orbital path for either the Moon (around Earth [0,0,0])
 * or a planet (around `sunScenePosition`).
 */
export function computeCelestialOrbitRing(
  id: Exclude<CelestialBodyId, 'Sun'>,
  centerTimestampMs: number,
  scaleMode: SolarSystemScaleMode,
  sunScenePosition: [number, number, number],
  sampleCount: number
): Array<[number, number, number]> {
  const meta = BODY_PHYSICAL_CONSTANTS[id];
  const periodMs = meta.orbitalPeriodDays * 86_400_000;
  const points: Array<[number, number, number]> = [];
  const astroBody = Astronomy.Body[id];

  for (let i = 0; i <= sampleCount; i++) {
    const tMs = centerTimestampMs + (i / sampleCount) * periodMs;
    const astroTime = Astronomy.MakeTime(new Date(tMs));

    if (id === 'Moon') {
      const geo = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
      const distAu = Math.hypot(geo.x, geo.y, geo.z);
      const scaledR = scaleLunarGeocentricDistanceAu(distAu, scaleMode);
      const axes = equatorialToSceneAxes(geo.x, geo.y, geo.z);
      if (distAu > 0) {
        points.push([
          (axes[0] / distAu) * scaledR,
          (axes[1] / distAu) * scaledR,
          (axes[2] / distAu) * scaledR,
        ]);
      }
    } else {
      const helio = Astronomy.HelioVector(astroBody, astroTime);
      const distAu = Math.hypot(helio.x, helio.y, helio.z);
      const scaledR = scaleHeliocentricDistanceAu(distAu, scaleMode);
      const axes = equatorialToSceneAxes(helio.x, helio.y, helio.z);
      if (distAu > 0) {
        points.push([
          sunScenePosition[0] + (axes[0] / distAu) * scaledR,
          sunScenePosition[1] + (axes[1] / distAu) * scaledR,
          sunScenePosition[2] + (axes[2] / distAu) * scaledR,
        ]);
      }
    }
  }

  return points;
}