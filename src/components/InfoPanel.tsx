import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  formatSimulatedTimestamp,
  GRAPHICS_PRESETS,
  ScenarioType,
} from '../types/planetaryState';
import { DATASET_REGISTRY } from '../data/metadata/datasetRegistry';
import { getCacheStats } from '../data/loaders/cacheManager';
import { EonetEventMarker } from '../data/loaders/eonetLoader';
import { getDeepTimeSliceByMa } from '../simulation/time/deepTimeSlices';

const BADGE_COLORS: Record<ScenarioType, { bg: string; border: string; text: string }> = {
  observed: { bg: '#064e3b', border: '#10b981', text: '#a7f3d0' },
  reconstructed: { bg: '#3b0764', border: '#a855f7', text: '#e9d5ff' },
  projected: { bg: '#7c2d12', border: '#f97316', text: '#fed7aa' },
  hypothetical: { bg: '#7f1d1d', border: '#ef4444', text: '#fecaca' },
};

export const InfoPanel: React.FC<{
  hoveredEvent: EonetEventMarker | null;
}> = ({ hoveredEvent }) => {
  const [collapsed, setCollapsed] = useState(false);
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const scenario = usePlanetaryStore((s) => s.scenario);
  const geography = usePlanetaryStore((s) => s.geography);
  const camera = usePlanetaryStore((s) => s.camera);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const runtimeTelemetry = usePlanetaryStore((s) => s.runtimeTelemetry);

  const preset = GRAPHICS_PRESETS[graphicsProfile];
  const badgeStyle = BADGE_COLORS[scenario.type];
  const cacheStats = getCacheStats();
  const activeSlice = timeScale === 'deep-time' ? getDeepTimeSliceByMa(timestamp) : null;

  return (
    <aside
      style={{
        position: 'fixed',
        top: '64px',
        right: '16px',
        width: '350px',
        maxHeight: 'calc(100vh - 460px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.92)',
        border: timeScale === 'deep-time' ? '1px solid #a855f7' : '1px solid #1e293b',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 15,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#e2e8f0' }}>EPISTEMIC & DATASET TELEMETRY</strong>
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
          <div
            style={{
              background: badgeStyle.bg,
              border: `1px solid ${badgeStyle.border}`,
              color: badgeStyle.text,
              padding: '6px 8px',
              borderRadius: '3px',
              fontWeight: 'bold',
            }}
          >
            SCENE CLASSIFICATION: {scenario.type.toUpperCase()}
          </div>

          <div>
            <span style={{ color: '#94a3b8' }}>Simulated Time: </span>
            <strong>{formatSimulatedTimestamp(timestamp, timeScale)}</strong>
          </div>

          <div>
            <span style={{ color: '#94a3b8' }}>Continental Model: </span>
            <code>{geography.continentalModel}</code>
          </div>

          {activeSlice && (
            <div
              style={{
                background: '#1e1b4b',
                border: '1px solid #6366f1',
                padding: '6px 8px',
                borderRadius: '3px',
                fontSize: '11px',
              }}
            >
              <div style={{ color: '#e0e7ff', fontWeight: 'bold' }}>
                {activeSlice.period} — {activeSlice.name}
              </div>
              <div style={{ color: '#cbd5e1', marginTop: '3px' }}>
                Est. Global Mean Temp: ~{activeSlice.paleoClimate.globalMeanTempC}°C | Eustatic Sea
                Level:{' '}
                {activeSlice.seaLevelMeters >= 0
                  ? `+${activeSlice.seaLevelMeters}m`
                  : `${activeSlice.seaLevelMeters}m`}
              </div>
              <div style={{ color: '#a5b4fc', marginTop: '3px' }}>
                Flora & Biomes: {activeSlice.paleoClimate.biomeSummary}
              </div>
            </div>
          )}

          {hoveredEvent && timeScale === 'historical' && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #38bdf8',
                padding: '6px 8px',
                borderRadius: '3px',
              }}
            >
              <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>{hoveredEvent.title}</div>
              <div style={{ color: '#cbd5e1', fontSize: '11px' }}>
                Category: {hoveredEvent.categoryTitle} | Date: {hoveredEvent.dateISO}
              </div>
            </div>
          )}

          <hr style={{ border: 0, borderTop: '1px solid #1e293b', margin: '2px 0' }} />

          <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
            ACTIVE DATASETS ({scenario.sourceIds.length}):
          </strong>

          {scenario.sourceIds.map((id) => {
            const meta = DATASET_REGISTRY[id];
            if (!meta) return null;
            const metaColors = BADGE_COLORS[meta.epistemicClass];
            return (
              <div
                key={id}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '3px',
                  padding: '6px 8px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                  <strong style={{ color: '#e2e8f0' }}>{meta.shortLabel}</strong>
                  <span
                    style={{
                      background: metaColors.bg,
                      color: metaColors.text,
                      border: `1px solid ${metaColors.border}`,
                      padding: '0 4px',
                      borderRadius: '2px',
                      fontSize: '9px',
                    }}
                  >
                    {meta.epistemicClass.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', marginTop: '3px' }}>Source: {meta.provider}</div>
                <div style={{ color: '#64748b' }}>License: {meta.license}</div>
                <div style={{ color: '#cbd5e1', marginTop: '2px' }}>{meta.notes}</div>
              </div>
            );
          })}

          <hr style={{ border: 0, borderTop: '1px solid #1e293b', margin: '2px 0' }} />

          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            <div>
              Cache Hits: {cacheStats.hits} | EONET: {runtimeTelemetry.eonetEventCount} | Preset:{' '}
              <strong>{graphicsProfile.toUpperCase()}</strong> ({preset.sphereSegments} segs)
            </div>
            <div style={{ marginTop: '2px' }}>
              Camera: Lat {camera.lat}°, Lon {camera.lon}°, Dist {camera.distance} R⊕
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};