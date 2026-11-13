import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCelestrakOmmUrl,
  BUNDLED_OMM_FALLBACK,
  clearOmmMemoryCache,
} from '../data/loaders/celestrakOmmLoader';
import {
  CompiledSatRecord,
  computeOrbitTrajectoryPoints,
  cullSatellitesForPreset,
  parseOmmToSatRec,
  propagateSatelliteAtTime,
} from '../simulation/orbit/satellitePropagator';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS } from '../types/planetaryState';

describe('Phase 5 — Orbital Observatory (OMM-JSON & SGP4 Propagation)', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
    clearOmmMemoryCache();
  });

  it('always sets FORMAT=json explicitly on CelesTrak gp.php requests', () => {
    const stationsUrl = buildCelestrakOmmUrl('stations');
    expect(stationsUrl).toBe(
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json'
    );

    const gpsUrl = buildCelestrakOmmUrl('gps-ops');
    expect(gpsUrl).toContain('GROUP=gps-ops');
    expect(gpsUrl).toContain('FORMAT=json');
  });

  it('parses both 5-digit (25544) and 6-digit (100412) NORAD catalog OMM-JSON records and moves satellites when PlanetaryState.timestamp changes', () => {
    const issOmm = BUNDLED_OMM_FALLBACK.stations[0]; // NORAD 25544
    const sixDigitOmm = BUNDLED_OMM_FALLBACK.stations[2]; // NORAD 100412

    expect(issOmm.NORAD_CAT_ID).toBe(25544);
    expect(sixDigitOmm.NORAD_CAT_ID).toBe(100412);

    const issCompiled: CompiledSatRecord = {
      omm: issOmm,
      group: 'stations',
      satrec: parseOmmToSatRec(issOmm),
      dataSourceLabel: 'Test OMM-JSON',
    };

    const sixDigitCompiled: CompiledSatRecord = {
      omm: sixDigitOmm,
      group: 'stations',
      satrec: parseOmmToSatRec(sixDigitOmm),
      dataSourceLabel: 'Test OMM-JSON',
    };

    const t0 = Date.parse('2026-11-11T12:00:00.000Z');
    const t1 = t0 + 25 * 60_000; // +25 minutes simulated time

    const issAtT0 = propagateSatelliteAtTime(issCompiled, t0);
    const issAtT1 = propagateSatelliteAtTime(issCompiled, t1);
    const sixDigitAtT0 = propagateSatelliteAtTime(sixDigitCompiled, t0);

    expect(issAtT0).not.toBeNull();
    expect(issAtT1).not.toBeNull();
    expect(sixDigitAtT0).not.toBeNull();
    expect(sixDigitAtT0!.noradId).toBe(100412);
    expect(sixDigitAtT0!.regime).toBe('LEO');

    // Verify scrubbing simulated timestamp moves the satellite position
    expect(issAtT0!.latDeg).not.toBeCloseTo(issAtT1!.latDeg, 1);
    expect(issAtT0!.positionScene).not.toEqual(issAtT1!.positionScene);

    // Verify single-satellite trajectory generation
    const trajectory = computeOrbitTrajectoryPoints(
      issCompiled,
      t0,
      GRAPHICS_PRESETS.low.orbitLineSamples
    );
    expect(trajectory.length).toBeGreaterThan(40);
  });

  it('toggles all artificial satellites independently without altering natural celestial body visibility', () => {
    const store = usePlanetaryStore.getState();
    expect(store.orbitalState.showSatellites).toBe(true);
    expect(store.layers.naturalCelestialBodies).toBe(true);

    // Hide all artificial satellites
    store.setShowSatellites(false);
    const afterHide = usePlanetaryStore.getState();
    expect(afterHide.orbitalState.showSatellites).toBe(false);
    expect(afterHide.scenario.sourceIds).not.toContain('celestrak-gp-omm-json');
    // Natural celestial bodies remain untouched
    expect(afterHide.layers.naturalCelestialBodies).toBe(true);
  });

  it('reduces rendered satellite count on Low graphics preset and respects density multiplier', () => {
    const issOmm = BUNDLED_OMM_FALLBACK.stations[0];
    const compiled: CompiledSatRecord = {
      omm: issOmm,
      group: 'stations',
      satrec: parseOmmToSatRec(issOmm),
      dataSourceLabel: 'Test',
    };
    const baseState = propagateSatelliteAtTime(
      compiled,
      Date.parse('2026-11-11T12:00:00Z')
    )!;

    // Synthesize 100 test satellites in front of the camera
    const mockSwarm = Array.from({ length: 100 }, (_, i) => ({
      ...baseState,
      noradId: 100000 + i,
      positionScene: [0, 0, 1.06] as [number, number, number],
    }));

    const lowCulled = cullSatellitesForPreset(
      mockSwarm,
      GRAPHICS_PRESETS.low.maxSatellites, // 35
      0.5, // 50% density -> max 17
      true,
      [0, 0, 3.1],
      null
    );

    const ultraCulled = cullSatellitesForPreset(
      mockSwarm,
      GRAPHICS_PRESETS.ultra.maxSatellites, // 500
      1.0,
      false,
      [0, 0, 3.1],
      null
    );

    expect(lowCulled.length).toBe(17);
    expect(ultraCulled.length).toBe(100);
  });
});