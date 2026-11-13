import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  CatastropheKind,
  CURATED_CATASTROPHE_EVENTS,
} from '../simulation/catastrophes/curatedEvents';
import { evaluateCatastropheModel } from '../simulation/catastrophes/eventSimulationModel';

export const EventLabPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [customKind, setCustomKind] = useState<CatastropheKind>('impact');
  const [customLat, setCustomLat] = useState<number>(20.59);
  const [customLon, setCustomLon] = useState<number>(78.96);
  const [customIntensity, setCustomIntensity] = useState<number>(6.5);
  const [customRecoveryYears, setCustomRecoveryYears] = useState<number>(50);

  const event = usePlanetaryStore((s) => s.event);
  const activeEventMeta = usePlanetaryStore((s) => s.activeEventMeta);
  const isPlacingHypotheticalEvent = usePlanetaryStore((s) => s.isPlacingHypotheticalEvent);

  const launchCatalogEvent = usePlanetaryStore((s) => s.launchCatalogEvent);
  const launchHypotheticalEvent = usePlanetaryStore((s) => s.launchHypotheticalEvent);
  const setEventIntensity = usePlanetaryStore((s) => s.setEventIntensity);
  const setEventProgress = usePlanetaryStore((s) => s.setEventProgress);
  const setIsPlacingHypotheticalEvent = usePlanetaryStore(
    (s) => s.setIsPlacingHypotheticalEvent
  );
  const clearActiveEvent = usePlanetaryStore((s) => s.clearActiveEvent);

  const kinematics =
    event && activeEventMeta
      ? evaluateCatastropheModel(
          activeEventMeta.kind,
          event.intensity,
          event.progress,
          activeEventMeta.recoveryHorizonYears
        )
      : null;

  return (
    <aside
      aria-label="Event Laboratory Panel"
      style={{
        position: 'fixed',
        top: '64px',
        left: '340px',
        width: '320px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.94)',
        border: event ? '1px solid #ef4444' : '1px solid #334155',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 16,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#f87171' }}>EVENT LABORATORY (PHASE 7)</strong>
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
          {/* 1. Curated Historical & Deep-Time Reconstructed Events */}
          <div>
            <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
              CURATED HISTORICAL & GEOLOGICAL EVENTS:
            </strong>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '4px',
                maxHeight: '145px',
                overflowY: 'auto',
              }}
            >
              {CURATED_CATASTROPHE_EVENTS.map((ev) => {
                const isSelected = activeEventMeta?.id === ev.id;
                const badgeColor =
                  ev.recordEpistemicClass === 'observed' ? '#10b981' : '#c084fc';
                return (
                  <button
                    key={ev.id}
                    onClick={() => launchCatalogEvent(ev)}
                    style={{
                      background: isSelected ? '#450a0a' : '#0f172a',
                      color: '#e2e8f0',
                      border: isSelected ? '1px solid #ef4444' : '1px solid #1e293b',
                      padding: '5px 7px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                      <strong style={{ color: '#fca5a5' }}>{ev.title}</strong>
                      <span
                        style={{
                          fontSize: '9px',
                          color: badgeColor,
                          border: `1px solid ${badgeColor}`,
                          padding: '0 3px',
                          borderRadius: '2px',
                          height: 'fit-content',
                        }}
                      >
                        {ev.recordEpistemicClass.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {ev.magnitudeLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #1e293b', margin: '2px 0' }} />

          {/* 2. User-Placed Hypothetical Event Builder */}
          <div
            style={{
              background: '#1e1b4b',
              border: '1px solid #ef4444',
              borderRadius: '3px',
              padding: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fecaca', fontSize: '11px' }}>
                PLACE HYPOTHETICAL EVENT
              </strong>
              <span
                style={{
                  background: '#7f1d1d',
                  color: '#fecaca',
                  border: '1px solid #ef4444',
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                }}
              >
                HYPOTHETICAL
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <label style={{ fontSize: '11px', flex: 1 }}>
                Type:
                <select
                  aria-label="Hypothetical Event Kind"
                  value={customKind}
                  onChange={(e) => setCustomKind(e.target.value as CatastropheKind)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  <option value="impact">Asteroid Impact</option>
                  <option value="volcano">Volcanic Eruption</option>
                </select>
              </label>

              <label style={{ fontSize: '11px', width: '90px' }}>
                Horizon (yr):
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={customRecoveryYears}
                  onChange={(e) => setCustomRecoveryYears(Number(e.target.value) || 25)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <label style={{ fontSize: '11px', flex: 1 }}>
                Lat (°):
                <input
                  aria-label="Hypothetical Event Latitude"
                  type="number"
                  min={-90}
                  max={90}
                  step={0.5}
                  value={customLat}
                  onChange={(e) => setCustomLat(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              </label>
              <label style={{ fontSize: '11px', flex: 1 }}>
                Lon (°):
                <input
                  aria-label="Hypothetical Event Longitude"
                  type="number"
                  min={-180}
                  max={180}
                  step={0.5}
                  value={customLon}
                  onChange={(e) => setCustomLon(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button
                onClick={() =>
                  launchHypotheticalEvent({
                    kind: customKind,
                    lat: customLat,
                    lon: customLon,
                    intensity: customIntensity,
                    recoveryHorizonYears: customRecoveryYears,
                  })
                }
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Trigger Hypothetical
              </button>

              <button
                onClick={() => setIsPlacingHypotheticalEvent(!isPlacingHypotheticalEvent)}
                style={{
                  background: isPlacingHypotheticalEvent ? '#f59e0b' : '#1e293b',
                  color: isPlacingHypotheticalEvent ? '#000000' : '#e2e8f0',
                  border: '1px solid #475569',
                  padding: '5px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                }}
              >
                {isPlacingHypotheticalEvent ? 'Click Globe Now...' : 'Pick on Globe'}
              </button>
            </div>
          </div>

          {/* 3. Active Event Telemetry & Intensity/Progress Controls */}
          {event && activeEventMeta && kinematics && (
            <div
              data-testid="active-event-readout"
              style={{
                background: '#0f172a',
                border: '1px solid #ef4444',
                borderRadius: '3px',
                padding: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#f87171' }}>ACTIVE EVENT MODEL</strong>
                <button
                  onClick={clearActiveEvent}
                  style={{
                    background: '#334155',
                    color: '#ffffff',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                >
                  Clear Event
                </button>
              </div>

              <div style={{ marginTop: '4px', color: '#e2e8f0' }}>
                <strong>{activeEventMeta.title}</strong>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                Citation: {activeEventMeta.citationSummary}
              </div>

              <div style={{ marginTop: '6px' }}>
                <label
                  htmlFor="event-intensity-slider"
                  style={{ display: 'flex', justifyContent: 'space-between', color: '#fecaca' }}
                >
                  <span>Model Intensity (1–10):</span>
                  <strong>{event.intensity.toFixed(1)}</strong>
                </label>
                <input
                  id="event-intensity-slider"
                  aria-label="Active Event Intensity"
                  type="range"
                  min={1}
                  max={10}
                  step={0.2}
                  value={event.intensity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCustomIntensity(val);
                    setEventIntensity(val);
                  }}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginTop: '4px' }}>
                <label
                  htmlFor="event-progress-slider"
                  style={{ display: 'flex', justifyContent: 'space-between', color: '#fde047' }}
                >
                  <span>Event & Recovery Progress:</span>
                  <strong>{Math.round(event.progress * 100)}%</strong>
                </label>
                <input
                  id="event-progress-slider"
                  aria-label="Active Event Progress"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={event.progress}
                  onChange={(e) => setEventProgress(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </div>

              <div style={{ color: '#cbd5e1', fontSize: '10px', marginTop: '4px' }}>
                <div>Stage: <strong>{kinematics.phaseLabel}</strong></div>
                <div>
                  Shockwave Radius: {kinematics.shockwaveRadiusDeg}° | Max Veg Scar:{' '}
                  {kinematics.maxDamageRadiusDeg}°
                </div>
                <div>
                  Biome Damage Factor: {(kinematics.temporalDamageFactor * 100).toFixed(0)}% |
                  Pioneer Flora: {(kinematics.pioneerRegrowthFraction * 100).toFixed(0)}%
                </div>
                <div>
                  Recovery Elapsed: +{kinematics.elapsedRecoveryYears} /{' '}
                  {activeEventMeta.recoveryHorizonYears} yrs
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};