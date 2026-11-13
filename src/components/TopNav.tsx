import React from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { GraphicsProfile } from '../types/planetaryState';

interface TopNavProps {
  onCaptureScreenshot: () => void;
  onCaptureHighQualityScreenshot: () => void;
  isCapturingHq: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenComparisonModal: () => void;
  onOpenSideBySideModal: () => void;
  onOpenAttributionsModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onCaptureScreenshot,
  onCaptureHighQualityScreenshot,
  isCapturingHq,
  isFullscreen,
  onToggleFullscreen,
  onOpenComparisonModal,
  onOpenSideBySideModal,
  onOpenAttributionsModal,
}) => {
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const timelineScrubMode = usePlanetaryStore((s) => s.timelineScrubMode);
  const showSatellites = usePlanetaryStore((s) => s.orbitalState.showSatellites);
  const celestialFocusTarget = usePlanetaryStore((s) => s.celestialFocusTarget);
  const setTimeScaleMode = usePlanetaryStore((s) => s.setTimeScaleMode);
  const setTimelineScrubMode = usePlanetaryStore((s) => s.setTimelineScrubMode);
  const setShowSatellites = usePlanetaryStore((s) => s.setShowSatellites);
  const setCelestialFocusTarget = usePlanetaryStore((s) => s.setCelestialFocusTarget);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const setGraphicsProfile = usePlanetaryStore((s) => s.setGraphicsProfile);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: 'rgba(6, 10, 21, 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 25,
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <strong
          style={{
            color: '#38bdf8',
            fontSize: '15px',
            letterSpacing: '0.12em',
            textShadow: '0 0 12px rgba(56, 189, 248, 0.45)',
          }}
        >
          CHRONOTERRA
        </strong>

        <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setTimeScaleMode('historical');
              setCelestialFocusTarget('Earth');
            }}
            style={{
              background:
                timeScale === 'historical' &&
                timelineScrubMode === 'planetary-date' &&
                celestialFocusTarget === 'Earth'
                  ? '#0284c7'
                  : 'rgba(15, 23, 42, 0.8)',
              color: '#ffffff',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Modern Earth
          </button>

          <button
            onClick={() => setTimeScaleMode('deep-time')}
            style={{
              background: timeScale === 'deep-time' ? '#6b21a8' : 'rgba(15, 23, 42, 0.8)',
              color: timeScale === 'deep-time' ? '#ffffff' : '#e9d5ff',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Deep-Time (Ma)
          </button>

          <button
            onClick={() => setTimelineScrubMode('future-projection')}
            style={{
              background:
                timelineScrubMode === 'future-projection'
                  ? '#ea580c'
                  : 'rgba(15, 23, 42, 0.8)',
              color: timelineScrubMode === 'future-projection' ? '#ffffff' : '#fdba74',
              border: '1px solid rgba(249, 115, 22, 0.45)',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Future Earth
          </button>

          <button
            onClick={() => {
              if (timeScale !== 'historical') setTimeScaleMode('historical');
              setCelestialFocusTarget('Sun');
            }}
            style={{
              background:
                celestialFocusTarget === 'Sun' ? '#d97706' : 'rgba(15, 23, 42, 0.8)',
              color: '#fde047',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Solar System
          </button>

          <button
            onClick={() => {
              if (timeScale !== 'historical') setTimeScaleMode('historical');
              setShowSatellites(!showSatellites);
            }}
            style={{
              background:
                showSatellites && timeScale === 'historical'
                  ? 'rgba(5, 150, 105, 0.85)'
                  : 'rgba(15, 23, 42, 0.8)',
              color: showSatellites && timeScale === 'historical' ? '#ffffff' : '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Satellites: {showSatellites ? 'ON' : 'OFF'}
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenComparisonModal}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#38bdf8',
            border: '1px solid #1e293b',
            padding: '5px 9px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Planets Table
        </button>

        <button
          onClick={onOpenSideBySideModal}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#34d399',
            border: '1px solid #1e293b',
            padding: '5px 9px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Compare A/B
        </button>

        <button
          onClick={onOpenAttributionsModal}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#cbd5e1',
            border: '1px solid #1e293b',
            padding: '5px 9px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Sources
        </button>

        <select
          id="graphics-profile-select"
          aria-label="Graphics Quality Preset"
          value={graphicsProfile}
          onChange={(e) => setGraphicsProfile(e.target.value as GraphicsProfile)}
          style={{
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #334155',
            padding: '5px 8px',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          <option value="low">Preset: Low</option>
          <option value="balanced">Preset: Balanced</option>
          <option value="high">Preset: High</option>
          <option value="ultra">Preset: Ultra</option>
        </select>

        <button
          onClick={onCaptureScreenshot}
          title="Capture standard PNG screenshot"
          style={{
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #475569',
            padding: '5px 9px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          PNG
        </button>

        <button
          onClick={onCaptureHighQualityScreenshot}
          disabled={isCapturingHq}
          title="Capture Ultra-Res 4K PNG"
          style={{
            background: isCapturingHq ? '#ca8a04' : '#0369a1',
            color: '#ffffff',
            border: '1px solid #38bdf8',
            padding: '5px 9px',
            borderRadius: '4px',
            cursor: isCapturingHq ? 'wait' : 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {isCapturingHq ? 'HQ...' : '4K PNG'}
        </button>

        <button
          onClick={onToggleFullscreen}
          data-testid="toggle-fullscreen-button"
          title="Enter Fullscreen Cinema Mode (Shortcut: F)"
          style={{
            background: isFullscreen ? '#dc2626' : '#0ea5e9',
            color: '#ffffff',
            border: '1px solid #7dd3fc',
            padding: '5px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)',
          }}
        >
          {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN [F]'}
        </button>
      </div>
    </header>
  );
};