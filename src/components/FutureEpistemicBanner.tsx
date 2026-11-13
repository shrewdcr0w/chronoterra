import React from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  evaluateFutureScenarioState,
  FUTURE_PATHWAYS,
} from '../simulation/climate/futureProjections';

export const FutureEpistemicBanner: React.FC = () => {
  const timelineScrubMode = usePlanetaryStore((s) => s.timelineScrubMode);
  const futurePathwayId = usePlanetaryStore((s) => s.futurePathwayId);
  const futureHorizonYear = usePlanetaryStore((s) => s.futureHorizonYear);
  const customWarmingDeltaC = usePlanetaryStore((s) => s.customWarmingDeltaC);
  const customSeaLevelMeters = usePlanetaryStore((s) => s.customSeaLevelMeters);

  if (timelineScrubMode !== 'future-projection') return null;

  const pathway = FUTURE_PATHWAYS[futurePathwayId];
  const evaluated = evaluateFutureScenarioState(
    futurePathwayId,
    futureHorizonYear,
    customWarmingDeltaC,
    customSeaLevelMeters
  );
  const isCustom = futurePathwayId === 'custom-hypothetical';
  const borderColor = isCustom ? '#ef4444' : '#f97316';

  return (
    <>
      {/* 1. Viewport Epistemic Frame */}
      <div
        data-testid="future-viewport-frame"
        style={{
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          border: isCustom ? '3px dotted #ef4444' : '3px solid #f97316',
          pointerEvents: 'none',
          zIndex: 12,
          boxSizing: 'border-box',
        }}
      />

      {/* 2. Top-Center Non-Collapsible Epistemic Classification Banner */}
      <section
        aria-label="Future Earth Epistemic Classification Notice"
        data-testid="future-epistemic-banner"
        style={{
          position: 'fixed',
          top: '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '680px',
          width: 'calc(100vw - 700px)',
          minWidth: '340px',
          background: isCustom
            ? 'rgba(69, 10, 10, 0.95)'
            : 'rgba(67, 20, 7, 0.95)',
          border: `2px solid ${borderColor}`,
          borderRadius: '4px',
          padding: '8px 14px',
          zIndex: 21,
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fff7ed',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.75)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              background: isCustom ? '#991b1b' : '#9a3412',
              border: `1px solid ${borderColor}`,
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '2px',
              fontWeight: 'bold',
            }}
          >
            {isCustom
              ? `HYPOTHETICAL — USER-DEFINED CUSTOM SLIDERS (${futureHorizonYear} CE)`
              : `PROJECTED — PUBLISHED IPCC AR6 SCENARIO (${pathway.shortCode}, ${futureHorizonYear} CE)`}
          </span>

          <span style={{ color: '#fed7aa', fontWeight: 'bold' }}>
            ΔT: +{evaluated.warmingDeltaC}°C | GMSL: +{evaluated.seaLevelRiseMeters} m
          </span>
        </div>

        <div style={{ color: '#ffedd5', lineHeight: 1.4 }}>
          {isCustom ? (
            <>
              <strong>CUSTOM SCENARIO NOTICE:</strong> These warming (+
              {evaluated.warmingDeltaC}°C) and sea-level (+{evaluated.seaLevelRiseMeters} m) values
              are controlled by user sliders and are <strong>NOT</strong> a published IPCC or CMIP6
              model output.
            </>
          ) : (
            <>
              <strong>PUBLISHED MODEL PROJECTION:</strong> {pathway.citationSummary} Biome shifts,
              polar ice retreat, and coastal inundation halos are rendered from this scenario’s
              published median warming and sea-level commitment.
            </>
          )}
        </div>
      </section>
    </>
  );
};