import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  evaluateFutureScenarioState,
  FUTURE_HORIZON_YEARS,
  FUTURE_PATHWAYS,
  FutureHorizonYear,
  FuturePathwayId,
} from '../simulation/climate/futureProjections';

const PATHWAY_ORDER: FuturePathwayId[] = [
  'ssp1-26',
  'ssp2-45',
  'ssp5-85',
  'custom-hypothetical',
];

export const FutureEarthPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const timelineScrubMode = usePlanetaryStore((s) => s.timelineScrubMode);
  const futurePathwayId = usePlanetaryStore((s) => s.futurePathwayId);
  const futureHorizonYear = usePlanetaryStore((s) => s.futureHorizonYear);
  const customWarmingDeltaC = usePlanetaryStore((s) => s.customWarmingDeltaC);
  const customSeaLevelMeters = usePlanetaryStore((s) => s.customSeaLevelMeters);
  const layers = usePlanetaryStore((s) => s.layers);

  const setFuturePathway = usePlanetaryStore((s) => s.setFuturePathway);
  const setFutureHorizonYear = usePlanetaryStore((s) => s.setFutureHorizonYear);
  const setCustomFutureSliders = usePlanetaryStore((s) => s.setCustomFutureSliders);
  const toggleLayer = usePlanetaryStore((s) => s.toggleLayer);

  const activePathway = FUTURE_PATHWAYS[futurePathwayId];
  const publishedHorizon = activePathway.horizons[futureHorizonYear];
  const evaluated = evaluateFutureScenarioState(
    futurePathwayId,
    futureHorizonYear,
    customWarmingDeltaC,
    customSeaLevelMeters
  );

  const isFutureActive = timelineScrubMode === 'future-projection';
  const isCustom = futurePathwayId === 'custom-hypothetical';

  return (
    <aside
      aria-label="Future Earth Scenario Panel"
      style={{
        position: 'fixed',
        top: '64px',
        left: '672px',
        width: '330px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.94)',
        border: isFutureActive
          ? isCustom
            ? '1px solid #ef4444'
            : '1px solid #f97316'
          : '1px solid #334155',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 16,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#fb923c' }}>FUTURE EARTH (PHASE 8)</strong>
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
          {/* 1. Discrete Future Reference Horizon Selector (2050, 2100, 2200) */}
          <div>
            <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
              REFERENCE HORIZON (DISCRETE DATES):
            </strong>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {FUTURE_HORIZON_YEARS.map((yr: FutureHorizonYear) => {
                const selected = isFutureActive && futureHorizonYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => setFutureHorizonYear(yr)}
                    style={{
                      flex: 1,
                      background: selected ? '#ea580c' : '#0f172a',
                      color: selected ? '#ffffff' : '#cbd5e1',
                      border: selected ? '1px solid #fdba74' : '1px solid #334155',
                      padding: '5px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    {yr} CE
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Emissions Pathway Selector */}
          <div>
            <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
              EMISSIONS PATHWAY / SCENARIO:
            </strong>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '4px',
              }}
            >
              {PATHWAY_ORDER.map((pid) => {
                const p = FUTURE_PATHWAYS[pid];
                const selected = isFutureActive && futurePathwayId === pid;
                const badgeColor =
                  p.epistemicClass === 'projected' ? '#f97316' : '#ef4444';
                return (
                  <button
                    key={pid}
                    onClick={() => setFuturePathway(pid)}
                    style={{
                      background: selected
                        ? p.epistemicClass === 'projected'
                          ? '#7c2d12'
                          : '#7f1d1d'
                        : '#0f172a',
                      color: '#e2e8f0',
                      border: selected
                        ? `1px solid ${badgeColor}`
                        : '1px solid #1e293b',
                      padding: '6px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                      <strong style={{ color: '#fed7aa' }}>{p.shortCode}</strong>
                      <span
                        style={{
                          fontSize: '9px',
                          color: badgeColor,
                          border: `1px solid ${badgeColor}`,
                          padding: '0 4px',
                          borderRadius: '2px',
                        }}
                      >
                        {p.epistemicClass.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {p.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Custom Hypothetical Sliders vs Published IPCC AR6 Readout */}
          {isCustom ? (
            <div
              data-testid="custom-hypothetical-future-controls"
              style={{
                background: '#450a0a',
                border: '1px solid #ef4444',
                borderRadius: '3px',
                padding: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ color: '#fecaca', fontWeight: 'bold' }}>
                HYPOTHETICAL CUSTOM SLIDERS (NOT A PUBLISHED PROJECTION)
              </div>
              <div style={{ color: '#fca5a5', fontSize: '10px', marginTop: '2px' }}>
                Adjusting these sliders overrides IPCC tables with user-defined values.
              </div>

              <div style={{ marginTop: '6px' }}>
                <label
                  htmlFor="custom-warming-slider"
                  style={{ display: 'flex', justifyContent: 'space-between', color: '#fde047' }}
                >
                  <span>Global Warming (ΔT vs 1850–1900):</span>
                  <strong>+{customWarmingDeltaC.toFixed(1)}°C</strong>
                </label>
                <input
                  id="custom-warming-slider"
                  aria-label="Custom Hypothetical Warming Slider"
                  type="range"
                  min={0.5}
                  max={10.0}
                  step={0.1}
                  value={customWarmingDeltaC}
                  onChange={(e) =>
                    setCustomFutureSliders(Number(e.target.value), customSeaLevelMeters)
                  }
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginTop: '4px' }}>
                <label
                  htmlFor="custom-sealevel-slider"
                  style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}
                >
                  <span>Eustatic Sea-Level Rise (GMSL):</span>
                  <strong>+{customSeaLevelMeters.toFixed(1)} m</strong>
                </label>
                <input
                  id="custom-sealevel-slider"
                  aria-label="Custom Hypothetical Sea-Level Slider"
                  type="range"
                  min={0}
                  max={65.0}
                  step={0.5}
                  value={customSeaLevelMeters}
                  onChange={(e) =>
                    setCustomFutureSliders(customWarmingDeltaC, Number(e.target.value))
                  }
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>
            </div>
          ) : (
            <div
              data-testid="published-ipcc-projection-readout"
              style={{
                background: '#0f172a',
                border: '1px solid #f97316',
                borderRadius: '3px',
                padding: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ color: '#fdba74', fontWeight: 'bold' }}>
                PUBLISHED IPCC AR6 PROJECTION ({futureHorizonYear} CE)
              </div>
              <div style={{ color: '#e2e8f0', marginTop: '4px' }}>
                Median Warming (ΔT): <strong>+{publishedHorizon.warmingDeltaC}°C</strong> (Likely:{' '}
                {publishedHorizon.warmingLikelyRangeC[0]}–{publishedHorizon.warmingLikelyRangeC[1]}
                °C)
              </div>
              <div style={{ color: '#e2e8f0' }}>
                Median GMSL Rise: <strong>+{publishedHorizon.seaLevelRiseMeters} m</strong> (Likely:{' '}
                {publishedHorizon.seaLevelLikelyRangeMeters[0]}–
                {publishedHorizon.seaLevelLikelyRangeMeters[1]} m)
              </div>
              <div style={{ color: '#cbd5e1' }}>
                Polar Ice Threshold: <strong>{evaluated.polarIceCapLatThreshold}° Lat</strong> |
                Subtropical Arid Belt:{' '}
                <strong>
                  {evaluated.aridBeltLatRange[0]}°–{evaluated.aridBeltLatRange[1]}°
                </strong>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px' }}>
                Source: {activePathway.citationSummary}
              </div>
            </div>
          )}

          {/* 4. Reused Future Visualization Layer Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            <strong style={{ color: '#cbd5e1' }}>FUTURE LAYERS (REUSED PIPELINE):</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.futureThermalAnomaly !== false}
                onChange={() => toggleLayer('futureThermalAnomaly')}
              />
              <span>Surface Warming & Polar Amplification</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.futureBiomeShift !== false}
                onChange={() => toggleLayer('futureBiomeShift')}
              />
              <span>Biome Shifts & Polar Ice Retreat (Phase 4 Engine)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.futureCoastalInundation !== false}
                onChange={() => toggleLayer('futureCoastalInundation')}
              />
              <span>Sea-Level Rise & Coastal Shelf Inundation</span>
            </label>
          </div>
        </div>
      )}
    </aside>
  );
};