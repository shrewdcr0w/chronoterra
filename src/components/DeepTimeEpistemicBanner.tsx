import React from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { getDeepTimeSliceByMa } from '../simulation/time/deepTimeSlices';

export const DeepTimeEpistemicBanner: React.FC = () => {
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const layers = usePlanetaryStore((s) => s.layers);

  if (timeScale !== 'deep-time') return null;

  const activeSlice = getDeepTimeSliceByMa(timestamp);
  const hasHypotheticalFlora = Boolean(layers.paleoVegetation);

  const frameColor = hasHypotheticalFlora ? '#f59e0b' : '#a855f7';

  return (
    <>
      {/* 1. Full-Viewport Dashed Geological Survey Frame (Visibly distinguishes Deep-Time from Satellite Mode) */}
      <div
        data-testid="deep-time-viewport-frame"
        style={{
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          border: `3px dashed ${frameColor}`,
          pointerEvents: 'none',
          zIndex: 12,
          boxSizing: 'border-box',
        }}
      />

      {/* 2. Non-Collapsible Top-Center Epistemic Caution Banner (Visible without opening any menu) */}
      <section
        aria-label="Deep-Time Scientific Reconstruction Notice"
        data-testid="deep-time-epistemic-banner"
        style={{
          position: 'fixed',
          top: '58px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '640px',
          width: 'calc(100vw - 700px)',
          minWidth: '340px',
          background: 'rgba(28, 12, 54, 0.94)',
          border: `1px solid ${frameColor}`,
          borderRadius: '4px',
          padding: '8px 14px',
          zIndex: 18,
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#f3e8ff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.65)',
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
              background: '#581c87',
              border: '1px solid #c084fc',
              color: '#f3e8ff',
              padding: '2px 6px',
              borderRadius: '2px',
              fontWeight: 'bold',
            }}
          >
            RECONSTRUCTED PALEOGEOGRAPHY ({activeSlice.ma} Ma — {activeSlice.period})
          </span>

          {hasHypotheticalFlora && (
            <span
              style={{
                background: '#7f1d1d',
                border: '1px solid #f87171',
                color: '#fecaca',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: 'bold',
              }}
            >
              + HYPOTHETICAL PALEOBIOME BELTS
            </span>
          )}
        </div>

        <div style={{ color: '#e9d5ff', lineHeight: 1.4 }}>
          <strong>EPISTEMIC NOTICE — NOT SATELLITE IMAGERY:</strong> These landmasses are
          scientific reconstructions ({activeSlice.continentalModel}, sea level{' '}
          {activeSlice.seaLevelMeters >= 0
            ? `+${activeSlice.seaLevelMeters}m`
            : `${activeSlice.seaLevelMeters}m`}{' '}
          vs. present) with real paleomagnetic and longitudinal uncertainty.{' '}
          <span style={{ color: '#cbd5e1' }}>{activeSlice.uncertaintyNote}</span>
        </div>
      </section>
    </>
  );
};