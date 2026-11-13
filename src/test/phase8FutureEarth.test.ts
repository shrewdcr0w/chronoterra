import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { PlanetaryStateSchema } from '../types/planetaryState';
import { evaluateFutureScenarioState } from '../simulation/climate/futureProjections';
import { FutureEpistemicBanner } from '../components/FutureEpistemicBanner';

describe('Phase 8 — Future Earth (IPCC AR6 SSP Projections & Custom Hypothetical Sliders)', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
  });

  it('supports 2050, 2100, and 2200 reference horizons with PROJECTED IPCC AR6 metadata', () => {
    const store = usePlanetaryStore.getState();

    store.setFuturePathway('ssp1-26');
    store.setFutureHorizonYear(2050);
    expect(usePlanetaryStore.getState().scenario.type).toBe('projected');
    expect(usePlanetaryStore.getState().scenario.sourceIds).toContain(
      'ipcc-ar6-cmip6-ssp-projections'
    );
    expect(usePlanetaryStore.getState().geography.seaLevel).toBe(0.19);

    store.setFutureHorizonYear(2100);
    expect(usePlanetaryStore.getState().geography.seaLevel).toBe(0.44);

    store.setFutureHorizonYear(2200);
    expect(usePlanetaryStore.getState().geography.seaLevel).toBe(0.85);

    const validated = PlanetaryStateSchema.safeParse(
      usePlanetaryStore.getState().getSerializableState()
    );
    expect(validated.success).toBe(true);
  });

  it('visibly changes sea-level rise, polar ice threshold, and biome belt parameters across SSP1-2.6, SSP2-4.5, and SSP5-8.5', () => {
    const low2100 = evaluateFutureScenarioState('ssp1-26', 2100, 4.0, 5.0);
    const mid2100 = evaluateFutureScenarioState('ssp2-45', 2100, 4.0, 5.0);
    const high2100 = evaluateFutureScenarioState('ssp5-85', 2100, 4.0, 5.0);

    expect(low2100.warmingDeltaC).toBe(1.8);
    expect(mid2100.warmingDeltaC).toBe(2.7);
    expect(high2100.warmingDeltaC).toBe(4.4);

    expect(high2100.seaLevelRiseMeters).toBeGreaterThan(mid2100.seaLevelRiseMeters);
    expect(mid2100.seaLevelRiseMeters).toBeGreaterThan(low2100.seaLevelRiseMeters);

    // Polar ice retreats further poleward in SSP5-8.5 than SSP1-2.6
    expect(high2100.polarIceCapLatThreshold).toBeGreaterThan(
      low2100.polarIceCapLatThreshold
    );
    // Subtropical arid belt expands wider in SSP5-8.5
    expect(high2100.aridBeltLatRange[1]).toBeGreaterThan(low2100.aridBeltLatRange[1]);
  });

  it('switches epistemic classification to HYPOTHETICAL when custom future sliders are used', () => {
    const store = usePlanetaryStore.getState();
    store.setFuturePathway('ssp2-45');
    expect(usePlanetaryStore.getState().scenario.type).toBe('projected');

    // Adjust custom warming (+6.5°C) and sea-level (+18m) sliders
    store.setCustomFutureSliders(6.5, 18.0);
    const afterCustom = usePlanetaryStore.getState();
    expect(afterCustom.futurePathwayId).toBe('custom-hypothetical');
    expect(afterCustom.scenario.type).toBe('hypothetical');
    expect(afterCustom.scenario.sourceIds).toContain(
      'custom-hypothetical-future-sliders-v1'
    );
    expect(afterCustom.geography.seaLevel).toBe(18.0);
  });

  it('renders the on-screen FutureEpistemicBanner with distinct PROJECTED vs HYPOTHETICAL notices', () => {
    const store = usePlanetaryStore.getState();
    const { rerender } = render(React.createElement(FutureEpistemicBanner));
    expect(screen.queryByTestId('future-epistemic-banner')).toBeNull();

    // Activate published SSP5-8.5 projection
    store.setFuturePathway('ssp5-85');
    store.setFutureHorizonYear(2100);
    rerender(React.createElement(FutureEpistemicBanner));

    const projectedBanner = screen.getByTestId('future-epistemic-banner');
    expect(projectedBanner.textContent).toContain(
      'PROJECTED — PUBLISHED IPCC AR6 SCENARIO'
    );

    // Switch to custom hypothetical sliders
    store.setCustomFutureSliders(5.5, 14.0);
    rerender(React.createElement(FutureEpistemicBanner));

    const hypoBanner = screen.getByTestId('future-epistemic-banner');
    expect(hypoBanner.textContent).toContain(
      'HYPOTHETICAL — USER-DEFINED CUSTOM SLIDERS'
    );
    expect(hypoBanner.textContent).toContain('NOT a published IPCC or CMIP6 model output');
  });
});