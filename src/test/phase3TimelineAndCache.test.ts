import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clampHistoricalTimestamp,
  usePlanetaryStore,
} from '../stores/usePlanetaryStore';
import {
  HISTORICAL_MIN_EPOCH_MS,
  toISODateString,
} from '../data/metadata/datasetRegistry';
import {
  buildCacheKey,
  clearAllCaches,
  getCacheStats,
  getOrFetchCached,
} from '../data/loaders/cacheManager';
import { latLonToCartesian } from '../data/loaders/eonetLoader';

describe('Phase 3 — Timeline, Epistemic Layer Rules, and Caching', () => {
  beforeEach(async () => {
    usePlanetaryStore.getState().resetToDefault();
    await clearAllCaches();
  });

  it('clamps historical timestamps strictly within the satellite era (2000-03-01 to present)', () => {
    const preModisMs = Date.parse('1985-06-15T00:00:00.000Z');
    const clamped = clampHistoricalTimestamp(preModisMs);
    expect(clamped).toBe(HISTORICAL_MIN_EPOCH_MS);
    expect(toISODateString(clamped)).toBe('2000-03-01');

    const store = usePlanetaryStore.getState();
    store.setSimulatedTime(preModisMs, 'historical');
    expect(usePlanetaryStore.getState().timestamp).toBe(HISTORICAL_MIN_EPOCH_MS);
  });

  it('steps forward and backward by days in historical mode and stops playback at present ceiling', () => {
    const store = usePlanetaryStore.getState();
    const baseMs = Date.parse('2024-05-10T00:00:00.000Z');
    store.setSimulatedTime(baseMs, 'historical');
    store.stepHistoricalDays(5);
    expect(toISODateString(usePlanetaryStore.getState().timestamp)).toBe('2024-05-15');

    store.stepHistoricalDays(-10);
    expect(toISODateString(usePlanetaryStore.getState().timestamp)).toBe('2024-05-05');
  });

  it('switches scene epistemic classification from OBSERVED to HYPOTHETICAL when procedural climate placeholder is enabled', () => {
    const store = usePlanetaryStore.getState();
    expect(store.scenario.type).toBe('observed');
    expect(store.scenario.sourceIds).toContain('gibs-modis-terra-truecolor');
    expect(store.scenario.sourceIds).toContain('nasa-eonet-v3-events');

    // Enable second GIBS observed layer (Land Surface Temp) -> remains OBSERVED
    store.toggleLayer('gibsLandSurfaceTemp');
    expect(usePlanetaryStore.getState().scenario.type).toBe('observed');
    expect(usePlanetaryStore.getState().scenario.sourceIds).toContain('gibs-modis-terra-lst-day');

    // Enable procedural climate placeholder -> must downgrade scene badge to HYPOTHETICAL
    store.toggleLayer('climatePlaceholder');
    expect(usePlanetaryStore.getState().scenario.type).toBe('hypothetical');
    expect(usePlanetaryStore.getState().scenario.sourceIds).toContain(
      'procedural-zonal-climate-placeholder-v1'
    );
  });

  it('deduplicates network fetches via the two-tier cache manager', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ sample: 'tile-payload' });
    const key = buildCacheKey('gibs-wms', 'MODIS_Terra_CorrectedReflectance_TrueColor', '2026-10-15');

    const first = await getOrFetchCached(key, mockFetcher, false);
    expect(first.source).toBe('network');
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    const second = await getOrFetchCached(key, mockFetcher, false);
    expect(second.source).toBe('memory');
    expect(mockFetcher).toHaveBeenCalledTimes(1); // Not refetched!
    expect(getCacheStats().hits).toBe(1);
  });

  it('projects EONET [lat, lon] onto the Three.js sphere at the requested radius', () => {
    const [x, y, z] = latLonToCartesian(0, 0, 1.008);
    const radius = Math.sqrt(x * x + y * y + z * z);
    expect(radius).toBeCloseTo(1.008, 4);
    expect(y).toBeCloseTo(0, 4); // Equator -> y = 0
  });
});