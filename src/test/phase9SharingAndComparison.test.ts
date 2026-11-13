import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LZString from 'lz-string';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  clearSavedStatesInIdb,
  decodeStateFromUrlHash,
  deleteSavedStateFromIdb,
  encodeStateToUrlHash,
  loadSavedStatesFromIdb,
  saveNamedStateToIdb,
} from '../utils/stateSharing';
import {
  ComparisonModal,
  createCanonicalComparisonPresets,
} from '../components/ComparisonModal';
import { parseAttributionsMarkdownTable } from '../components/AttributionsModal';
import rawAttributionsMarkdown from '../../docs/attributions.md?raw';

describe('Phase 9 — State Sharing, Zod URL Validation, Saved States & Comparison', () => {
  beforeEach(async () => {
    usePlanetaryStore.getState().resetToDefault();
    await clearSavedStatesInIdb();
  });

  it('round-trips PlanetaryState through lz-string URL hash and restores into Zustand store', () => {
    const store = usePlanetaryStore.getState();
    store.selectDeepTimeSlice(150);
    store.setCamera({ lat: -18.5, lon: 44.2, distance: 4.5 });
    store.setGraphicsProfile('high');

    const original = usePlanetaryStore.getState().getSerializableState();
    const hash = encodeStateToUrlHash(original);
    expect(hash.startsWith('#state=')).toBe(true);

    // Reset store to present day, then decode and hydrate from hash
    usePlanetaryStore.getState().resetToDefault();
    expect(usePlanetaryStore.getState().timeScale).toBe('historical');

    const decoded = decodeStateFromUrlHash(hash);
    expect(decoded.success).toBe(true);
    if (decoded.success) {
      usePlanetaryStore.getState().hydrateFromValidatedState(decoded.state);
    }

    const restored = usePlanetaryStore.getState();
    expect(restored.timeScale).toBe('deep-time');
    expect(restored.timestamp).toBe(150);
    expect(restored.camera.lat).toBe(-18.5);
    expect(restored.camera.lon).toBe(44.2);
    expect(restored.graphicsProfile).toBe('high');
  });

  it('rejects tampered, malformed, or raw-dataset-stuffed URL payloads via Zod validation', () => {
    // 1. Corrupted payload
    expect(decodeStateFromUrlHash('#state=not-valid-lzstring!!!').success).toBe(false);

    // 2. Invalid schema shape (invalid camera latitude > 90)
    const badState = {
      ...usePlanetaryStore.getState().getSerializableState(),
      camera: { lat: 999, lon: 0, distance: 3, heading: 0, pitch: 0 },
    };
    const badHash = `#state=${LZString.compressToEncodedURIComponent(
      JSON.stringify(badState)
    )}`;
    const resBadSchema = decodeStateFromUrlHash(badHash);
    expect(resBadSchema.success).toBe(false);

    // 3. Raw dataset inline data URL stuffed into terrainDataset
    const rawDataStuffed = {
      ...usePlanetaryStore.getState().getSerializableState(),
      geography: {
        continentalModel: 'present-wgs84',
        terrainDataset: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
      },
    };
    const stuffedHash = `#state=${LZString.compressToEncodedURIComponent(
      JSON.stringify(rawDataStuffed)
    )}`;
    const resStuffed = decodeStateFromUrlHash(stuffedHash);
    expect(resStuffed.success).toBe(false);
  });

  it('saves, loads, and deletes named states locally across sessions', async () => {
    const state66 = createCanonicalComparisonPresets()['deep-time-66ma-reconstructed'];
    await saveNamedStateToIdb('My K-Pg Snapshot', state66);

    const loaded = await loadSavedStatesFromIdb();
    expect(loaded.length).toBe(1);
    expect(loaded[0].label).toBe('My K-Pg Snapshot');
    expect(loaded[0].timestamp).toBe(66);

    const afterDelete = await deleteSavedStateFromIdb(loaded[0].id);
    expect(afterDelete.length).toBe(0);
  });

  it('renders simultaneous distinct epistemic badges in the Side-by-Side Comparison Modal', () => {
    render(
      React.createElement(ComparisonModal, {
        isOpen: true,
        onClose: () => {},
        savedStates: [],
      })
    );

    const leftBadge = screen.getByTestId('comparison-badge-left');
    const rightBadge = screen.getByTestId('comparison-badge-right');

    // Default compares Present Observed (Left) vs 2100 Projected (Right)
    expect(leftBadge.textContent).toContain('EPISTEMIC CLASS: OBSERVED');
    expect(rightBadge.textContent).toContain('EPISTEMIC CLASS: PROJECTED');
  });

  it('parses every dataset attribution row from docs/attributions.md', () => {
    const rows = parseAttributionsMarkdownTable(rawAttributionsMarkdown);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.some((r) => r.sourceId === 'celestrak-gp-omm-json')).toBe(true);
    expect(rows.some((r) => r.sourceId === 'ipcc-ar6-cmip6-ssp-projections')).toBe(true);
  });
});