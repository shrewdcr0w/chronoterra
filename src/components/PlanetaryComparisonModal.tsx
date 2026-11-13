import React from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { formatSimulatedTimestamp } from '../types/planetaryState';
import { CelestialBodyId } from '../simulation/astronomy/solarSystemEphemeris';

interface PlanetaryComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDERED_BODIES: CelestialBodyId[] = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Moon',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

export const PlanetaryComparisonModal: React.FC<PlanetaryComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const snapshot = usePlanetaryStore((s) => s.latestEphemerisSnapshot);
  const setCelestialFocusTarget = usePlanetaryStore((s) => s.setCelestialFocusTarget);

  if (!isOpen || !snapshot) return null;

  return (
    <div
      role="dialog"
      aria-label="Planetary Comparison View"
      data-testid="planetary-comparison-modal"
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(920px, 94vw)',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.97)',
        border: '1px solid #38bdf8',
        borderRadius: '6px',
        padding: '16px',
        zIndex: 30,
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e2e8f0',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
            LIVE PLANETARY EPHEMERIS & ROTATIONAL COMPARISON
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
            Computed via <code>astronomy-engine</code> (VSOP87 / IAU WGCCRE) at{' '}
            <strong>{formatSimulatedTimestamp(timestamp, timeScale)}</strong> — Classification:{' '}
            <span style={{ color: '#10b981' }}>OBSERVED EPHEMERIS</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Close [X]
        </button>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
          fontSize: '11px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#38bdf8' }}>
            <th style={{ padding: '6px' }}>Body</th>
            <th style={{ padding: '6px' }}>Radius (km / R⊕)</th>
            <th style={{ padding: '6px' }}>Heliocentric Dist (AU / 10⁶ km)</th>
            <th style={{ padding: '6px' }}>Geocentric Dist (AU)</th>
            <th style={{ padding: '6px' }}>Orbital Speed</th>
            <th style={{ padding: '6px' }}>Sidereal Rotation (hr)</th>
            <th style={{ padding: '6px' }}>Solar Day (hr)</th>
            <th style={{ padding: '6px' }}>Camera</th>
          </tr>
        </thead>
        <tbody>
          {ORDERED_BODIES.map((id) => {
            const b = snapshot.bodies[id];
            const barWidthPct = Math.min(100, Math.max(4, (b.radiusInEarthRadii / 11.2) * 100));
            return (
              <tr key={id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '6px', fontWeight: 'bold', color: '#fde047' }}>{b.id}</td>
                <td style={{ padding: '6px' }}>
                  <div>
                    {b.equatorialRadiusKm.toLocaleString()} km ({b.radiusInEarthRadii} R⊕)
                  </div>
                  <div
                    style={{
                      height: '4px',
                      width: `${barWidthPct}%`,
                      background: '#38bdf8',
                      marginTop: '2px',
                      borderRadius: '2px',
                    }}
                  />
                </td>
                <td style={{ padding: '6px' }}>
                  {b.distanceFromSunAu} AU ({b.distanceFromSunMillionKm}M km)
                </td>
                <td style={{ padding: '6px' }}>{b.distanceFromEarthAu} AU</td>
                <td style={{ padding: '6px' }}>{b.orbitalSpeedKmS} km/s</td>
                <td style={{ padding: '6px' }}>
                  {b.siderealDayHours} hr {b.siderealDayHours < 0 ? '(Retrograde)' : ''}
                </td>
                <td style={{ padding: '6px' }}>{b.solarDayHours} hr</td>
                <td style={{ padding: '6px' }}>
                  <button
                    onClick={() => {
                      setCelestialFocusTarget(b.id);
                      onClose();
                    }}
                    style={{
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                    }}
                  >
                    Fly To
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};