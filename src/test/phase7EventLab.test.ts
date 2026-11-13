import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { PlanetaryStateSchema } from '../types/planetaryState';
import { CURATED_CATASTROPHE_EVENTS } from '../simulation/catastrophes/curatedEvents';
import {
  computeLocalVegetationDamage,
  evaluateCatastropheModel,
} from '../simulation/catastrophes/eventSimulationModel';
import { EventEpistemicBanner } from '../components/EventEpistemicBanner';

describe('Phase 7 — Event Laboratory & Simplified Ecological Recovery Model', () => {
  beforeEach(() => {
    usePlanetaryStore.getState().resetToDefault();
  });

  it('activates a curated historical event and a user-placed hypothetical event with valid PlanetaryState.event contract', () => {
    const store = usePlanetaryStore.getState();

    // 1. Launch curated 66 Ma Chicxulub impact event
    const chicxulub = CURATED_CATASTROPHE_EVENTS.find(
      (e) => e.id === 'reconstructed-chicxulub-66ma'
    )!;
    store.launchCatalogEvent(chicxulub);

    const stateAfterCatalog = usePlanetaryStore.getState();
    expect(stateAfterCatalog.timeScale).toBe('deep-time');
    expect(stateAfterCatalog.timestamp).toBe(66);
    expect(stateAfterCatalog.event).toEqual({
      type: 'reconstructed-chicxulub-66ma',
      intensity: 9.8,
      progress: 0.2,
    });
    // Non-negotiable Rule: Active procedural catastrophe model forces composite scenario to HYPOTHETICAL
    expect(stateAfterCatalog.scenario.type).toBe('hypothetical');
    expect(stateAfterCatalog.scenario.sourceIds).toContain(
      'chronoterra-event-decay-regrowth-model-v1'
    );

    // 2. Launch user-placed hypothetical asteroid impact
    store.launchHypotheticalEvent({
      kind: 'impact',
      lat: 35.0,
      lon: -40.0,
      intensity: 7.5,
      recoveryHorizonYears: 100,
    });

    const stateAfterHypo = usePlanetaryStore.getState();
    expect(stateAfterHypo.event).toEqual({
      type: 'hypothetical-impact',
      intensity: 7.5,
      progress: 0.2,
    });
    expect(stateAfterHypo.activeEventMeta?.isUserPlacedHypothetical).toBe(true);
    expect(stateAfterHypo.scenario.type).toBe('hypothetical');

    const schemaCheck = PlanetaryStateSchema.safeParse(
      stateAfterHypo.getSerializableState()
    );
    expect(schemaCheck.success).toBe(true);
  });

  it('computes vegetation damage peak at progress=0.20 and exponential regrowth as progress approaches 1.0', () => {
    const kPre = evaluateCatastropheModel('impact', 8.0, 0.0, 50);
    const kPeak = evaluateCatastropheModel('impact', 8.0, 0.2, 50);
    const kMid = evaluateCatastropheModel('impact', 8.0, 0.55, 50);
    const kRecovered = evaluateCatastropheModel('impact', 8.0, 1.0, 50);

    expect(kPre.temporalDamageFactor).toBe(0);
    expect(kPeak.temporalDamageFactor).toBeCloseTo(1.0, 3);
    expect(kMid.pioneerRegrowthFraction).toBeGreaterThan(0.5);
    expect(kRecovered.temporalDamageFactor).toBeLessThan(0.05);

    const dmgAtEpicenterPeak = computeLocalVegetationDamage(2.0, kPeak);
    const dmgAtEpicenterRecovered = computeLocalVegetationDamage(2.0, kRecovered);
    expect(dmgAtEpicenterPeak.damageFraction).toBeGreaterThan(0.75);
    expect(dmgAtEpicenterRecovered.damageFraction).toBeLessThan(0.05);
  });

  it('renders the explicit HYPOTHETICAL EventEpistemicBanner whenever an event is active', () => {
    const store = usePlanetaryStore.getState();
    const { rerender } = render(React.createElement(EventEpistemicBanner));
    expect(screen.queryByTestId('event-epistemic-banner')).toBeNull();

    store.launchHypotheticalEvent({
      kind: 'volcano',
      lat: 10,
      lon: 20,
      intensity: 6.0,
      recoveryHorizonYears: 30,
    });
    rerender(React.createElement(EventEpistemicBanner));

    const banner = screen.getByTestId('event-epistemic-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain(
      'HYPOTHETICAL — SIMPLIFIED ANALYTICAL EVENT MODEL'
    );
    expect(banner.textContent).toContain('ORIGIN: USER-PLACED HYPOTHETICAL SCENARIO');
  });
});