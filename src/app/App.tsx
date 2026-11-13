import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS, PlanetaryState } from '../types/planetaryState';
import { EarthGlobe } from '../rendering/earth/EarthGlobe';
import { TopNav } from '../components/TopNav';
import { LayerPanel } from '../components/LayerPanel';
import { OrbitalPanel } from '../components/OrbitalPanel';
import { EventLabPanel } from '../components/EventLabPanel';
import { EventEpistemicBanner } from '../components/EventEpistemicBanner';
import { FutureEarthPanel } from '../components/FutureEarthPanel';
import { FutureEpistemicBanner } from '../components/FutureEpistemicBanner';
import { SolarSystemPanel } from '../components/SolarSystemPanel';
import { PlanetaryComparisonModal } from '../components/PlanetaryComparisonModal';
import { ShareAndSavePanel } from '../components/ShareAndSavePanel';
import { ComparisonModal } from '../components/ComparisonModal';
import { AttributionsModal } from '../components/AttributionsModal';
import { PerformanceModal } from '../components/PerformanceModal';
import { InfoPanel } from '../components/InfoPanel';
import { TimelineBar } from '../components/TimelineBar';
import { DeepTimeEpistemicBanner } from '../components/DeepTimeEpistemicBanner';
import { EonetEventMarker } from '../data/loaders/eonetLoader';
import {
  decodeStateFromUrlHash,
  loadSavedStatesFromIdb,
} from '../utils/stateSharing';

type DrawerTabId =
  | 'none'
  | 'layers'
  | 'orbit'
  | 'solar'
  | 'events'
  | 'future'
  | 'share'
  | 'telemetry';

const MISSION_DOCK_TABS: Array<{ id: Exclude<DrawerTabId, 'none'>; label: string; accent: string }> = [
  { id: 'layers', label: 'Layers', accent: '#38bdf8' },
  { id: 'orbit', label: 'Satellites', accent: '#34d399' },
  { id: 'solar', label: 'Solar & Moon', accent: '#fbbf24' },
  { id: 'events', label: 'Event Lab', accent: '#f87171' },
  { id: 'future', label: 'Future Earth', accent: '#fb923c' },
  { id: 'share', label: 'Save & Share', accent: '#a78bfa' },
  { id: 'telemetry', label: 'Telemetry', accent: '#94a3b8' },
];

export const App: React.FC = () => {
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const isPlaying = usePlanetaryStore((s) => s.isPlaying);
  const celestialFocusTarget = usePlanetaryStore((s) => s.celestialFocusTarget);
  const setIsPlaying = usePlanetaryStore((s) => s.setIsPlaying);
  const setCelestialFocusTarget = usePlanetaryStore((s) => s.setCelestialFocusTarget);
  const setGraphicsProfile = usePlanetaryStore((s) => s.setGraphicsProfile);
  const hydrateFromValidatedState = usePlanetaryStore(
    (s) => s.hydrateFromValidatedState
  );

  const preset = GRAPHICS_PRESETS[graphicsProfile];

  // Clean startup: 'none' means ZERO popup sidebars cluttering the screen on initial load!
  const [activeDrawer, setActiveDrawer] = useState<DrawerTabId>('none');
  const [isCinemaFullscreen, setIsCinemaFullscreen] = useState<boolean>(false);
  const [showTimelineInFullscreen, setShowTimelineInFullscreen] = useState<boolean>(false);

  const [hoveredEvent, setHoveredEvent] = useState<EonetEventMarker | null>(null);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [sideBySideModalOpen, setSideBySideModalOpen] = useState<boolean>(false);
  const [attributionsModalOpen, setAttributionsModalOpen] = useState<boolean>(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState<boolean>(false);
  const [savedStates, setSavedStates] = useState<PlanetaryState[]>([]);
  const [urlLoadNotice, setUrlLoadNotice] = useState<string | null>(null);
  const [isCapturingHq, setIsCapturingHq] = useState<boolean>(false);

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    loadSavedStatesFromIdb().then(setSavedStates);

    const hash = window.location.hash;
    if (hash && hash.startsWith('#state=')) {
      const decoded = decodeStateFromUrlHash(hash);
      if (decoded.success) {
        hydrateFromValidatedState(decoded.state);
        setUrlLoadNotice(
          `Restored validated state "${decoded.state.label || decoded.state.id}" from URL.`
        );
      } else {
        setUrlLoadNotice(`Rejected invalid URL state: ${decoded.error}`);
      }
    }
  }, [hydrateFromValidatedState]);

  const toggleFullscreenCinemaMode = useCallback(() => {
    setIsCinemaFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            // Ignore if browser blocks automatic fullscreen; Cinema UI hide still works
          });
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts: 'f' toggles Fullscreen Cinema Mode, 'Escape' closes active drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreenCinemaMode();
      } else if (e.key === 'Escape') {
        setActiveDrawer('none');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsCinemaFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [toggleFullscreenCinemaMode]);

  const handleCaptureScreenshot = useCallback(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chronoterra-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleCaptureHighQualityScreenshot = useCallback(() => {
    const previousProfile = usePlanetaryStore.getState().graphicsProfile;
    setIsCapturingHq(true);
    setGraphicsProfile('ultra');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = glCanvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `chronoterra-ultra-hq-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
        setGraphicsProfile(previousProfile);
        setIsCapturingHq(false);
      });
    });
  }, [setGraphicsProfile]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Epistemic HUD Notices (Always visible when active, neatly docked top-right via index.html CSS) */}
      <DeepTimeEpistemicBanner />
      <EventEpistemicBanner />
      <FutureEpistemicBanner />

      {/* Standard UI Mode vs Fullscreen Cinema Mode */}
      {!isCinemaFullscreen ? (
        <>
          <TopNav
            onCaptureScreenshot={handleCaptureScreenshot}
            onCaptureHighQualityScreenshot={handleCaptureHighQualityScreenshot}
            isCapturingHq={isCapturingHq}
            isFullscreen={isCinemaFullscreen}
            onToggleFullscreen={toggleFullscreenCinemaMode}
            onOpenComparisonModal={() => setComparisonModalOpen(true)}
            onOpenSideBySideModal={() => setSideBySideModalOpen(true)}
            onOpenAttributionsModal={() => setAttributionsModalOpen(true)}
          />

          {/* Sleek Vertical Left Mission Dock (Opens ONLY ONE panel at a time) */}
          <nav
            aria-label="Mission Control Drawer Tabs"
            style={{
              position: 'fixed',
              top: '62px',
              left: '16px',
              width: '122px',
              background: 'rgba(7, 12, 24, 0.86)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '8px',
              zIndex: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: '#64748b',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 4px',
                fontWeight: 700,
              }}
            >
              MODULES
            </div>
            {MISSION_DOCK_TABS.map((tab) => {
              const isOpen = activeDrawer === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDrawer(isOpen ? 'none' : tab.id)}
                  style={{
                    background: isOpen ? 'rgba(14, 165, 233, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                    color: isOpen ? '#ffffff' : '#cbd5e1',
                    border: isOpen
                      ? `1px solid ${tab.accent}`
                      : '1px solid rgba(51, 65, 85, 0.6)',
                    borderLeft: `3px solid ${tab.accent}`,
                    padding: '7px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: isOpen ? 700 : 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ fontSize: '9px', color: tab.accent }}>
                    {isOpen ? '◀' : '▶'}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Single Active Drawer Host — Never Renders More Than One Panel */}
          {activeDrawer !== 'none' && (
            <div className="ct-single-drawer-host">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '4px',
                }}
              >
                <button
                  onClick={() => setActiveDrawer('none')}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Close Panel [ESC] ✕
                </button>
              </div>

              {activeDrawer === 'layers' && <LayerPanel />}
              {activeDrawer === 'orbit' && <OrbitalPanel />}
              {activeDrawer === 'solar' && (
                <SolarSystemPanel onOpenComparisonModal={() => setComparisonModalOpen(true)} />
              )}
              {activeDrawer === 'events' && <EventLabPanel />}
              {activeDrawer === 'future' && <FutureEarthPanel />}
              {activeDrawer === 'share' && (
                <ShareAndSavePanel
                  savedStates={savedStates}
                  onSavedStatesChange={setSavedStates}
                  urlLoadNotice={urlLoadNotice}
                  onOpenComparison={() => setSideBySideModalOpen(true)}
                  onOpenAttributions={() => setAttributionsModalOpen(true)}
                  onOpenPerformance={() => setPerformanceModalOpen(true)}
                />
              )}
              {activeDrawer === 'telemetry' && <InfoPanel hoveredEvent={hoveredEvent} />}
            </div>
          )}

          <TimelineBar />
        </>
      ) : (
        /* FULLSCREEN CINEMA MODE HUD: Minimal translucent floating controller */
        <>
          <div
            style={{
              position: 'fixed',
              top: '16px',
              left: '16px',
              background: 'rgba(6, 10, 21, 0.72)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '6px',
              padding: '8px 12px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
            }}
          >
            <strong style={{ color: '#38bdf8', letterSpacing: '0.1em' }}>
              CHRONOTERRA // CINEMA VIEW
            </strong>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? '#dc2626' : '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>

            <button
              onClick={() => setCelestialFocusTarget('Earth')}
              style={{
                background: celestialFocusTarget === 'Earth' ? '#0284c7' : '#0f172a',
                color: '#ffffff',
                border: '1px solid #334155',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Earth
            </button>

            <button
              onClick={() => setCelestialFocusTarget('Moon')}
              style={{
                background: celestialFocusTarget === 'Moon' ? '#0284c7' : '#0f172a',
                color: '#ffffff',
                border: '1px solid #334155',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Moon
            </button>

            <button
              onClick={() => setCelestialFocusTarget('Sun')}
              style={{
                background: celestialFocusTarget === 'Sun' ? '#d97706' : '#0f172a',
                color: '#fde047',
                border: '1px solid #334155',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Solar System
            </button>

            <button
              onClick={() => setShowTimelineInFullscreen(!showTimelineInFullscreen)}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #475569',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {showTimelineInFullscreen ? 'Hide Timeline' : 'Show Timeline'}
            </button>

            <button
              onClick={handleCaptureHighQualityScreenshot}
              style={{
                background: '#0369a1',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              4K PNG
            </button>

            <button
              onClick={toggleFullscreenCinemaMode}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              Exit Fullscreen [F]
            </button>
          </div>

          {showTimelineInFullscreen && <TimelineBar />}
        </>
      )}

      {/* Modals (Only open when explicitly clicked) */}
      <PlanetaryComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
      />
      <ComparisonModal
        isOpen={sideBySideModalOpen}
        onClose={() => setSideBySideModalOpen(false)}
        savedStates={savedStates}
      />
      <AttributionsModal
        isOpen={attributionsModalOpen}
        onClose={() => setAttributionsModalOpen(false)}
      />
      <PerformanceModal
        isOpen={performanceModalOpen}
        onClose={() => setPerformanceModalOpen(false)}
      />

      {/* 100% Viewport 3D WebGL Canvas */}
<Canvas
        key={`canvas-aa-${preset.antialias}`}
        style={{ background: '#000000' }}
        dpr={isCapturingHq ? [2.5, 2.5] : preset.dpr}
        shadows={preset.shadows}
        gl={{
          antialias: preset.antialias,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
        }}
        camera={{ position: [0, 1.1, 3.1], fov: 45, near: 0.05, far: 2_000_000 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 1);
          glCanvasRef.current = gl.domElement;
        }}
      >
        <EarthGlobe onHoverEonetEvent={setHoveredEvent} />
      </Canvas>
    </div>
  );
};

export default App;