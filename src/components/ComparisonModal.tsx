import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatSimulatedTimestamp,
  PlanetaryState,
  ScenarioType,
} from '../types/planetaryState';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { getDeepTimeSliceByMa } from '../simulation/time/deepTimeSlices';
import { buildPaleoContinentalTextures } from '../data/loaders/paleomapLoader';
import { generatePaleoVegetationTexture } from '../simulation/vegetation/paleoVegetationGenerator';
import {
  evaluateFutureScenarioState,
  horizonYearToEpochMs,
  PRESENT_WGS84_CRATONS,
} from '../simulation/climate/futureProjections';
import { generateProceduralEarthTextures } from '../utils/proceduralEarthTexture';
import { DATASET_REGISTRY } from '../data/metadata/datasetRegistry';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedStates: PlanetaryState[];
}

const EPISTEMIC_STYLES: Record<
  ScenarioType,
  {
    bg: string;
    border: string;
    borderStyle: string;
    text: string;
    confidenceNote: string;
  }
> = {
  observed: {
    bg: '#064e3b',
    border: '#10b981',
    borderStyle: '2px solid #10b981',
    text: '#a7f3d0',
    confidenceNote:
      'EMPIRICAL OBSERVATION — Direct satellite radiometry & instrumental measurements.',
  },
  reconstructed: {
    bg: '#3b0764',
    border: '#a855f7',
    borderStyle: '3px dashed #a855f7',
    text: '#e9d5ff',
    confidenceNote:
      'SCIENTIFIC RECONSTRUCTION — Derived from paleomagnetic poles & seafloor isochrons (±1° to ±15° uncertainty).',
  },
  projected: {
    bg: '#7c2d12',
    border: '#f97316',
    borderStyle: '3px solid #f97316',
    text: '#fed7aa',
    confidenceNote:
      'PUBLISHED MODEL PROJECTION — IPCC AR6 / CMIP6 multi-model ensemble conditional on SSP pathway.',
  },
  hypothetical: {
    bg: '#7f1d1d',
    border: '#ef4444',
    borderStyle: '3px dotted #ef4444',
    text: '#fecaca',
    confidenceNote:
      'HYPOTHETICAL / PROCEDURAL SCENARIO — Simplified analytical model or user-defined parameters.',
  },
};

export function createCanonicalComparisonPresets(): Record<string, PlanetaryState> {
  const now = Date.now();
  return {
    'present-observed': {
      id: 'preset-present-observed',
      version: 1,
      label: 'Present Day (Satellite Era Baseline)',
      createdAt: now,
      timestamp: now - 3 * 86_400_000,
      timeScale: 'historical',
      geography: {
        continentalModel: 'present-wgs84',
        seaLevel: 0,
        terrainDataset: 'gibs-modis-terra-truecolor',
      },
      atmosphere: {
        temperatureDataset: 'gibs-modis-terra-lst-day',
        compositionDataset: 'standard-n2-o2-ar',
      },
      biosphere: { vegetationDataset: 'none', biomeDataset: 'present-wgs84' },
      orbitalState: { showSatellites: true, satelliteDataset: 'celestrak-gp-omm-json' },
      scenario: {
        type: 'observed',
        sourceIds: ['gibs-modis-terra-truecolor', 'nasa-eonet-v3-events'],
      },
      camera: { lat: 20, lon: 78, distance: 3.1, heading: 0, pitch: 0 },
      graphicsProfile: 'balanced',
      layers: { atmosphere: true, specularOcean: true, gibsTrueColor: true },
    },

    'deep-time-150ma-reconstructed': {
      id: 'preset-150ma-jurassic',
      version: 1,
      label: '150 Ma — Late Jurassic Breakup of Pangea',
      createdAt: now,
      timestamp: 150,
      timeScale: 'deep-time',
      geography: {
        continentalModel: 'Scotese-PALEOMAP-GPlates-150Ma',
        seaLevel: 120,
        terrainDataset: 'scotese-gplates-paleomap-v3',
      },
      atmosphere: { temperatureDataset: 'none', compositionDataset: 'mesozoic-high-co2' },
      biosphere: {
        vegetationDataset: 'none',
        biomeDataset: 'scotese-2021-paleoclimate-belts',
      },
      orbitalState: { showSatellites: false },
      scenario: {
        type: 'reconstructed',
        sourceIds: ['scotese-gplates-paleomap-v3'],
      },
      camera: { lat: 15, lon: 20, distance: 3.1, heading: 0, pitch: 0 },
      graphicsProfile: 'balanced',
      layers: { atmosphere: true, paleoCoastlines: true, paleoVegetation: false },
    },

    'deep-time-66ma-reconstructed': {
      id: 'preset-66ma-kpg',
      version: 1,
      label: '66 Ma — Late Cretaceous (K–Pg High Sea Level +170m)',
      createdAt: now,
      timestamp: 66,
      timeScale: 'deep-time',
      geography: {
        continentalModel: 'Scotese-PALEOMAP-GPlates-66Ma',
        seaLevel: 170,
        terrainDataset: 'scotese-gplates-paleomap-v3',
      },
      atmosphere: { temperatureDataset: 'none' },
      biosphere: {
        vegetationDataset: 'paleobiome-climate-belt-procedural-v1',
        biomeDataset: 'scotese-2021-paleoclimate-belts',
      },
      orbitalState: { showSatellites: false },
      scenario: {
        type: 'reconstructed',
        sourceIds: ['scotese-gplates-paleomap-v3'],
      },
      camera: { lat: 20, lon: -40, distance: 3.1, heading: 0, pitch: 0 },
      graphicsProfile: 'balanced',
      layers: { atmosphere: true, paleoCoastlines: true, paleoVegetation: false },
    },

    'future-2100-ssp585-projected': {
      id: 'preset-2100-ssp585',
      version: 1,
      label: '2100 CE — IPCC AR6 SSP5-8.5 (+4.4°C, +0.77m GMSL)',
      createdAt: now,
      timestamp: horizonYearToEpochMs(2100),
      timeScale: 'historical',
      geography: {
        continentalModel: 'present-wgs84',
        seaLevel: 0.77,
        terrainDataset: 'ipcc-ar6-cmip6-ssp-projections',
      },
      atmosphere: {
        temperatureDataset: 'ipcc-ar6-cmip6-ssp-projections',
      },
      biosphere: {
        biomeDataset: 'ipcc-ar6-cmip6-ssp-projections',
      },
      orbitalState: { showSatellites: false },
      scenario: {
        type: 'projected',
        sourceIds: ['ipcc-ar6-cmip6-ssp-projections'],
      },
      camera: { lat: 20, lon: 78, distance: 3.1, heading: 0, pitch: 0 },
      graphicsProfile: 'balanced',
      layers: {
        atmosphere: true,
        futureThermalAnomaly: true,
        futureBiomeShift: true,
        futureCoastalInundation: true,
      },
    },

    'future-2200-custom-hypothetical': {
      id: 'preset-2200-custom-hypothetical',
      version: 1,
      label: '2200 CE — Custom Extreme Ice-Sheet Collapse (+7.5°C, +25m GMSL)',
      createdAt: now,
      timestamp: horizonYearToEpochMs(2200),
      timeScale: 'historical',
      geography: {
        continentalModel: 'present-wgs84',
        seaLevel: 25.0,
        terrainDataset: 'custom-hypothetical-future-sliders-v1',
      },
      atmosphere: {
        temperatureDataset: 'custom-hypothetical-future-sliders-v1',
      },
      biosphere: {
        biomeDataset: 'custom-hypothetical-future-sliders-v1',
      },
      orbitalState: { showSatellites: false },
      scenario: {
        type: 'hypothetical',
        sourceIds: ['custom-hypothetical-future-sliders-v1'],
      },
      camera: { lat: 20, lon: 78, distance: 3.1, heading: 0, pitch: 0 },
      graphicsProfile: 'balanced',
      layers: {
        atmosphere: true,
        futureThermalAnomaly: true,
        futureBiomeShift: true,
        futureCoastalInundation: true,
      },
    },
  };
}

/**
 * Renders an interactive orthographic spherical projection of a PlanetaryState snapshot
 * onto a 2D canvas so two snapshots can be inspected side-by-side with zero WebGL context limits.
 */
const SnapshotGlobeCanvas: React.FC<{
  state: PlanetaryState;
  centerLonDeg: number;
}> = ({ state, centerLonDeg }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sourceCanvas: HTMLCanvasElement;
    let overlayCanvas: HTMLCanvasElement | null = null;

    if (state.timeScale === 'deep-time') {
      const slice = getDeepTimeSliceByMa(state.timestamp);
      const { surfaceTexture } = buildPaleoContinentalTextures(slice, slice.cratons);
      sourceCanvas = surfaceTexture.image as HTMLCanvasElement;
      if (state.layers.paleoVegetation) {
        const vegTex = generatePaleoVegetationTexture(slice, slice.cratons);
        overlayCanvas = vegTex.image as HTMLCanvasElement;
      }
    } else if (
      state.scenario.type === 'projected' ||
      state.geography.terrainDataset === 'custom-hypothetical-future-sliders-v1'
    ) {
      const seaLevel = state.geography.seaLevel ?? 0.77;
      const warming = seaLevel > 5 ? 7.5 : seaLevel > 0.6 ? 4.4 : 2.7;
      const evalFuture = evaluateFutureScenarioState(
        state.scenario.type === 'projected' ? 'ssp5-85' : 'custom-hypothetical',
        2100,
        warming,
        seaLevel
      );
      const { surfaceTexture } = buildPaleoContinentalTextures(
        evalFuture.syntheticSliceForBiomeReuse,
        PRESENT_WGS84_CRATONS
      );
      sourceCanvas = surfaceTexture.image as HTMLCanvasElement;
      const biomeTex = generatePaleoVegetationTexture(
        evalFuture.syntheticSliceForBiomeReuse,
        PRESENT_WGS84_CRATONS
      );
      overlayCanvas = biomeTex.image as HTMLCanvasElement;
    } else {
      const proc = generateProceduralEarthTextures(true);
      sourceCanvas = proc.dayMap.image as HTMLCanvasElement;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw circular globe mask with centered longitude offset
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 10;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Pan equirectangular texture horizontally according to centerLonDeg
    const shiftFrac = (((centerLonDeg + 180) % 360) + 360) % 360 / 360;
    const drawW = radius * 2.4;
    const drawH = radius * 2.0;
    const offsetX = cx - drawW * shiftFrac;

    ctx.drawImage(sourceCanvas, offsetX, cy - drawH / 2, drawW, drawH);
    ctx.drawImage(sourceCanvas, offsetX + drawW, cy - drawH / 2, drawW, drawH);
    ctx.drawImage(sourceCanvas, offsetX - drawW, cy - drawH / 2, drawW, drawH);

    if (overlayCanvas) {
      ctx.globalAlpha = 0.72;
      ctx.drawImage(overlayCanvas, offsetX, cy - drawH / 2, drawW, drawH);
      ctx.drawImage(overlayCanvas, offsetX + drawW, cy - drawH / 2, drawW, drawH);
      ctx.drawImage(overlayCanvas, offsetX - drawW, cy - drawH / 2, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // Spherical limb shading
    const grad = ctx.createRadialGradient(
      cx - radius * 0.25,
      cy - radius * 0.25,
      radius * 0.1,
      cx,
      cy,
      radius
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Rim outline colored by epistemic category
    const epStyle = EPISTEMIC_STYLES[state.scenario.type];
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = epStyle.border;
    ctx.lineWidth = 2.5;
    if (state.scenario.type === 'reconstructed') {
      ctx.setLineDash([6, 4]);
    } else if (state.scenario.type === 'hypothetical') {
      ctx.setLineDash([2, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [state, centerLonDeg]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={220}
      style={{
        display: 'block',
        margin: '0 auto',
        background: '#030712',
        borderRadius: '4px',
      }}
    />
  );
};

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  savedStates,
}) => {
  const getSerializableState = usePlanetaryStore((s) => s.getSerializableState);
  const hydrateFromValidatedState = usePlanetaryStore(
    (s) => s.hydrateFromValidatedState
  );

  const presets = useMemo(() => createCanonicalComparisonPresets(), []);

  const [leftState, setLeftState] = useState<PlanetaryState>(
    () => presets['present-observed']
  );
  const [rightState, setRightState] = useState<PlanetaryState>(
    () => presets['future-2100-ssp585-projected']
  );
  const [sharedLonDeg, setSharedLonDeg] = useState<number>(20);

  if (!isOpen) return null;

  const allSelectableStates: PlanetaryState[] = [
    ...Object.values(presets),
    ...savedStates,
  ];

  const handleSelectState = (side: 'left' | 'right', id: string) => {
    if (id === 'live-viewport') {
      const live = getSerializableState();
      if (side === 'left') setLeftState(live);
      else setRightState(live);
      return;
    }
    const found = allSelectableStates.find((s) => s.id === id);
    if (!found) return;
    if (side === 'left') setLeftState(found);
    else setRightState(found);
  };

  const handleRapidSwap = () => {
    const prevLeft = leftState;
    setLeftState(rightState);
    setRightState(prevLeft);
  };

  const renderSnapshotColumn = (side: 'left' | 'right', snap: PlanetaryState) => {
    const ep = EPISTEMIC_STYLES[snap.scenario.type];
    const seaLevel = snap.geography.seaLevel ?? 0;

    return (
      <div
        data-testid={`comparison-pane-${side}`}
        style={{
          flex: 1,
          minWidth: '340px',
          background: '#0f172a',
          border: ep.borderStyle,
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Selector Dropdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <strong style={{ color: '#94a3b8', fontSize: '11px' }}>
            {side === 'left' ? 'SNAPSHOT A (LEFT):' : 'SNAPSHOT B (RIGHT):'}
          </strong>
          <select
            aria-label={side === 'left' ? 'Select Snapshot A' : 'Select Snapshot B'}
            value={snap.id}
            onChange={(e) => handleSelectState(side, e.target.value)}
            style={{
              flex: 1,
              background: '#05070d',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '4px 6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            <option value="live-viewport">Capture Current Live Viewport</option>
            <optgroup label="Canonical Epistemic Presets">
              {Object.values(presets).map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.scenario.type.toUpperCase()}] {p.label}
                </option>
              ))}
            </optgroup>
            {savedStates.length > 0 && (
              <optgroup label="User Saved States">
                {savedStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.scenario.type.toUpperCase()}] {s.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Simultaneous Epistemic Badge — Never Implies Equal Confidence */}
        <div
          data-testid={`comparison-badge-${side}`}
          style={{
            background: ep.bg,
            border: `1px solid ${ep.border}`,
            color: ep.text,
            padding: '6px 8px',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
            EPISTEMIC CLASS: {snap.scenario.type.toUpperCase()}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>{ep.confidenceNote}</div>
        </div>

        {/* Synchronized Globe Preview */}
        <SnapshotGlobeCanvas state={snap} centerLonDeg={sharedLonDeg} />

        {/* Snapshot Telemetry Table */}
        <div
          style={{
            background: '#05070d',
            border: '1px solid #1e293b',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div>
            <span style={{ color: '#94a3b8' }}>Label: </span>
            <strong>{snap.label || snap.id}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Simulated Date: </span>
            <strong>{formatSimulatedTimestamp(snap.timestamp, snap.timeScale)}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Continental Model: </span>
            <code>{snap.geography.continentalModel}</code>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Eustatic Sea Level vs Present: </span>
            <strong style={{ color: seaLevel > 0 ? '#38bdf8' : '#cbd5e1' }}>
              {seaLevel >= 0 ? `+${seaLevel} m` : `${seaLevel} m`}
            </strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Cited Sources: </span>
            <span>
              {snap.scenario.sourceIds
                .map((id) => DATASET_REGISTRY[id]?.shortLabel || id)
                .join(', ')}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            hydrateFromValidatedState(snap);
            onClose();
          }}
          style={{
            background: '#1e293b',
            color: '#38bdf8',
            border: '1px solid #334155',
            padding: '5px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          Load Snapshot into Main 3D Globe
        </button>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-label="Side-by-Side Planetary State Comparison"
      data-testid="side-by-side-comparison-modal"
      style={{
        position: 'fixed',
        top: '56px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(960px, 95vw)',
        maxHeight: '86vh',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.98)',
        border: '1px solid #38bdf8',
        borderRadius: '6px',
        padding: '16px',
        zIndex: 35,
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e2e8f0',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
            SIDE-BY-SIDE PLANETARY STATE COMPARISON
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
            Simultaneous comparison across Deep-Time (`RECONSTRUCTED`), Present (`OBSERVED`), and
            Future (`PROJECTED` / `HYPOTHETICAL`) states. Borders & badges reflect distinct epistemic confidence.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRapidSwap}
            data-testid="comparison-swap-button"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            Rapid A/B Swap ⇄
          </button>

          <button
            onClick={onClose}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            Close [X]
          </button>
        </div>
      </div>

      {/* Synchronized Longitude Rotation Scrubber */}
      <div
        style={{
          marginTop: '10px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          padding: '6px 10px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <label htmlFor="sync-lon-slider" style={{ color: '#94a3b8', fontSize: '11px' }}>
          Synchronized Longitude View ({sharedLonDeg}°):
        </label>
        <input
          id="sync-lon-slider"
          type="range"
          min={-180}
          max={180}
          step={5}
          value={sharedLonDeg}
          onChange={(e) => setSharedLonDeg(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
        />
      </div>

      {/* Side-by-Side Columns */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          marginTop: '12px',
          flexWrap: 'wrap',
        }}
      >
        {renderSnapshotColumn('left', leftState)}
        {renderSnapshotColumn('right', rightState)}
      </div>
    </div>
  );
};