import { CatastropheKind } from './curatedEvents';

export interface ComputedEventKinematics {
  kind: CatastropheKind;
  intensity: number; // 1.0 .. 10.0
  progress: number;  // 0.0 .. 1.0
  phaseLabel:
    | 'Pre-Detonation / Baseline'
    | 'Acute Blast & Shockwave'
    | 'Ash Plume & Ejecta Fallout'
    | 'Peak Ecological Defoliation'
    | 'Pioneer Flora Succession (Fern Spike)'
    | 'Late Canopy Recovery';
  /** Shockwave front angular radius in degrees (0 when wave has dissipated) */
  shockwaveRadiusDeg: number;
  shockwaveOpacity: number;
  /** Ejecta ballistic plume height in Earth radii above surface */
  ejectaPlumeHeightScene: number;
  /** Ash cloud latitudinal half-width (deg) and longitudinal zonal half-width (deg) */
  ashLatRadiusDeg: number;
  ashLonRadiusDeg: number;
  ashOpacity: number;
  /** Maximum angular radius (degrees) of vegetation scarring */
  maxDamageRadiusDeg: number;
  /** Temporal multiplier T(p) in [0, 1] for vegetation damage */
  temporalDamageFactor: number;
  /** Pioneer regrowth fraction in [0, 1] (peaks during mid-recovery succession) */
  pioneerRegrowthFraction: number;
  /** Simplified algebraic global temperature perturbation (deg C), explicitly non-GCM */
  simplifiedTempDeltaC: number;
  /** Elapsed model years along the recovery horizon */
  elapsedRecoveryYears: number;
}

const PEAK_DAMAGE_PROGRESS = 0.20;
const REGROWTH_DECAY_LAMBDA = 3.2;

/**
 * Computes great-circle angular distance (in degrees, 0..180) between two [lat, lon] points.
 */
export function greatCircleAngularDistanceDeg(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number
): number {
  const toRad = Math.PI / 180;
  const phi1 = lat1Deg * toRad;
  const phi2 = lat2Deg * toRad;
  const dPhi = (lat2Deg - lat1Deg) * toRad;
  const dLambda = (lon2Deg - lon1Deg) * toRad;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  return c / toRad;
}

/**
 * Evaluates the simplified analytical model for a given event type, intensity (1..10), and progress (0..1).
 * Documented in full in `docs/simulation-models.md`.
 */
export function evaluateCatastropheModel(
  kind: CatastropheKind,
  rawIntensity: number,
  rawProgress: number,
  recoveryHorizonYears = 25
): ComputedEventKinematics {
  const intensity = Math.max(1, Math.min(10, rawIntensity));
  const progress = Math.max(0, Math.min(1, rawProgress));

  // 1. Shockwave Ring (Active during p in (0, 0.25])
  const maxShockDeg = (kind === 'impact' ? 4.5 : 2.8) * intensity + 3.0;
  let shockwaveRadiusDeg = 0;
  let shockwaveOpacity = 0;

  if (progress > 0 && progress <= 0.25) {
    const normP = progress / 0.25;
    shockwaveRadiusDeg = Number((maxShockDeg * Math.pow(normP, 0.65)).toFixed(2));
    shockwaveOpacity = Number((1.0 - Math.pow(normP, 1.4)).toFixed(3));
  }

  // 2. Ballistic Ejecta Plume Height (Scene units, R_earth = 1.0)
  let ejectaPlumeHeightScene = 0;
  if (progress > 0 && progress <= 0.35) {
    const plumePhase = progress / 0.35;
    const maxPlume = (kind === 'impact' ? 0.022 : 0.015) * intensity;
    ejectaPlumeHeightScene = Number(
      (maxPlume * Math.sin(plumePhase * Math.PI)).toFixed(4)
    );
  }

  // 3. Stratospheric Ash / Aerosol Dispersion (Zonally stretched by 1.65x along longitude)
  const baseAshDeg = (kind === 'wildfire' ? 1.8 : 4.2) * intensity + 2.0;
  const ashGrowth = progress <= 0.4 ? Math.pow(progress / 0.4, 0.55) : 1.0;
  const ashLatRadiusDeg = Number((baseAshDeg * ashGrowth).toFixed(2));
  const ashLonRadiusDeg = Number((baseAshDeg * 1.65 * ashGrowth).toFixed(2));

  let ashOpacity = 0;
  if (progress > 0 && progress < 0.85) {
    const fade =
      progress <= 0.3
        ? progress / 0.3
        : 1.0 - (progress - 0.3) / 0.55;
    ashOpacity = Number(
      (Math.max(0, fade) * Math.min(0.78, 0.12 + intensity * 0.065)).toFixed(3)
    );
  }

  // 4. Vegetation Damage & Regrowth Curve T(p)
  const maxDamageRadiusDeg = Number(
    ((kind === 'wildfire' ? 1.6 : 3.8) * intensity + 2.5).toFixed(2)
  );

  let temporalDamageFactor = 0;
  let pioneerRegrowthFraction = 0;

  if (progress > 0 && progress <= PEAK_DAMAGE_PROGRESS) {
    temporalDamageFactor = progress / PEAK_DAMAGE_PROGRESS;
    pioneerRegrowthFraction = 0;
  } else if (progress > PEAK_DAMAGE_PROGRESS) {
    const recoveryFraction = (progress - PEAK_DAMAGE_PROGRESS) / (1 - PEAK_DAMAGE_PROGRESS);
    temporalDamageFactor = Math.exp(-REGROWTH_DECAY_LAMBDA * recoveryFraction);
    // Pioneer flora ("fern spike" / grassland colonizers) peaks midway through recovery
    pioneerRegrowthFraction = Math.sin(recoveryFraction * Math.PI) * (1 - temporalDamageFactor * 0.5);
  }

  // 5. Simplified Algebraic Global Temperature Perturbation (Analytical proxy, NOT a GCM)
  const peakCoolingC =
    kind === 'wildfire'
      ? -0.02 * intensity
      : kind === 'volcano'
      ? -0.06 * Math.pow(intensity, 1.45)
      : -0.11 * Math.pow(intensity, 1.6);
  const simplifiedTempDeltaC = Number(
    (peakCoolingC * temporalDamageFactor).toFixed(2)
  );

  // 6. Phase Label & Elapsed Recovery Years
  let phaseLabel: ComputedEventKinematics['phaseLabel'] = 'Pre-Detonation / Baseline';
  if (progress === 0) {
    phaseLabel = 'Pre-Detonation / Baseline';
  } else if (progress <= 0.12) {
    phaseLabel = 'Acute Blast & Shockwave';
  } else if (progress <= 0.24) {
    phaseLabel = 'Peak Ecological Defoliation';
  } else if (progress <= 0.42) {
    phaseLabel = 'Ash Plume & Ejecta Fallout';
  } else if (progress <= 0.78) {
    phaseLabel = 'Pioneer Flora Succession (Fern Spike)';
  } else {
    phaseLabel = 'Late Canopy Recovery';
  }

  const elapsedRecoveryYears =
    progress <= PEAK_DAMAGE_PROGRESS
      ? 0
      : Number(
          (
            ((progress - PEAK_DAMAGE_PROGRESS) / (1 - PEAK_DAMAGE_PROGRESS)) *
            recoveryHorizonYears
          ).toFixed(1)
        );

  return {
    kind,
    intensity,
    progress,
    phaseLabel,
    shockwaveRadiusDeg,
    shockwaveOpacity,
    ejectaPlumeHeightScene,
    ashLatRadiusDeg,
    ashLonRadiusDeg,
    ashOpacity,
    maxDamageRadiusDeg,
    temporalDamageFactor: Number(temporalDamageFactor.toFixed(4)),
    pioneerRegrowthFraction: Number(pioneerRegrowthFraction.toFixed(4)),
    simplifiedTempDeltaC,
    elapsedRecoveryYears,
  };
}

/**
 * Evaluates local vegetation damage D(psi, I, p) in [0, 1] at a given angular distance `psiDeg`
 * from the event epicenter.
 */
export function computeLocalVegetationDamage(
  psiDeg: number,
  kinematics: ComputedEventKinematics
): { damageFraction: number; pioneerFraction: number } {
  if (
    kinematics.progress <= 0 ||
    psiDeg >= kinematics.maxDamageRadiusDeg ||
    kinematics.maxDamageRadiusDeg <= 0
  ) {
    return { damageFraction: 0, pioneerFraction: 0 };
  }

  const normalizedDist = psiDeg / kinematics.maxDamageRadiusDeg;
  const spatialAttenuation = Math.max(0, 1 - normalizedDist * normalizedDist);
  const intensityScale = Math.min(1, 0.35 + 0.065 * kinematics.intensity);

  const damageFraction = Math.min(
    1,
    spatialAttenuation * kinematics.temporalDamageFactor * intensityScale
  );
  const pioneerFraction = Math.min(
    1,
    spatialAttenuation * kinematics.pioneerRegrowthFraction * intensityScale
  );

  return {
    damageFraction: Number(damageFraction.toFixed(4)),
    pioneerFraction: Number(pioneerFraction.toFixed(4)),
  };
}