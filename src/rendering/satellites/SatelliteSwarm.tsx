import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { usePlanetaryStore } from '../../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS } from '../../types/planetaryState';
import { CELESTRAK_GROUPS, CelestrakGroupId } from '../../simulation/orbit/ommTypes';
import { fetchCelestrakOmmGroup } from '../../data/loaders/celestrakOmmLoader';
import {
  CompiledSatRecord,
  computeOrbitTrajectoryPoints,
  cullSatellitesForPreset,
  parseOmmToSatRec,
  propagateSatelliteAtTime,
} from '../../simulation/orbit/satellitePropagator';

const GROUP_COLOR_MAP: Record<CelestrakGroupId, string> = CELESTRAK_GROUPS.reduce(
  (acc, g) => {
    acc[g.id] = g.colorHex;
    return acc;
  },
  {} as Record<CelestrakGroupId, string>
);

export const SatelliteSwarm: React.FC = () => {
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const showSatellites = usePlanetaryStore((s) => s.orbitalState.showSatellites);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const enabledSatelliteGroups = usePlanetaryStore((s) => s.enabledSatelliteGroups);
  const satelliteDensity = usePlanetaryStore((s) => s.satelliteDensity);
  const selectedSatelliteNoradId = usePlanetaryStore((s) => s.selectedSatelliteNoradId);
  const setSelectedSatelliteNoradId = usePlanetaryStore((s) => s.setSelectedSatelliteNoradId);
  const setPropagatedSatellites = usePlanetaryStore((s) => s.setPropagatedSatellites);
  const updateRuntimeTelemetry = usePlanetaryStore((s) => s.updateRuntimeTelemetry);

  const { camera } = useThree();
  const preset = GRAPHICS_PRESETS[graphicsProfile];

  const [compiledRecords, setCompiledRecords] = useState<CompiledSatRecord[]>([]);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // 1. Fetch & compile OMM-JSON records for enabled CelesTrak groups
  useEffect(() => {
    let cancelled = false;
    if (!showSatellites || timeScale !== 'historical') {
      setCompiledRecords([]);
      setPropagatedSatellites([]);
      updateRuntimeTelemetry({
        totalTrackedSatellites: 0,
        renderedSatellitesCount: 0,
      });
      return;
    }

    const activeGroups = (Object.keys(enabledSatelliteGroups) as CelestrakGroupId[]).filter(
      (g) => enabledSatelliteGroups[g]
    );

    if (activeGroups.length === 0) {
      setCompiledRecords([]);
      setPropagatedSatellites([]);
      updateRuntimeTelemetry({
        totalTrackedSatellites: 0,
        renderedSatellitesCount: 0,
      });
      return;
    }

    Promise.all(activeGroups.map((g) => fetchCelestrakOmmGroup(g))).then((results) => {
      if (cancelled) return;
      const seenNoradIds = new Set<number>();
      const compiled: CompiledSatRecord[] = [];
      const origins = new Set<string>();

      for (const res of results) {
        origins.add(res.origin);
        const sourceLabel =
          res.origin === 'live-celestrak-omm'
            ? 'CelesTrak GP OMM-JSON (Live 18 SDS)'
            : res.origin === 'idb-cached-omm'
            ? 'CelesTrak GP OMM-JSON (1h IndexedDB Cache)'
            : res.origin === 'idb-stale-fallback'
            ? 'CelesTrak GP OMM-JSON (Stale Cache Fallback)'
            : 'Bundled OMM-JSON Snapshot (Offline Fallback)';

        for (const omm of res.records) {
          if (seenNoradIds.has(omm.NORAD_CAT_ID)) continue;
          try {
            const satrec = parseOmmToSatRec(omm);
            seenNoradIds.add(omm.NORAD_CAT_ID);
            compiled.push({
              omm,
              group: res.group,
              satrec,
              dataSourceLabel: sourceLabel,
            });
          } catch {
            // Skip malformed element sets
          }
        }
      }

      setCompiledRecords(compiled);
      updateRuntimeTelemetry({
        totalTrackedSatellites: compiled.length,
        ommDataSourceOrigin: Array.from(origins).join(', '),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    showSatellites,
    timeScale,
    enabledSatelliteGroups,
    setPropagatedSatellites,
    updateRuntimeTelemetry,
  ]);

  // 2. Propagate all compiled SatRecs at PlanetaryState.timestamp & apply preset/density culling
  const visibleSatellites = useMemo(() => {
    if (!showSatellites || timeScale !== 'historical' || compiledRecords.length === 0) {
      return [];
    }

    const allPropagated = [];
    for (const rec of compiledRecords) {
      const state = propagateSatelliteAtTime(rec, timestamp);
      if (state) {
        allPropagated.push(state);
      }
    }

    const camPos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];

    return cullSatellitesForPreset(
      allPropagated,
      preset.maxSatellites,
      satelliteDensity,
      preset.cullBackfaceSatellites,
      camPos,
      selectedSatelliteNoradId
    );
  }, [
    showSatellites,
    timeScale,
    compiledRecords,
    timestamp,
    preset.maxSatellites,
    preset.cullBackfaceSatellites,
    satelliteDensity,
    selectedSatelliteNoradId,
    camera.position.x,
    camera.position.y,
    camera.position.z,
  ]);

  // Sync propagated & culled satellites to Zustand store for UI search & telemetry inspection
  useEffect(() => {
    setPropagatedSatellites(visibleSatellites);
    updateRuntimeTelemetry({ renderedSatellitesCount: visibleSatellites.length });
  }, [visibleSatellites, setPropagatedSatellites, updateRuntimeTelemetry]);

  // 3. Upload instance matrices and per-category colors to GPU
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    visibleSatellites.forEach((sat, idx) => {
      const [x, y, z] = sat.positionScene;
      dummy.position.set(x, y, z);

      const isSelected = sat.noradId === selectedSatelliteNoradId;
      const scale = isSelected ? 1.9 : 1.0;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      const hex = isSelected
        ? '#ffffff'
        : GROUP_COLOR_MAP[sat.group] ?? '#38bdf8';
      colorHelper.set(hex);
      mesh.setColorAt(idx, colorHelper);
    });

    mesh.count = visibleSatellites.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [visibleSatellites, selectedSatelliteNoradId, dummy, colorHelper]);

  // 4. Compute orbital trajectory THREE.Line object ONLY for the single selected satellite
  const selectedTrajectoryLine = useMemo(() => {
    if (!showSatellites || timeScale !== 'historical' || selectedSatelliteNoradId === null) {
      return null;
    }
    const selectedCompiled = compiledRecords.find(
      (r) => r.omm.NORAD_CAT_ID === selectedSatelliteNoradId
    );
    if (!selectedCompiled) return null;

    const pts = computeOrbitTrajectoryPoints(
      selectedCompiled,
      timestamp,
      preset.orbitLineSamples
    );
    if (pts.length < 2) return null;

    const flat: number[] = [];
    for (const [x, y, z] of pts) {
      flat.push(x, y, z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#facc15',
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Line(geom, mat);
  }, [
    showSatellites,
    timeScale,
    selectedSatelliteNoradId,
    compiledRecords,
    timestamp,
    preset.orbitLineSamples,
  ]);

  const handleInstanceClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && visibleSatellites[e.instanceId]) {
      setSelectedSatelliteNoradId(visibleSatellites[e.instanceId].noradId);
    }
  };

  if (!showSatellites || timeScale !== 'historical' || visibleSatellites.length === 0) {
    return null;
  }

  return (
    <group name="orbital-observatory-layer">
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, Math.max(1, visibleSatellites.length)]}
        onClick={handleInstanceClick}
      >
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {selectedTrajectoryLine && <primitive object={selectedTrajectoryLine} />}
    </group>
  );
};