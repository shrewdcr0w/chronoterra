import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';

export const LayerPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const layers = usePlanetaryStore((s) => s.layers);
  const toggleLayer = usePlanetaryStore((s) => s.toggleLayer);

  const deepTimeControls = [
    {
      key: 'paleoCoastlines',
      label: '3D Reconstructed Craton Outlines',
      badge: 'RECONSTRUCTED',
      badgeColor: '#c084fc',
    },
    {
      key: 'paleoVegetation',
      label: 'Ancient Flora & Paleobiome Belts',
      badge: 'HYPOTHETICAL',
      badgeColor: '#f87171',
    },
    {
      key: 'atmosphere',
      label: 'Fresnel Atmosphere Shell',
      badge: 'PROCEDURAL',
      badgeColor: '#38bdf8',
    },
    {
      key: 'specularOcean',
      label: 'Paleo-Ocean Specular Mask',
      badge: 'PROCEDURAL',
      badgeColor: '#38bdf8',
    },
  ];

  const historicalControls = [
    {
      key: 'gibsTrueColor',
      label: 'NASA GIBS MODIS True Color',
      badge: 'OBSERVED',
      badgeColor: '#10b981',
    },
    {
      key: 'gibsLandSurfaceTemp',
      label: 'NASA GIBS Land Surface Temp (Day)',
      badge: 'OBSERVED',
      badgeColor: '#10b981',
    },
    {
      key: 'eonetEvents',
      label: 'NASA EONET v3 Natural Events',
      badge: 'OBSERVED',
      badgeColor: '#10b981',
    },
    {
      key: 'climatePlaceholder',
      label: 'Zonal Thermal Anomaly (Placeholder)',
      badge: 'HYPOTHETICAL',
      badgeColor: '#ef4444',
    },
    {
      key: 'atmosphere',
      label: 'Fresnel Atmosphere Shell',
      badge: 'PROCEDURAL',
      badgeColor: '#38bdf8',
    },
    {
      key: 'specularOcean',
      label: 'Ocean Specular Mask',
      badge: 'PROCEDURAL',
      badgeColor: '#38bdf8',
    },
  ];

  const activeControls = timeScale === 'deep-time' ? deepTimeControls : historicalControls;

  return (
    <aside
      style={{
        position: 'fixed',
        top: '64px',
        left: '16px',
        width: '310px',
        background: 'rgba(10, 15, 29, 0.90)',
        border: timeScale === 'deep-time' ? '1px solid #a855f7' : '1px solid #1e293b',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 15,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#e2e8f0' }}>
          {timeScale === 'deep-time' ? 'PALEOGEOGRAPHIC LAYERS' : 'SATELLITE ERA LAYERS'}
        </strong>
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
          {activeControls.map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(layers[item.key])}
                  onChange={() => toggleLayer(item.key)}
                />
                <span>{item.label}</span>
              </span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  border: `1px solid ${item.badgeColor}`,
                  color: item.badgeColor,
                }}
              >
                {item.badge}
              </span>
            </label>
          ))}
        </div>
      )}
    </aside>
  );
};