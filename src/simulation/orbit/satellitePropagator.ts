import * as satellite from 'satellite.js';
import { latLonToCartesian } from '../../data/loaders/eonetLoader';
import {
  CelestrakGroupId,
  CelestrakOmmRecord,
  classifyOrbitRegime,
  PropagatedSatelliteState,
} from './ommTypes';

export const EARTH_RADIUS_KM = 6371.0;

export interface CompiledSatRecord {
  omm: CelestrakOmmRecord;
  group: CelestrakGroupId;
  satrec: satellite.SatRec;
  dataSourceLabel: string;
}

/**
 * Parses a CelesTrak OMM-JSON record into a satellite.js SatRec using json2satrec().
 * Works seamlessly with 5-digit and 6-digit+ NORAD_CAT_ID values.
 */
export function parseOmmToSatRec(omm: CelestrakOmmRecord): satellite.SatRec {
  // Primary path: satellite.js v6+/v7+ native json2satrec(omm)
  const satModule = satellite as unknown as {
    json2satrec?: (ommInput: CelestrakOmmRecord) => satellite.SatRec;
  };
  if (typeof satModule.json2satrec === 'function') {
    return satModule.json2satrec(omm);
  }
  throw new Error(
    'satellite.json2satrec is required for OMM-JSON parsing. Run: npm install satellite.js@^7.1.0'
  );
}

/**
 * Propagates a compiled SatRec to the exact simulated timestampMs (never wall-clock Date.now()).
 */
export function propagateSatelliteAtTime(
  compiled: CompiledSatRecord,
  simulatedTimestampMs: number
): PropagatedSatelliteState | null {
  const simDate = new Date(simulatedTimestampMs);
  if (Number.isNaN(simDate.getTime())) return null;

  const posVel = satellite.propagate(compiled.satrec, simDate);
  if (!posVel || !posVel.position || typeof posVel.position === 'boolean') {
    return null;
  }

  const positionEci = posVel.position as satellite.EciVec3<number>;
  const velocityEci = posVel.velocity as satellite.EciVec3<number>;

  const gmst = satellite.gstime(simDate);
  const geodetic = satellite.eciToGeodetic(positionEci, gmst);

  const latDeg = satellite.degreesLat(geodetic.latitude);
  const lonDeg = satellite.degreesLong(geodetic.longitude);
  const altitudeKm = geodetic.height;

  if (
    Number.isNaN(latDeg) ||
    Number.isNaN(lonDeg) ||
    Number.isNaN(altitudeKm) ||
    altitudeKm < 80
  ) {
    return null;
  }

  const speedKmS =
    velocityEci && typeof velocityEci === 'object'
      ? Math.sqrt(
          velocityEci.x * velocityEci.x +
            velocityEci.y * velocityEci.y +
            velocityEci.z * velocityEci.z
        )
      : 7.5;

  // Convert altitude (km) to scene radius (Earth radius = 1.0), clamped slightly above atmosphere shell (1.04)
  const rawSceneRadius = 1.0 + altitudeKm / EARTH_RADIUS_KM;
  const clampedSceneRadius = Math.max(1.042, Math.min(8.5, rawSceneRadius));
  const positionScene = latLonToCartesian(latDeg, lonDeg, clampedSceneRadius);

  const periodMinutes = 1440 / Math.max(0.01, compiled.omm.MEAN_MOTION);
  const regime = classifyOrbitRegime(
    compiled.omm.MEAN_MOTION,
    compiled.omm.ECCENTRICITY,
    altitudeKm
  );

  return {
    noradId: compiled.omm.NORAD_CAT_ID,
    name: compiled.omm.OBJECT_NAME,
    objectId: compiled.omm.OBJECT_ID,
    group: compiled.group,
    regime,
    epochISO: compiled.omm.EPOCH,
    inclinationDeg: compiled.omm.INCLINATION,
    eccentricity: compiled.omm.ECCENTRICITY,
    periodMinutes: Number(periodMinutes.toFixed(2)),
    altitudeKm: Number(altitudeKm.toFixed(1)),
    velocityKmS: Number(speedKmS.toFixed(2)),
    latDeg: Number(latDeg.toFixed(3)),
    lonDeg: Number(lonDeg.toFixed(3)),
    positionScene,
    dataSourceLabel: compiled.dataSourceLabel,
    omm: compiled.omm,
  };
}

/**
 * Computes 3D trajectory points across one full orbital period for ONLY the selected satellite.
 */
export function computeOrbitTrajectoryPoints(
  compiled: CompiledSatRecord,
  centerTimestampMs: number,
  sampleCount: number
): Array<[number, number, number]> {
  const periodMinutes = 1440 / Math.max(0.05, compiled.omm.MEAN_MOTION);
  const periodMs = periodMinutes * 60_000;
  const points: Array<[number, number, number]> = [];

  for (let i = 0; i <= sampleCount; i++) {
    const frac = i / sampleCount - 0.5; // -0.5 period to +0.5 period around current simulated time
    const sampleMs = centerTimestampMs + frac * periodMs;
    const state = propagateSatelliteAtTime(compiled, sampleMs);
    if (state) {
      points.push(state.positionScene);
    }
  }

  return points;
}

/**
 * Applies graphics-preset budget, user density ratio (0.25..1.0), and optional camera backface/horizon culling.
 */
export function cullSatellitesForPreset(
  satellites: PropagatedSatelliteState[],
  maxPresetInstances: number,
  densityRatio: number,
  enableBackfaceOcclusionCulling: boolean,
  cameraPosition: [number, number, number],
  selectedNoradId: number | null
): PropagatedSatelliteState[] {
  const clampedDensity = Math.max(0.1, Math.min(1.0, densityRatio));
  const targetBudget = Math.max(1, Math.floor(maxPresetInstances * clampedDensity));

  const camLen = Math.hypot(cameraPosition[0], cameraPosition[1], cameraPosition[2]) || 1;
  const camDir: [number, number, number] = [
    cameraPosition[0] / camLen,
    cameraPosition[1] / camLen,
    cameraPosition[2] / camLen,
  ];

  const culled: PropagatedSatelliteState[] = [];

  for (const sat of satellites) {
    // Always keep the actively selected satellite visible
    if (selectedNoradId !== null && sat.noradId === selectedNoradId) {
      culled.push(sat);
      continue;
    }

    if (enableBackfaceOcclusionCulling) {
      // Dot product between satellite position vector and camera direction
      // Hides LEO satellites occluded behind the far side of the solid Earth sphere
      const [sx, sy, sz] = sat.positionScene;
      const dot = sx * camDir[0] + sy * camDir[1] + sz * camDir[2];
      if (dot < -0.15 && sat.altitudeKm < 2500) {
        continue;
      }
    }

    if (culled.length < targetBudget) {
      culled.push(sat);
    }
  }

  return culled;
}