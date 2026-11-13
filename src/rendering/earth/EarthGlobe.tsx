import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePlanetaryStore } from '../../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS } from '../../types/planetaryState';
import { createAtmosphereMaterial } from '../shaders/atmosphereShader';
import { generateProceduralEarthTextures } from '../../utils/proceduralEarthTexture';
import { loadGibsTexture } from '../../data/loaders/gibsLoader';
import { EonetEventMarker, fetchEonetEventsForDate } from '../../data/loaders/eonetLoader';
import { generateProceduralClimateTexture } from '../../simulation/climate/proceduralClimatePlaceholder';
import { toISODateString } from '../../data/metadata/datasetRegistry';
import { EonetMarkers } from './EonetMarkers';
import { CratonPolygon, getDeepTimeSliceByMa } from '../../simulation/time/deepTimeSlices';
import {
  buildPaleoContinentalTextures,
  loadPaleoPolygonsForSlice,
} from '../../data/loaders/paleomapLoader';
import {
  ActiveEventDamageParams,
  generateDeepTimeVegetationWithEvent,
  generateHistoricalBiosphereWithEvent,
} from '../../simulation/vegetation/eventVegetationLayer';
import { generatePaleoVegetationTexture } from '../../simulation/vegetation/paleoVegetationGenerator';
import { PaleoCoastlineLines } from './PaleoCoastlineLines';
import { SatelliteSwarm } from '../satellites/SatelliteSwarm';
import { SolarSystemScene } from '../solar-system/SolarSystemScene';
import { Starfield } from '../solar-system/Starfield';
import { CatastropheVisualizer } from './CatastropheVisualizer';
import { convertEonetMarkerToCatalogEvent } from '../../simulation/catastrophes/curatedEvents';
import {
  evaluateFutureScenarioState,
  generateFutureThermalAnomalyTexture,
  PRESENT_WGS84_CRATONS,
} from '../../simulation/climate/futureProjections';

const EARTH_RADIUS = 1.0;
const IDLE_RESUME_DELAY_MS = 3000;

export const EarthGlobe: React.FC<{
  onHoverEonetEvent: (ev: EonetEventMarker | null) => void;
}> = ({ onHoverEonetEvent }) => {
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const timelineScrubMode = usePlanetaryStore((s) => s.timelineScrubMode);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const layers = usePlanetaryStore((s) => s.layers);
  const isPlaying = usePlanetaryStore((s) => s.isPlaying);
  const solarSystemScaleMode = usePlanetaryStore((s) => s.solarSystemScaleMode);
  const celestialFocusTarget = usePlanetaryStore((s) => s.celestialFocusTarget);
  const latestEphemerisSnapshot = usePlanetaryStore((s) => s.latestEphemerisSnapshot);
  const event = usePlanetaryStore((s) => s.event);
  const activeEventMeta = usePlanetaryStore((s) => s.activeEventMeta);
  const isPlacingHypotheticalEvent = usePlanetaryStore((s) => s.isPlacingHypotheticalEvent);
  const futurePathwayId = usePlanetaryStore((s) => s.futurePathwayId);
  const futureHorizonYear = usePlanetaryStore((s) => s.futureHorizonYear);
  const customWarmingDeltaC = usePlanetaryStore((s) => s.customWarmingDeltaC);
  const customSeaLevelMeters = usePlanetaryStore((s) => s.customSeaLevelMeters);

  const setCamera = usePlanetaryStore((s) => s.setCamera);
  const launchHypotheticalEvent = usePlanetaryStore((s) => s.launchHypotheticalEvent);
  const launchCatalogEvent = usePlanetaryStore((s) => s.launchCatalogEvent);
  const updateRuntimeTelemetry = usePlanetaryStore((s) => s.updateRuntimeTelemetry);

  const preset = GRAPHICS_PRESETS[graphicsProfile];
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudShellRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isInteractingRef = useRef<boolean>(false);
  const lastInteractionTimeRef = useRef<number>(0);

  const { camera } = useThree();

  const [gibsBaseTexture, setGibsBaseTexture] = useState<THREE.Texture | null>(null);
  const [gibsRoughnessMap, setGibsRoughnessMap] = useState<THREE.Texture | null>(null);
  const [gibsBumpMap, setGibsBumpMap] = useState<THREE.Texture | null>(null);
  const [gibsLstTexture, setGibsLstTexture] = useState<THREE.Texture | null>(null);
  const [eonetEvents, setEonetEvents] = useState<EonetEventMarker[]>([]);

  const activeDeepSlice = useMemo(
    () => (timeScale === 'deep-time' ? getDeepTimeSliceByMa(timestamp) : null),
    [timeScale, timestamp]
  );
  const [paleoPolygons, setPaleoPolygons] = useState<CratonPolygon[]>(
    activeDeepSlice ? activeDeepSlice.cratons : []
  );

  const evaluatedFuture = useMemo(() => {
    if (timelineScrubMode !== 'future-projection') return null;
    return evaluateFutureScenarioState(
      futurePathwayId,
      futureHorizonYear,
      customWarmingDeltaC,
      customSeaLevelMeters
    );
  }, [
    timelineScrubMode,
    futurePathwayId,
    futureHorizonYear,
    customWarmingDeltaC,
    customSeaLevelMeters,
  ]);

  const dateISO = useMemo(
    () =>
      timeScale === 'historical' && timelineScrubMode !== 'future-projection'
        ? toISODateString(timestamp)
        : '2026-11-01',
    [timestamp, timeScale, timelineScrubMode]
  );

  const proceduralTextures = useMemo(
    () => generateProceduralEarthTextures(Boolean(layers.graticule)),
    [layers.graticule]
  );

  const proceduralClimateTexture = useMemo(
    () =>
      timeScale === 'historical' &&
      timelineScrubMode === 'planetary-date' &&
      layers.climatePlaceholder
        ? generateProceduralClimateTexture(dateISO)
        : null,
    [timeScale, timelineScrubMode, layers.climatePlaceholder, dateISO]
  );

  const atmosphereMaterial = useMemo(() => createAtmosphereMaterial(), []);

  const sunDir = latestEphemerisSnapshot?.sunDirectionFromEarth ?? [0.7, 0.28, 0.7];
  useEffect(() => {
    atmosphereMaterial.uniforms.uSunDirection.value
      .set(sunDir[0], sunDir[1], sunDir[2])
      .normalize();
  }, [atmosphereMaterial, sunDir]);

  useEffect(() => {
    let cancelled = false;
    if (timeScale !== 'deep-time' || !activeDeepSlice) return;

    setPaleoPolygons(activeDeepSlice.cratons);
    updateRuntimeTelemetry({
      activeCratonCount: activeDeepSlice.cratons.length,
      isLoadingImagery: false,
    });

    loadPaleoPolygonsForSlice(activeDeepSlice).then(({ polygons }) => {
      if (cancelled) return;
      setPaleoPolygons(polygons);
      updateRuntimeTelemetry({ activeCratonCount: polygons.length });
    });

    return () => {
      cancelled = true;
    };
  }, [timeScale, activeDeepSlice, updateRuntimeTelemetry]);

  const eventDamageParams: ActiveEventDamageParams | null = useMemo(() => {
    if (!event || !activeEventMeta) return null;
    return {
      kind: activeEventMeta.kind,
      lat: activeEventMeta.lat,
      lon: activeEventMeta.lon,
      intensity: event.intensity,
      progress: event.progress,
      recoveryHorizonYears: activeEventMeta.recoveryHorizonYears,
    };
  }, [event, activeEventMeta]);

  const paleoTextures = useMemo(() => {
    if (timeScale !== 'deep-time' || !activeDeepSlice) return null;
    return buildPaleoContinentalTextures(activeDeepSlice, paleoPolygons);
  }, [timeScale, activeDeepSlice, paleoPolygons]);

  const paleoVegetationTexture = useMemo(() => {
    if (timeScale !== 'deep-time' || !activeDeepSlice || !layers.paleoVegetation) return null;
    return generateDeepTimeVegetationWithEvent(
      activeDeepSlice,
      paleoPolygons,
      eventDamageParams
    );
  }, [timeScale, activeDeepSlice, paleoPolygons, layers.paleoVegetation, eventDamageParams]);

  const futureContinentalTextures = useMemo(() => {
    if (!evaluatedFuture) return null;
    return buildPaleoContinentalTextures(
      evaluatedFuture.syntheticSliceForBiomeReuse,
      PRESENT_WGS84_CRATONS
    );
  }, [evaluatedFuture]);

  const futureBiomeTexture = useMemo(() => {
    if (!evaluatedFuture || layers.futureBiomeShift === false) return null;
    return generatePaleoVegetationTexture(
      evaluatedFuture.syntheticSliceForBiomeReuse,
      PRESENT_WGS84_CRATONS
    );
  }, [evaluatedFuture, layers.futureBiomeShift]);

  const futureThermalTexture = useMemo(() => {
    if (!evaluatedFuture || layers.futureThermalAnomaly === false) return null;
    return generateFutureThermalAnomalyTexture(evaluatedFuture);
  }, [evaluatedFuture, layers.futureThermalAnomaly]);

  const historicalEventVegetationTexture = useMemo(() => {
    if (timeScale !== 'historical' || !eventDamageParams) return null;
    return generateHistoricalBiosphereWithEvent(eventDamageParams);
  }, [timeScale, eventDamageParams]);

  useEffect(() => {
    let cancelled = false;
    if (timeScale !== 'historical' || timelineScrubMode === 'future-projection') return;

    if (!layers.gibsTrueColor) {
      setGibsBaseTexture(null);
      setGibsRoughnessMap(null);
      setGibsBumpMap(null);
      updateRuntimeTelemetry({ usingProceduralBaseFallback: true });
      return;
    }

    updateRuntimeTelemetry({ isLoadingImagery: true });
    loadGibsTexture('MODIS_Terra_CorrectedReflectance_TrueColor', dateISO, graphicsProfile, false)
      .then(({ texture, roughnessMap, bumpMap, cacheSource }) => {
        if (cancelled) return;
        setGibsBaseTexture(texture);
        setGibsRoughnessMap(roughnessMap ?? null);
        setGibsBumpMap(bumpMap ?? null);
        updateRuntimeTelemetry({
          usingProceduralBaseFallback: false,
          lastCacheSource: cacheSource,
          isLoadingImagery: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setGibsBaseTexture(null);
        setGibsRoughnessMap(null);
        setGibsBumpMap(null);
        updateRuntimeTelemetry({
          usingProceduralBaseFallback: true,
          isLoadingImagery: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    timeScale,
    timelineScrubMode,
    dateISO,
    graphicsProfile,
    layers.gibsTrueColor,
    updateRuntimeTelemetry,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (
      timeScale !== 'historical' ||
      timelineScrubMode === 'future-projection' ||
      !layers.gibsLandSurfaceTemp
    ) {
      setGibsLstTexture(null);
      return;
    }

    loadGibsTexture('MODIS_Terra_Land_Surface_Temp_Day', dateISO, graphicsProfile, true)
      .then(({ texture, cacheSource }) => {
        if (cancelled) return;
        setGibsLstTexture(texture);
        updateRuntimeTelemetry({ lastCacheSource: cacheSource });
      })
      .catch(() => {
        if (cancelled) return;
        setGibsLstTexture(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    timeScale,
    timelineScrubMode,
    dateISO,
    graphicsProfile,
    layers.gibsLandSurfaceTemp,
    updateRuntimeTelemetry,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (
      timeScale !== 'historical' ||
      timelineScrubMode === 'future-projection' ||
      !layers.eonetEvents
    ) {
      setEonetEvents([]);
      updateRuntimeTelemetry({ eonetEventCount: 0 });
      return;
    }

    fetchEonetEventsForDate(dateISO)
      .then(({ events, cacheSource }) => {
        if (cancelled) return;
        setEonetEvents(events);
        updateRuntimeTelemetry({
          eonetEventCount: events.length,
          lastCacheSource: cacheSource,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setEonetEvents([]);
        updateRuntimeTelemetry({ eonetEventCount: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [timeScale, timelineScrubMode, dateISO, layers.eonetEvents, updateRuntimeTelemetry]);

  const handleEarthSphereClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isPlacingHypotheticalEvent) return;
    e.stopPropagation();

    const localPt = earthGroupRef.current
      ? earthGroupRef.current.worldToLocal(e.point.clone())
      : e.point;
    const r = localPt.length() || 1;
    const latDeg = THREE.MathUtils.radToDeg(Math.asin(localPt.y / r));
    const theta = Math.atan2(localPt.z, -localPt.x);
    let lonDeg = THREE.MathUtils.radToDeg(theta) - 180;
    if (lonDeg < -180) lonDeg += 360;
    if (lonDeg > 180) lonDeg -= 360;

    launchHypotheticalEvent({
      kind: 'impact',
      lat: latDeg,
      lon: lonDeg,
      intensity: 6.5,
      recoveryHorizonYears: 50,
    });
  };

  const syncCameraToStore = () => {
    const pos = camera.position;
    const distance = Number(pos.length().toFixed(3));
    const lat = Number((THREE.MathUtils.radToDeg(Math.asin(pos.y / distance)) || 0).toFixed(2));
    const lon = Number((THREE.MathUtils.radToDeg(Math.atan2(pos.x, pos.z)) || 0).toFixed(2));
    setCamera({ lat, lon, distance });
  };

  useFrame((_, delta) => {
    const now = performance.now();
    const idleElapsed = now - lastInteractionTimeRef.current;

    // Subtle differential drift for the 3D atmospheric cloud deck
    if (cloudShellRef.current) {
      cloudShellRef.current.rotation.y += delta * 0.008;
    }

    if (
      !isPlaying &&
      !event &&
      !isInteractingRef.current &&
      celestialFocusTarget === 'Earth' &&
      idleElapsed > IDLE_RESUME_DELAY_MS &&
      earthGroupRef.current
    ) {
      earthGroupRef.current.rotation.y += delta * 0.038;
    }
  });

  const activeBaseMap =
    timelineScrubMode === 'future-projection' &&
    layers.futureCoastalInundation !== false &&
    futureContinentalTextures
      ? futureContinentalTextures.surfaceTexture
      : timeScale === 'deep-time' && paleoTextures
      ? paleoTextures.surfaceTexture
      : gibsBaseTexture ?? proceduralTextures.dayMap;

  // Use pixel-derived GIBS roughness/bump maps when available so clouds & continents never look like glossy plastic
  const activeRoughnessMap =
    timelineScrubMode === 'future-projection' && futureContinentalTextures
      ? futureContinentalTextures.roughnessTexture
      : timeScale === 'deep-time' && paleoTextures
      ? paleoTextures.roughnessTexture
      : gibsRoughnessMap ?? proceduralTextures.roughnessMap;

  const activeBumpMap =
    timeScale === 'historical' && timelineScrubMode === 'planetary-date'
      ? gibsBumpMap ?? proceduralTextures.bumpMap
      : proceduralTextures.bumpMap;

  const maxOrbitDist = solarSystemScaleMode === 'true-scale' ? 950_000 : 1_200;

  return (
    <>
      {/* 1. Deep-Space Astronomical Starfield */}
      <Starfield />

      {/* 2. Realistic Orbital Lighting: Crisp Solar Key Light + Subtle Blue Earthshine Fill */}
      <ambientLight intensity={0.04} />
      <hemisphereLight args={['#38bdf8', '#020617', 0.14]} />
      {layers.naturalCelestialBodies !== false && (
        <directionalLight
          name="natural-sun-light"
          position={[sunDir[0] * 30, sunDir[1] * 30, sunDir[2] * 30]}
          intensity={2.95}
          color="#fffaf0"
          castShadow={preset.shadows}
          shadow-mapSize-width={preset.shadowMapSize}
          shadow-mapSize-height={preset.shadowMapSize}
        />
      )}

      <group ref={earthGroupRef}>
        {/* Primary Planetary Sphere with PBR Pixel-Matched Roughness & Topographic Bump Relief */}
        <mesh
          receiveShadow={preset.shadows}
          castShadow={preset.shadows}
          onClick={handleEarthSphereClick}
        >
          <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
          <meshStandardMaterial
            map={activeBaseMap}
            roughnessMap={layers.specularOcean ? activeRoughnessMap : null}
            roughness={layers.specularOcean ? 0.92 : 0.88}
            metalness={0.04}
            bumpMap={activeBumpMap}
            bumpScale={0.014}
          />
        </mesh>

        {/* Subtle 3D Atmospheric Cloud Deck Shell (adds parallax depth above the surface) */}
        {layers.atmosphere && (
          <mesh ref={cloudShellRef} scale={[1.0045, 1.0045, 1.0045]}>
            <sphereGeometry
              args={[
                EARTH_RADIUS,
                Math.max(32, Math.floor(preset.sphereSegments * 0.75)),
                Math.max(32, Math.floor(preset.sphereSegments * 0.75)),
              ]}
            />
            <meshStandardMaterial
              map={proceduralTextures.cloudMap}
              transparent
              opacity={gibsBaseTexture && timeScale === 'historical' ? 0.22 : 0.58}
              roughness={1.0}
              metalness={0.0}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* PHASE 8 FUTURE PROJECTION OVERLAYS */}
        {timelineScrubMode === 'future-projection' && futureBiomeTexture && (
          <mesh scale={[1.002, 1.002, 1.002]}>
            <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
            <meshBasicMaterial
              map={futureBiomeTexture}
              transparent
              opacity={0.78}
              depthWrite={false}
            />
          </mesh>
        )}

        {timelineScrubMode === 'future-projection' && futureThermalTexture && (
          <mesh scale={[1.0035, 1.0035, 1.0035]}>
            <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
            <meshBasicMaterial
              map={futureThermalTexture}
              transparent
              opacity={0.72}
              depthWrite={false}
            />
          </mesh>
        )}

        {timelineScrubMode === 'future-projection' &&
          layers.futureCoastalInundation !== false && (
            <PaleoCoastlineLines polygons={PRESENT_WGS84_CRATONS} />
          )}

        {/* DEEP-TIME OVERLAYS */}
        {timeScale === 'deep-time' && layers.paleoVegetation && paleoVegetationTexture && (
          <mesh scale={[1.002, 1.002, 1.002]}>
            <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
            <meshBasicMaterial
              map={paleoVegetationTexture}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
        )}

        {timeScale === 'deep-time' && layers.paleoCoastlines && (
          <PaleoCoastlineLines polygons={paleoPolygons} />
        )}

        {/* HISTORICAL SATELLITE OVERLAYS */}
        {timeScale === 'historical' &&
          timelineScrubMode !== 'future-projection' &&
          historicalEventVegetationTexture && (
            <mesh scale={[1.0025, 1.0025, 1.0025]}>
              <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
              <meshBasicMaterial
                map={historicalEventVegetationTexture}
                transparent
                opacity={0.82}
                depthWrite={false}
              />
            </mesh>
          )}

        {timeScale === 'historical' &&
          timelineScrubMode !== 'future-projection' &&
          layers.gibsLandSurfaceTemp &&
          gibsLstTexture && (
            <mesh scale={[1.003, 1.003, 1.003]}>
              <sphereGeometry args={[EARTH_RADIUS, preset.sphereSegments, preset.sphereSegments]} />
              <meshBasicMaterial
                map={gibsLstTexture}
                transparent
                opacity={0.78}
                depthWrite={false}
              />
            </mesh>
          )}

        {timeScale === 'historical' &&
          timelineScrubMode !== 'future-projection' &&
          layers.climatePlaceholder &&
          proceduralClimateTexture && (
            <mesh scale={[1.004, 1.004, 1.004]}>
              <sphereGeometry
                args={[
                  EARTH_RADIUS,
                  Math.max(32, Math.floor(preset.sphereSegments * 0.75)),
                  Math.max(32, Math.floor(preset.sphereSegments * 0.75)),
                ]}
              />
              <meshBasicMaterial
                map={proceduralClimateTexture}
                transparent
                opacity={0.65}
                depthWrite={false}
              />
            </mesh>
          )}

        {timeScale === 'historical' &&
          timelineScrubMode !== 'future-projection' &&
          layers.eonetEvents && (
            <EonetMarkers
              events={eonetEvents}
              onSelectEvent={(ev) => {
                onHoverEonetEvent(ev);
                if (ev) {
                  launchCatalogEvent(convertEonetMarkerToCatalogEvent(ev));
                }
              }}
            />
          )}

        {/* Phase 7: Procedural Shockwave, Ejecta Plume & Stratospheric Ash Cloud */}
        <CatastropheVisualizer />

        {/* Phase 5: SGP4/SDP4 Satellite Swarm */}
        <SatelliteSwarm />

        {/* Rayleigh + Sunset Terminator Atmosphere Shell */}
        {layers.atmosphere && (
          <mesh material={atmosphereMaterial} scale={[1.032, 1.032, 1.032]}>
            <sphereGeometry
              args={[
                EARTH_RADIUS,
                Math.max(32, Math.floor(preset.sphereSegments * 0.85)),
                Math.max(32, Math.floor(preset.sphereSegments * 0.85)),
              ]}
            />
          </mesh>
        )}
      </group>

      {/* Phase 6: Heliocentric Solar System & Earth-Moon Scene */}
      <SolarSystemScene controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={0.45}
        maxDistance={maxOrbitDist}
        rotateSpeed={0.65}
        zoomSpeed={0.9}
        onStart={() => {
          isInteractingRef.current = true;
        }}
        onEnd={() => {
          isInteractingRef.current = false;
          lastInteractionTimeRef.current = performance.now();
          syncCameraToStore();
        }}
      />
    </>
  );
};