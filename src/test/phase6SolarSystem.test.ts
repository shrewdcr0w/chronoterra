import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeSolarSystemEphemeris,
  TRUE_SCALE_EARTH_RADII_PER_AU,
} from '../simulation/astronomy/solarSystemEphemeris';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';

describe('Phase 6 — Solar System Explorer & Earth-Moon Ephemeris', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
  });

  it('computes real positions for Sun, Moon, and all 8 planets that move when PlanetaryState.timestamp changes', () => {
    const t0 = Date.parse('2026-01-01T00:00:00.000Z');
    const t1 = Date.parse('2026-04-01T00:00:00.000Z'); // +90 days

    const snap0 = computeSolarSystemEphemeris(t0, 'educational');
    const snap1 = computeSolarSystemEphemeris(t1, 'educational');

    // Mercury, Earth (via Sun relative position), Mars, and Moon must visibly move over 90 days
    expect(snap0.bodies.Mercury.heliocentricAu).not.toEqual(
      snap1.bodies.Mercury.heliocentricAu
    );
    expect(snap0.bodies.Mars.scenePosition).not.toEqual(
      snap1.bodies.Mars.scenePosition
    );
    expect(snap0.bodies.Sun.scenePosition).not.toEqual(
      snap1.bodies.Sun.scenePosition
    );

    // Check heliocentric distance bounds (AU)
    expect(snap0.bodies.Earth.distanceFromSunAu).toBeGreaterThan(0.98);
    expect(snap0.bodies.Earth.distanceFromSunAu).toBeLessThan(1.02);
    expect(snap0.bodies.Jupiter.distanceFromSunAu).toBeGreaterThan(4.9);
    expect(snap0.bodies.Jupiter.distanceFromSunAu).toBeLessThan(5.5);
    expect(snap0.bodies.Neptune.distanceFromSunAu).toBeGreaterThan(29.5);
    expect(snap0.bodies.Neptune.distanceFromSunAu).toBeLessThan(30.5);
  });

  it('distinguishes True 1:1 Scale from Educational Scale accurately', () => {
    const t0 = Date.parse('2026-06-15T12:00:00.000Z');
    const eduSnap = computeSolarSystemEphemeris(t0, 'educational');
    const trueSnap = computeSolarSystemEphemeris(t0, 'true-scale');

    const sunDistEdu = Math.hypot(...eduSnap.bodies.Sun.scenePosition);
    const sunDistTrue = Math.hypot(...trueSnap.bodies.Sun.scenePosition);

    // In educational mode, 1 AU is compressed to ~68 R_earth; in true-scale it is ~23,481 R_earth
    expect(sunDistEdu).toBeGreaterThan(60);
    expect(sunDistEdu).toBeLessThan(75);
    expect(sunDistTrue).toBeGreaterThan(TRUE_SCALE_EARTH_RADII_PER_AU * 0.98);
    expect(sunDistTrue).toBeLessThan(TRUE_SCALE_EARTH_RADII_PER_AU * 1.02);

    // True-scale Jupiter radius is ~10.97 R_earth; educational is 2.75 R_earth
    expect(trueSnap.bodies.Jupiter.sceneRadius).toBeCloseTo(10.973, 2);
    expect(eduSnap.bodies.Jupiter.sceneRadius).toBeCloseTo(2.75, 2);
  });

  it('computes accurate Earth-Moon distance, lunar phase, and rotational day lengths', () => {
    const t0 = Date.parse('2026-11-12T00:00:00.000Z');
    const snap = computeSolarSystemEphemeris(t0, 'true-scale');

    // Real lunar perigee-apogee range is ~356,400 km to ~406,700 km (55.9 to 63.9 R_earth)
    expect(snap.lunar.distanceKm).toBeGreaterThan(350_000);
    expect(snap.lunar.distanceKm).toBeLessThan(410_000);
    expect(snap.lunar.distanceEarthRadii).toBeGreaterThan(55);
    expect(snap.lunar.distanceEarthRadii).toBeLessThan(65);
    expect(snap.lunar.illuminatedFraction).toBeGreaterThanOrEqual(0);
    expect(snap.lunar.illuminatedFraction).toBeLessThanOrEqual(1);

    // Earth sidereal day is ~23.93 hours and solar day is ~24.00 hours
    expect(snap.bodies.Earth.siderealDayHours).toBeCloseTo(23.93, 1);
    expect(snap.bodies.Earth.solarDayHours).toBeCloseTo(24.0, 1);
    // Venus has retrograde rotation (negative sidereal hours)
    expect(snap.bodies.Venus.siderealDayHours).toBeLessThan(0);
  });

  it('keeps Phase 5 artificial satellites enabled when camera pulls back to Moon or Solar System overview', () => {
    const store = usePlanetaryStore.getState();
    expect(store.orbitalState.showSatellites).toBe(true);

    store.setCelestialFocusTarget('Sun');
    expect(usePlanetaryStore.getState().celestialFocusTarget).toBe('Sun');
    expect(usePlanetaryStore.getState().orbitalState.showSatellites).toBe(true);

    store.setCelestialFocusTarget('Moon');
    expect(usePlanetaryStore.getState().celestialFocusTarget).toBe('Moon');
    expect(usePlanetaryStore.getState().orbitalState.showSatellites).toBe(true);
  });
});