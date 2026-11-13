import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  formatSimulatedTimestamp,
  GRAPHICS_PRESETS,
  PlanetaryStateSchema,
} from '../types/planetaryState';

describe('PlanetaryState Zustand Store & Contract', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
  });

  it('initializes with a valid PlanetaryState matching the Zod schema', () => {
    const rawState = usePlanetaryStore.getState().getSerializableState();
    const parseResult = PlanetaryStateSchema.safeParse(rawState);
    expect(parseResult.success).toBe(true);
    expect(rawState.graphicsProfile).toBe('balanced');
    expect(rawState.timeScale).toBe('historical');
    expect(rawState.scenario.type).toBe('observed');
  });

  it('updates graphicsProfile and maps to measurable renderer parameters', () => {
    const store = usePlanetaryStore.getState();
    store.setGraphicsProfile('low');
    expect(usePlanetaryStore.getState().graphicsProfile).toBe('low');
    expect(GRAPHICS_PRESETS.low.sphereSegments).toBe(32);
    expect(GRAPHICS_PRESETS.low.antialias).toBe(false);

    store.setGraphicsProfile('ultra');
    expect(usePlanetaryStore.getState().graphicsProfile).toBe('ultra');
    expect(GRAPHICS_PRESETS.ultra.sphereSegments).toBe(128);
    expect(GRAPHICS_PRESETS.ultra.shadows).toBe(true);
  });

  it('toggles visualization layers cleanly', () => {
    const store = usePlanetaryStore.getState();
    expect(store.layers.atmosphere).toBe(true);
    store.toggleLayer('atmosphere');
    expect(usePlanetaryStore.getState().layers.atmosphere).toBe(false);
  });

  it('updates camera orbital coordinates without mutating unrelated state', () => {
    const store = usePlanetaryStore.getState();
    store.setCamera({ lat: -33.86, lon: 151.21, distance: 2.4 });
    const updatedCamera = usePlanetaryStore.getState().camera;
    expect(updatedCamera.lat).toBe(-33.86);
    expect(updatedCamera.lon).toBe(151.21);
    expect(updatedCamera.distance).toBe(2.4);
  });

  it('handles deep-time timestamps (250 Ma) without round-tripping through JS Date', () => {
    const store = usePlanetaryStore.getState();
    store.setSimulatedTime(250, 'deep-time');
    const state = usePlanetaryStore.getState();
    expect(state.timeScale).toBe('deep-time');
    expect(state.timestamp).toBe(250);
    expect(formatSimulatedTimestamp(state.timestamp, state.timeScale)).toBe(
      '250.00 Ma (250 Million Years Before Present)'
    );
  });
});