import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  CelestialFocusTarget,
  SolarSystemScaleMode,
} from '../simulation/astronomy/solarSystemEphemeris';

interface SolarSystemPanelProps {
  onOpenComparisonModal: () => void;
}

const FOCUS_TARGETS: Array<{ id: CelestialFocusTarget; label: string }> = [
  { id: 'Earth', label: 'Earth Globe' },
  { id: 'Earth-Moon-System', label: 'Earth–Moon Orbit' },
  { id: 'Moon', label: 'Lunar Close-Up' },
  { id: 'Sun', label: 'Solar System (Sun)' },
  { id: 'Mercury', label: 'Mercury' },
  { id: 'Venus', label: 'Venus' },
  { id: 'Mars', label: 'Mars' },
  { id: 'Jupiter', label: 'Jupiter' },
  { id: 'Saturn', label: 'Saturn' },
  { id: 'Uranus', label: 'Uranus' },
  { id: 'Neptune', label: 'Neptune' },
];

export const SolarSystemPanel: React.FC<SolarSystemPanelProps> = ({
  onOpenComparisonModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const solarSystemScaleMode = usePlanetaryStore((s) => s.solarSystemScaleMode);
  const celestialFocusTarget = usePlanetaryStore((s) => s.celestialFocusTarget);
  const latestEphemerisSnapshot = usePlanetaryStore((s) => s.latestEphemerisSnapshot);
  const layers = usePlanetaryStore((s) => s.layers);

  const setSolarSystemScaleMode = usePlanetaryStore((s) => s.setSolarSystemScaleMode);
  const setCelestialFocusTarget = usePlanetaryStore((s) => s.setCelestialFocusTarget);
  const toggleLayer = usePlanetaryStore((s) => s.toggleLayer);

  const lunar = latestEphemerisSnapshot?.lunar;

  return (
    <aside
      aria-label="Solar System and Earth-Moon Explorer Panel"
      style={{
        position: 'fixed',
        bottom: '108px',
        right: '16px',
        width: '350px',
        maxHeight: 'calc(100vh - 460px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.94)',
        border: '1px solid #f59e0b',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 16,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#fbbf24' }}>SOLAR SYSTEM & EARTH–MOON</strong>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            color: '#38bdf8',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {collapsed ? '[Expand]' : '[Collapse]'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 1. Explicit Scale Mode Toggle & Banner */}
          <div
            data-testid="scale-mode-indicator"
            style={{
              background: solarSystemScaleMode === 'true-scale' ? '#064e3b' : '#78350f',
              border:
                solarSystemScaleMode === 'true-scale'
                  ? '1px solid #10b981'
                  : '1px solid #f59e0b',
              color: '#fef3c7',
              padding: '6px 8px',
              borderRadius: '3px',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>
                SCALE MODE:{' '}
                {solarSystemScaleMode === 'true-scale'
                  ? 'TRUE 1:1 ASTRONOMICAL SCALE'
                  : 'EDUCATIONAL SCALE (COMPRESSED)'}
              </strong>
              <select
                aria-label="Solar System Scale Mode"
                value={solarSystemScaleMode}
                onChange={(e) =>
                  setSolarSystemScaleMode(e.target.value as SolarSystemScaleMode)
                }
                style={{
                  background: '#0f172a',
                  color: '#fde047',
                  border: '1px solid #f59e0b',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  padding: '2px 4px',
                }}
              >
                <option value="educational">Educational Scale</option>
                <option value="true-scale">True 1:1 Scale</option>
              </select>
            </div>
            <div style={{ marginTop: '4px', color: '#fde68a', fontSize: '10px' }}>
              {solarSystemScaleMode === 'true-scale'
                ? 'True 1:1 Scale: 1 AU = 23,481 R⊕ and Moon = ~60.3 R⊕. At solar-system zoom, planets are sub-pixel specks due to vast interplanetary void.'
                : 'Educational Scale: Power-law compressed distances & exaggerated planetary radii so all 8 planets and the Moon are visually navigable.'}
            </div>
          </div>

          {/* 2. Smooth Camera Travel Targets */}
          <div>
            <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
              SMOOTH CAMERA TRANSIT TARGET:
            </strong>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
                marginTop: '4px',
              }}
            >
              {FOCUS_TARGETS.map((t) => {
                const active = celestialFocusTarget === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setCelestialFocusTarget(t.id)}
                    style={{
                      background: active ? '#d97706' : '#0f172a',
                      color: active ? '#ffffff' : '#cbd5e1',
                      border: active ? '1px solid #fde047' : '1px solid #334155',
                      padding: '4px 4px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Dedicated Earth-Moon Live Telemetry */}
          {lunar && (
            <div
              data-testid="earth-moon-telemetry"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '3px',
                padding: '6px 8px',
                fontSize: '11px',
              }}
            >
              <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                EARTH–MOON EPHEMERIS (ASTRONOMY-ENGINE)
              </div>
              <div style={{ color: '#e2e8f0', marginTop: '3px' }}>
                Live Distance: <strong>{lunar.distanceKm.toLocaleString()} km</strong> (
                {lunar.distanceEarthRadii} R⊕)
              </div>
              <div style={{ color: '#e2e8f0' }}>
                Lunar Phase: <strong>{lunar.phaseName}</strong> ({lunar.phaseAngleDeg}°)
              </div>
              <div style={{ color: '#cbd5e1' }}>
                Illuminated Fraction:{' '}
                <strong>{(lunar.illuminatedFraction * 100).toFixed(1)}%</strong> | Rotation:
                Tidal-Locked
              </div>
            </div>
          )}

          {/* 4. Orbit Overlay Toggles & Planetary Comparison Trigger */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={layers.planetOrbits !== false}
                onChange={() => toggleLayer('planetOrbits')}
              />
              <span>Heliocentric Orbits</span>
            </label>

            <button
              onClick={onOpenComparisonModal}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              Compare Planets
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};