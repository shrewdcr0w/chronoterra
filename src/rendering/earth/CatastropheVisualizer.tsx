import React, { useMemo } from 'react';
import * as THREE from 'three';
import { usePlanetaryStore } from '../../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS } from '../../types/planetaryState';
import { latLonToCartesian } from '../../data/loaders/eonetLoader';
import { evaluateCatastropheModel } from '../../simulation/catastrophes/eventSimulationModel';

/**
 * Computes a 3D circle of points on the sphere of radius `sphereRadius` at angular distance `angularRadiusDeg`
 * around epicenter `(centerLatDeg, centerLonDeg)`.
 */
function buildSphericalRingPoints(
  centerLatDeg: number,
  centerLonDeg: number,
  angularRadiusDeg: number,
  sphereRadius: number,
  segments: number
): Float32Array {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = centerLatDeg * toRad;
  const lon1 = centerLonDeg * toRad;
  const d = angularRadiusDeg * toRad;

  const positions = new Float32Array((segments + 1) * 3);

  for (let i = 0; i <= segments; i++) {
    const brng = (i / segments) * Math.PI * 2;
    const sinLat2 =
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng);
    const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
    const y = Math.sin(brng) * Math.sin(d) * Math.cos(lat1);
    const x = Math.cos(d) - Math.sin(lat1) * Math.sin(lat2);
    const lon2 = lon1 + Math.atan2(y, x);

    const [px, py, pz] = latLonToCartesian(lat2 * toDeg, lon2 * toDeg, sphereRadius);
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;
  }

  return positions;
}

export const CatastropheVisualizer: React.FC = () => {
  const event = usePlanetaryStore((s) => s.event);
  const activeEventMeta = usePlanetaryStore((s) => s.activeEventMeta);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);

  const preset = GRAPHICS_PRESETS[graphicsProfile];

  const kinematics = useMemo(() => {
    if (!event || !activeEventMeta) return null;
    return evaluateCatastropheModel(
      activeEventMeta.kind,
      event.intensity,
      event.progress,
      activeEventMeta.recoveryHorizonYears
    );
  }, [event, activeEventMeta]);

  // 1. Epicenter marker position
  const epicenterPos = useMemo(() => {
    if (!activeEventMeta) return [0, 0, 0] as [number, number, number];
    return latLonToCartesian(activeEventMeta.lat, activeEventMeta.lon, 1.005);
  }, [activeEventMeta]);

  // 2. Shockwave Ring THREE.Line
  const shockwaveLine = useMemo(() => {
    if (!kinematics || !activeEventMeta || kinematics.shockwaveRadiusDeg <= 0.1) {
      return null;
    }
    const segs = Math.max(24, preset.sphereSegments);
    const pts = buildSphericalRingPoints(
      activeEventMeta.lat,
      activeEventMeta.lon,
      kinematics.shockwaveRadiusDeg,
      1.007,
      segs
    );
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: kinematics.shockwaveOpacity,
    });
    return new THREE.Line(geom, mat);
  }, [kinematics, activeEventMeta, preset.sphereSegments]);

  // 3. Damage Boundary Ring THREE.Line
  const damagePerimeterLine = useMemo(() => {
    if (!kinematics || !activeEventMeta || kinematics.progress <= 0) {
      return null;
    }
    const segs = Math.max(24, Math.floor(preset.sphereSegments * 0.75));
    const pts = buildSphericalRingPoints(
      activeEventMeta.lat,
      activeEventMeta.lon,
      kinematics.maxDamageRadiusDeg,
      1.0055,
      segs
    );
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: kinematics.pioneerRegrowthFraction > 0.25 ? '#84cc16' : '#f87171',
      transparent: true,
      opacity: 0.75,
    });
    return new THREE.Line(geom, mat);
  }, [kinematics, activeEventMeta, preset.sphereSegments]);

  // 4. Ballistic Ejecta Plume Arcs (Scaled by graphicsProfile)
  const ejectaPlumeGeometry = useMemo(() => {
    if (!kinematics || !activeEventMeta || kinematics.ejectaPlumeHeightScene <= 0.001) {
      return null;
    }
    const arcCount =
      graphicsProfile === 'low'
        ? 6
        : graphicsProfile === 'balanced'
        ? 12
        : graphicsProfile === 'high'
        ? 20
        : 32;
    const stepsPerArc = graphicsProfile === 'low' ? 8 : 16;
    const positions: number[] = [];

    const maxReachDeg = Math.min(25, kinematics.intensity * 2.2);
    for (let a = 0; a < arcCount; a++) {
      const azimuth = (a / arcCount) * Math.PI * 2;
      const dLat = Math.cos(azimuth) * maxReachDeg;
      const dLon = Math.sin(azimuth) * maxReachDeg;

      for (let s = 0; s < stepsPerArc; s++) {
        const t0 = s / stepsPerArc;
        const t1 = (s + 1) / stepsPerArc;

        const r0 = 1.005 + Math.sin(t0 * Math.PI) * kinematics.ejectaPlumeHeightScene;
        const r1 = 1.005 + Math.sin(t1 * Math.PI) * kinematics.ejectaPlumeHeightScene;

        const p0 = latLonToCartesian(
          activeEventMeta.lat + dLat * t0,
          activeEventMeta.lon + dLon * t0,
          r0
        );
        const p1 = latLonToCartesian(
          activeEventMeta.lat + dLat * t1,
          activeEventMeta.lon + dLon * t1,
          r1
        );

        positions.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [kinematics, activeEventMeta, graphicsProfile]);

  // 5. Stratospheric Ash / Aerosol Dispersion Texture
  const ashCloudTexture = useMemo(() => {
    if (!kinematics || !activeEventMeta || kinematics.ashOpacity <= 0.01) {
      return null;
    }
    const width = graphicsProfile === 'low' ? 256 : 512;
    const height = graphicsProfile === 'low' ? 128 : 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = ((activeEventMeta.lon + 180) / 360) * width;
    const cy = ((90 - activeEventMeta.lat) / 180) * height;
    const rx = Math.max(8, (kinematics.ashLonRadiusDeg / 360) * width);
    const ry = Math.max(6, (kinematics.ashLatRadiusDeg / 180) * height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx / ry, 1);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, ry);
    const coreColor =
      activeEventMeta.kind === 'impact' ? 'rgba(251, 146, 60, 0.85)' : 'rgba(148, 163, 184, 0.85)';
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.55, 'rgba(71, 85, 105, 0.55)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [kinematics, activeEventMeta, graphicsProfile]);

  if (!event || !activeEventMeta || !kinematics) return null;

  return (
    <group name="catastrophe-visualizer-layer">
      {/* 1. Epicenter Beacon */}
      <mesh position={epicenterPos}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial
          color={activeEventMeta.kind === 'impact' ? '#ef4444' : '#f97316'}
          toneMapped={false}
        />
      </mesh>

      {/* 2. Expanding Shockwave Front */}
      {shockwaveLine && <primitive object={shockwaveLine} />}

      {/* 3. Maximum Ecological Disturbance Perimeter */}
      {damagePerimeterLine && <primitive object={damagePerimeterLine} />}

      {/* 4. Ballistic Ejecta / Plume Arcs */}
      {ejectaPlumeGeometry && (
        <lineSegments geometry={ejectaPlumeGeometry}>
          <lineBasicMaterial color="#fb923c" transparent opacity={0.85} />
        </lineSegments>
      )}

      {/* 5. Zonal Stratospheric Ash & Aerosol Cloud Shell */}
      {ashCloudTexture && (
        <mesh scale={[1.016, 1.016, 1.016]}>
          <sphereGeometry
            args={[
              1.0,
              Math.max(24, Math.floor(preset.sphereSegments * 0.75)),
              Math.max(24, Math.floor(preset.sphereSegments * 0.75)),
            ]}
          />
          <meshBasicMaterial
            map={ashCloudTexture}
            transparent
            opacity={kinematics.ashOpacity}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};