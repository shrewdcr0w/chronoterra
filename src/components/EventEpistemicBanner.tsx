import React from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { evaluateCatastropheModel } from '../simulation/catastrophes/eventSimulationModel';

export const EventEpistemicBanner: React.FC = () => {
  const event = usePlanetaryStore((s) => s.event);
  const activeEventMeta = usePlanetaryStore((s) => s.activeEventMeta);

  if (!event || !activeEventMeta) return null;

  const kinematics = evaluateCatastropheModel(
    activeEventMeta.kind,
    event.intensity,
    event.progress,
    activeEventMeta.recoveryHorizonYears
  );

  return (
    <section
      aria-label="Hypothetical Catastrophe Model Epistemic Notice"
      data-testid="event-epistemic-banner"
      style={{
        position: 'fixed',
        top: '56px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '680px',
        width: 'calc(100vw - 700px)',
        minWidth: '340px',
        background: 'rgba(69, 10, 10, 0.95)',
        border: '2px solid #ef4444',
        borderRadius: '4px',
        padding: '8px 14px',
        zIndex: 22,
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fef2f2',
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
            background: '#991b1b',
            border: '1px solid #f87171',
            color: '#ffffff',
            padding: '2px 6px',
            borderRadius: '2px',
            fontWeight: 'bold',
          }}
        >
          HYPOTHETICAL — SIMPLIFIED ANALYTICAL EVENT MODEL
        </span>

        <span
          style={{
            background: '#1e293b',
            border: '1px solid #64748b',
            color: '#e2e8f0',
            padding: '2px 6px',
            borderRadius: '2px',
          }}
        >
          {activeEventMeta.isUserPlacedHypothetical
            ? 'ORIGIN: USER-PLACED HYPOTHETICAL SCENARIO'
            : `CATALOG RECORD: ${activeEventMeta.recordEpistemicClass.toUpperCase()} (${activeEventMeta.dateDisplay})`}
        </span>
      </div>

      <div style={{ color: '#fecaca', lineHeight: 1.4 }}>
        <strong>{activeEventMeta.title}</strong> [{activeEventMeta.lat.toFixed(2)}°,{' '}
        {activeEventMeta.lon.toFixed(2)}°] | Intensity: <strong>{event.intensity.toFixed(1)}/10</strong>{' '}
        | Progress: <strong>{Math.round(event.progress * 100)}%</strong> ({kinematics.phaseLabel}, +
        {kinematics.elapsedRecoveryYears} yr) | Analytical ΔT Proxy:{' '}
        <strong>{kinematics.simplifiedTempDeltaC}°C</strong>
      </div>

      <div style={{ color: '#fca5a5', fontSize: '10px', marginTop: '3px' }}>
        <strong>MODEL DISCLAIMER:</strong> Shockwave rings, zonal ash clouds, and vegetation
        decay-and-regrowth curves are procedural analytical parameterizations—NOT hydrocode blast
        physics or coupled General Circulation Model (GCM) simulations.
      </div>
    </section>
  );
};