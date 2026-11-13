import React, { useMemo, useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { CELESTRAK_GROUPS } from '../simulation/orbit/ommTypes';
import { GRAPHICS_PRESETS } from '../types/planetaryState';

export const OrbitalPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const showSatellites = usePlanetaryStore((s) => s.orbitalState.showSatellites);
  const enabledSatelliteGroups = usePlanetaryStore((s) => s.enabledSatelliteGroups);
  const satelliteDensity = usePlanetaryStore((s) => s.satelliteDensity);
  const satelliteSearchQuery = usePlanetaryStore((s) => s.satelliteSearchQuery);
  const selectedSatelliteNoradId = usePlanetaryStore((s) => s.selectedSatelliteNoradId);
  const propagatedSatellites = usePlanetaryStore((s) => s.propagatedSatellites);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const runtimeTelemetry = usePlanetaryStore((s) => s.runtimeTelemetry);

  const setShowSatellites = usePlanetaryStore((s) => s.setShowSatellites);
  const toggleSatelliteGroup = usePlanetaryStore((s) => s.toggleSatelliteGroup);
  const setSatelliteDensity = usePlanetaryStore((s) => s.setSatelliteDensity);
  const setSatelliteSearchQuery = usePlanetaryStore((s) => s.setSatelliteSearchQuery);
  const setSelectedSatelliteNoradId = usePlanetaryStore((s) => s.setSelectedSatelliteNoradId);
  const stepHistoricalMinutes = usePlanetaryStore((s) => s.stepHistoricalMinutes);

  const preset = GRAPHICS_PRESETS[graphicsProfile];

  const filteredSatellites = useMemo(() => {
    const q = satelliteSearchQuery.trim().toLowerCase();
    if (!q) return propagatedSatellites;
    return propagatedSatellites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.noradId).includes(q) ||
        s.regime.toLowerCase().includes(q)
    );
  }, [propagatedSatellites, satelliteSearchQuery]);

  const selectedSatellite = useMemo(
    () =>
      propagatedSatellites.find((s) => s.noradId === selectedSatelliteNoradId) ??
      null,
    [propagatedSatellites, selectedSatelliteNoradId]
  );

  return (
    <aside
      aria-label="Orbital Observatory Panel"
      style={{
        position: 'fixed',
        top: '310px',
        left: '16px',
        width: '310px',
        maxHeight: 'calc(100vh - 410px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.92)',
        border: '1px solid #0284c7',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 15,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#38bdf8' }}>ORBITAL OBSERVATORY (OMM-JSON)</strong>
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
          {/* 1. Independent Global Satellite Toggle (Leaves Natural Celestial Bodies Untouched) */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: showSatellites ? '#064e3b' : '#1e293b',
              border: showSatellites ? '1px solid #10b981' : '1px solid #475569',
              padding: '6px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                aria-label="Global Artificial Satellites Toggle"
                type="checkbox"
                checked={showSatellites}
                onChange={(e) => setShowSatellites(e.target.checked)}
              />
              <span>Artificial Satellites & Orbits</span>
            </span>
            <span style={{ fontSize: '10px', color: '#a7f3d0' }}>OBSERVED</span>
          </label>

          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            Independent of natural bodies (Sun, Moon & planets stay visible when toggled off).
          </div>

          {timeScale === 'deep-time' ? (
            <div
              style={{
                background: '#3b0764',
                border: '1px solid #a855f7',
                padding: '6px 8px',
                borderRadius: '3px',
                color: '#e9d5ff',
                fontSize: '11px',
              }}
            >
              Orbital tracking paused in Deep-Time ({timeScale}) mode. Switch to Historical Era to
              propagate SGP4 satellites.
            </div>
          ) : (
            showSatellites && (
              <>
                {/* 2. CelesTrak OMM Group Checkboxes */}
                <div style={{ marginTop: '2px' }}>
                  <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
                    CELESTRAK GP GROUPS (FORMAT=json):
                  </strong>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      marginTop: '4px',
                    }}
                  >
                    {CELESTRAK_GROUPS.map((grp) => (
                      <label
                        key={grp.id}
                        title={grp.description}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(enabledSatelliteGroups[grp.id])}
                            onChange={() => toggleSatelliteGroup(grp.id)}
                          />
                          <span>{grp.label}</span>
                        </span>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: grp.colorHex,
                            display: 'inline-block',
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Density & Preset Budget Control */}
                <div
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    padding: '6px 8px',
                    borderRadius: '3px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label htmlFor="sat-density-select" style={{ color: '#94a3b8' }}>
                      Density Cap ({graphicsProfile.toUpperCase()} max {preset.maxSatellites}):
                    </label>
                    <select
                      id="sat-density-select"
                      aria-label="Satellite Density Control"
                      value={satelliteDensity}
                      onChange={(e) => setSatelliteDensity(Number(e.target.value))}
                      style={{
                        background: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid #334155',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      <option value={0.25}>25%</option>
                      <option value={0.5}>50%</option>
                      <option value={0.75}>75%</option>
                      <option value={1.0}>100%</option>
                    </select>
                  </div>
                  <div style={{ color: '#64748b', marginTop: '3px', fontSize: '10px' }}>
                    Rendered: {runtimeTelemetry.renderedSatellitesCount} /{' '}
                    {runtimeTelemetry.totalTrackedSatellites} loaded
                    {preset.cullBackfaceSatellites ? ' (Backface culling ON)' : ''}
                  </div>
                </div>

                {/* 4. Fine Orbital Time Stepper (Minutes) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>Orbit Step:</span>
                  <button
                    onClick={() => stepHistoricalMinutes(-15)}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    -15m
                  </button>
                  <button
                    onClick={() => stepHistoricalMinutes(15)}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    +15m
                  </button>
                  <button
                    onClick={() => stepHistoricalMinutes(90)}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    +90m (1 LEO Orbit)
                  </button>
                </div>

                {/* 5. Search & Select Satellite */}
                <input
                  aria-label="Search Satellites by Name or NORAD ID"
                  type="text"
                  placeholder="Search name or 5/6-digit NORAD ID..."
                  value={satelliteSearchQuery}
                  onChange={(e) => setSatelliteSearchQuery(e.target.value)}
                  style={{
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    padding: '5px 8px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />

                <div
                  style={{
                    maxHeight: '110px',
                    overflowY: 'auto',
                    border: '1px solid #1e293b',
                    borderRadius: '3px',
                    background: '#05070d',
                  }}
                >
                  {filteredSatellites.map((sat) => {
                    const isSelected = sat.noradId === selectedSatelliteNoradId;
                    return (
                      <div
                        key={sat.noradId}
                        onClick={() => setSelectedSatelliteNoradId(sat.noradId)}
                        style={{
                          padding: '4px 6px',
                          cursor: 'pointer',
                          background: isSelected ? '#0284c7' : 'transparent',
                          color: isSelected ? '#ffffff' : '#cbd5e1',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          borderBottom: '1px solid #0f172a',
                        }}
                      >
                        <span>{sat.name}</span>
                        <span style={{ color: isSelected ? '#e0f2fe' : '#64748b' }}>
                          #{sat.noradId} ({sat.regime})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 6. Selected Satellite Telemetry Inspector */}
                {selectedSatellite && (
                  <div
                    data-testid="selected-satellite-telemetry"
                    style={{
                      background: '#0f172a',
                      border: '1px solid #facc15',
                      borderRadius: '3px',
                      padding: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#facc15',
                        fontWeight: 'bold',
                      }}
                    >
                      <span>{selectedSatellite.name}</span>
                      <span>[{selectedSatellite.regime}]</span>
                    </div>
                    <div style={{ color: '#cbd5e1', marginTop: '4px' }}>
                      NORAD Catalog ID: <strong>{selectedSatellite.noradId}</strong> (
                      {selectedSatellite.objectId})
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      Altitude: <strong>{selectedSatellite.altitudeKm} km</strong> | Velocity:{' '}
                      {selectedSatellite.velocityKmS} km/s
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      Period: <strong>{selectedSatellite.periodMinutes} min</strong> | Inclination:{' '}
                      <strong>{selectedSatellite.inclinationDeg}°</strong>
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      Sub-Sat Point: {selectedSatellite.latDeg}°, {selectedSatellite.lonDeg}°
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px' }}>
                      OMM Data Epoch: <code>{selectedSatellite.epochISO}</code>
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: '10px', marginTop: '2px' }}>
                      Source: {selectedSatellite.dataSourceLabel}
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </aside>
  );
};