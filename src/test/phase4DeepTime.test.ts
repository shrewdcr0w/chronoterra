import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { PlanetaryStateSchema, formatSimulatedTimestamp } from '../types/planetaryState';
import { DEEP_TIME_SLICES, getDeepTimeSliceByMa } from '../simulation/time/deepTimeSlices';
import { DeepTimeEpistemicBanner } from '../components/DeepTimeEpistemicBanner';

describe('Phase 4 — Geological Time Machine (Deep-Time Mode)', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
  });

  it('switches timeScale to deep-time and snaps strictly to discrete published geological slices', () => {
    const store = usePlanetaryStore.getState();
    store.setTimeScaleMode('deep-time');

    const stateAfterSwitch = usePlanetaryStore.getState();
    expect(stateAfterSwitch.timeScale).toBe('deep-time');
    expect(stateAfterSwitch.timestamp).toBe(66); // Default K-Pg slice
    expect(stateAfterSwitch.geography.continentalModel).toBe('Scotese-PALEOMAP-GPlates-66Ma');
    expect(stateAfterSwitch.geography.seaLevel).toBe(170);

    // Attempt to set an unverified intermediate Ma (e.g., 210 Ma) -> must snap to nearest discrete slice (250 Ma)
    store.setSimulatedTime(210, 'deep-time');
    expect(usePlanetaryStore.getState().timestamp).toBe(250);
    expect(usePlanetaryStore.getState().geography.continentalModel).toBe(
      'Scotese-PALEOMAP-GPlates-250Ma'
    );

    const validated = PlanetaryStateSchema.safeParse(
      usePlanetaryStore.getState().getSerializableState()
    );
    expect(validated.success).toBe(true);
  });

  it('provides at least 5 distinct geological time slices with visibly different craton geometries', () => {
    expect(DEEP_TIME_SLICES.length).toBeGreaterThanOrEqual(5);

    const kpg66 = getDeepTimeSliceByMa(66);
    const pangea250 = getDeepTimeSliceByMa(250);
    const devonian400 = getDeepTimeSliceByMa(400);

    expect(kpg66.cratons.map((c) => c.id)).not.toEqual(pangea250.cratons.map((c) => c.id));
    expect(pangea250.cratons.map((c) => c.id)).not.toEqual(devonian400.cratons.map((c) => c.id));
    expect(formatSimulatedTimestamp(devonian400.ma, 'deep-time')).toContain('400.00 Ma');
  });

  it('distinguishes RECONSTRUCTED continents alone from RECONSTRUCTED + HYPOTHETICAL paleobiome belts', () => {
    const store = usePlanetaryStore.getState();
    store.setTimeScaleMode('deep-time');

    // Default includes paleoVegetation (HYPOTHETICAL) + paleoCoastlines (RECONSTRUCTED)
    expect(usePlanetaryStore.getState().scenario.type).toBe('hypothetical');
    expect(usePlanetaryStore.getState().scenario.sourceIds).toEqual([
      'scotese-gplates-paleomap-v3',
      'paleobiome-climate-belt-procedural-v1',
    ]);

    // Turn off procedural paleovegetation -> pure RECONSTRUCTED paleogeography
    store.setLayer('paleoVegetation', false);
    expect(usePlanetaryStore.getState().scenario.type).toBe('reconstructed');
    expect(usePlanetaryStore.getState().scenario.sourceIds).toEqual([
      'scotese-gplates-paleomap-v3',
    ]);
  });

  it('renders the explicit on-screen DeepTimeEpistemicBanner and dashed frame without opening any menu', () => {
    const store = usePlanetaryStore.getState();

    // Hidden in historical mode
    const { rerender } = render(React.createElement(DeepTimeEpistemicBanner));
    expect(screen.queryByTestId('deep-time-epistemic-banner')).toBeNull();

    // Visible immediately upon entering deep-time mode
    store.selectDeepTimeSlice(250);
    rerender(React.createElement(DeepTimeEpistemicBanner));

    const banner = screen.getByTestId('deep-time-epistemic-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('RECONSTRUCTED PALEOGEOGRAPHY (250 Ma');
    expect(banner.textContent).toContain('EPISTEMIC NOTICE — NOT SATELLITE IMAGERY');
    expect(screen.getByTestId('deep-time-viewport-frame')).toBeInTheDocument();
  });
});