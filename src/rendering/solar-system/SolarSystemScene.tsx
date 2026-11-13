import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePlanetaryStore } from '../../stores/usePlanetaryStore';
import { GRAPHICS_PRESETS } from '../../types/planetaryState';
import {
  CelestialBodyId,
  computeCelestialOrbitRing,
  computeSolarSystemEphemeris,
  BODY_PHYSICAL_CONSTANTS,
} from '../../simulation/astronomy/solarSystemEphemeris';
import {
  createRadialUvRingGeometry,
  getProceduralPlanetPbrBundle,
  getSaturnRingTexture,
} from '../../utils/proceduralPlanetTextures';
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
} from '../shaders/atmosphereShader';

interface SolarSystemSceneProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const PLANET_IDS: Array<Exclude<CelestialBodyId, 'Sun' | 'Earth' | 'Moon'>> = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

const solarCoronaFragmentShader = /* glsl */ `
  uniform vec3 uCoreColor;
  uniform vec3 uOuterColor;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = 1.0 - clamp(abs(dot(vNormal, viewDir)), 0.0, 1.0);
    float innerGlow = pow(rim, 2.2);
    float outerCorona = pow(rim, 4.8);
    vec3 col = mix(uOuterColor, uCoreColor, innerGlow);
    float alpha = clamp(innerGlow * 0.75 + outerCorona * 0.55, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

export const SolarSystemScene: React.FC<SolarSystemSceneProps> = ({ controlsRef }) => {
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const lastHistoricalTimestamp = usePlanetaryStore((s) => s.lastHistoricalTimestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const layers = usePlanetaryStore((s) => s.layers);
  const solarSystemScaleMode = usePlanetaryStore((s) => s.solarSystemScaleMode);
  const celestialFocusTarget = usePlanetaryStore((s) => s.celestialFocusTarget);
  const setCelestialFocusTarget = usePlanetaryStore((s) => s.setCelestialFocusTarget);
  const setLatestEphemerisSnapshot = usePlanetaryStore((s) => s.setLatestEphemerisSnapshot);

  const { camera } = useThree();
  const preset = GRAPHICS_PRESETS[graphicsProfile];

  const isTransitioningRef = useRef<boolean>(false);
  const desiredCameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const desiredCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.1, 3.1));

  // Use stable `lastHistoricalTimestamp` in deep-time mode so we never trigger an infinite render loop
  const effectiveTimestampMs =
    timeScale === 'historical' ? timestamp : lastHistoricalTimestamp;

  // 1. Compute live astronomy-engine ephemeris for all 10 solar system bodies
  const snapshot = useMemo(
    () => computeSolarSystemEphemeris(effectiveTimestampMs, solarSystemScaleMode),
    [effectiveTimestampMs, solarSystemScaleMode]
  );

  useEffect(() => {
    setLatestEphemerisSnapshot(snapshot);
  }, [snapshot, setLatestEphemerisSnapshot]);

  // 2. Configure smooth camera transition destination when user switches target or scale mode
  useEffect(() => {
    const bodies = snapshot.bodies;
    const targetVec = new THREE.Vector3(0, 0, 0);
    const offsetVec = new THREE.Vector3(0, 1.1, 3.1);

    if (celestialFocusTarget === 'Earth') {
      targetVec.set(0, 0, 0);
      offsetVec.set(0, 1.1, 3.1);
    } else if (celestialFocusTarget === 'Moon') {
      const mPos = bodies.Moon.scenePosition;
      const mRad = Math.max(0.25, bodies.Moon.sceneRadius);
      targetVec.set(mPos[0], mPos[1], mPos[2]);
      offsetVec.set(mRad * 3.1, mRad * 1.1, mRad * 3.1);
    } else if (celestialFocusTarget === 'Earth-Moon-System') {
      const mPos = bodies.Moon.scenePosition;
      targetVec.set(mPos[0] * 0.35, mPos[1] * 0.35, mPos[2] * 0.35);
      const dist = Math.hypot(mPos[0], mPos[1], mPos[2]);
      offsetVec.set(0, dist * 0.85, dist * 1.35);
    } else if (celestialFocusTarget === 'Sun') {
      const sPos = bodies.Sun.scenePosition;
      targetVec.set(sPos[0], sPos[1], sPos[2]);
      const overviewDist = solarSystemScaleMode === 'true-scale' ? 48000 : 260;
      offsetVec.set(0, overviewDist * 0.65, overviewDist * 0.9);
    } else {
      const pBody = bodies[celestialFocusTarget];
      if (pBody) {
        const [px, py, pz] = pBody.scenePosition;
        const pRad = Math.max(0.35, pBody.sceneRadius);
        targetVec.set(px, py, pz);
        offsetVec.set(pRad * 3.6, pRad * 1.35, pRad * 3.6);
      }
    }

    desiredCameraTargetRef.current.copy(targetVec);
    desiredCameraPosRef.current.copy(targetVec).add(offsetVec);
    isTransitioningRef.current = true;
  }, [celestialFocusTarget, solarSystemScaleMode]);

  // 3. Ease camera position and OrbitControls target cleanly
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (celestialFocusTarget !== 'Earth' && celestialFocusTarget !== 'Earth-Moon-System') {
      const body = snapshot.bodies[celestialFocusTarget];
      if (body) {
        desiredCameraTargetRef.current.set(
          body.scenePosition[0],
          body.scenePosition[1],
          body.scenePosition[2]
        );
      }
    }

    if (isTransitioningRef.current) {
      const smoothLambda = 5.5;
      controls.target.x = THREE.MathUtils.damp(
        controls.target.x,
        desiredCameraTargetRef.current.x,
        smoothLambda,
        delta
      );
      controls.target.y = THREE.MathUtils.damp(
        controls.target.y,
        desiredCameraTargetRef.current.y,
        smoothLambda,
        delta
      );
      controls.target.z = THREE.MathUtils.damp(
        controls.target.z,
        desiredCameraTargetRef.current.z,
        smoothLambda,
        delta
      );

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        desiredCameraPosRef.current.x,
        smoothLambda,
        delta
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        desiredCameraPosRef.current.y,
        smoothLambda,
        delta
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        desiredCameraPosRef.current.z,
        smoothLambda,
        delta
      );

      controls.update();

      if (camera.position.distanceTo(desiredCameraPosRef.current) < 0.08) {
        isTransitioningRef.current = false;
      }
    }
  });

  // 4. Solar Corona Shader Material
  const solarCoronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: solarCoronaFragmentShader,
        uniforms: {
          uCoreColor: { value: new THREE.Color('#fef08a') },
          uOuterColor: { value: new THREE.Color('#ea580c') },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  // 5. Per-Planet Atmosphere Rim Shader Materials (oriented toward the Sun)
  const planetAtmosphereMaterials = useMemo(() => {
    const map = {} as Record<CelestialBodyId, THREE.ShaderMaterial | null>;
    for (const pid of PLANET_IDS) {
      const pbr = getProceduralPlanetPbrBundle(pid);
      if (!pbr.atmosphereColorHex) {
        map[pid] = null;
        continue;
      }
      map[pid] = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          uGlowColor: { value: new THREE.Color(pbr.atmosphereColorHex) },
          uTwilightColor: {
            value: new THREE.Color(pbr.atmosphereTwilightHex ?? pbr.atmosphereColorHex),
          },
          uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
          uFresnelPower: { value: 3.4 },
          uIntensity: { value: pbr.atmosphereIntensity ?? 0.9 },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
    }
    return map;
  }, []);

  // Update each planet's atmosphere uSunDirection uniform to point from the planet toward the Sun
  useEffect(() => {
    const [sx, sy, sz] = snapshot.bodies.Sun.scenePosition;
    for (const pid of PLANET_IDS) {
      const mat = planetAtmosphereMaterials[pid];
      if (!mat) continue;
      const [px, py, pz] = snapshot.bodies[pid].scenePosition;
      mat.uniforms.uSunDirection.value.set(sx - px, sy - py, sz - pz).normalize();
    }
  }, [snapshot, planetAtmosphereMaterials]);

  // 6. Saturn Radial UV Ring Geometry & Texture
  const saturnRadius = snapshot.bodies.Saturn.sceneRadius;
  const saturnRingGeometry = useMemo(
    () =>
      createRadialUvRingGeometry(
        saturnRadius * 1.28,
        saturnRadius * 2.38,
        Math.max(48, preset.sphereSegments)
      ),
    [saturnRadius, preset.sphereSegments]
  );
  const saturnRingMap = useMemo(() => getSaturnRingTexture(), []);

  // 7. Compute 3D orbit ring THREE.Line objects
  const moonOrbitLine = useMemo(() => {
    const pts = computeCelestialOrbitRing(
      'Moon',
      effectiveTimestampMs,
      solarSystemScaleMode,
      snapshot.bodies.Sun.scenePosition,
      preset.orbitLineSamples
    );
    const flat: number[] = [];
    for (const [x, y, z] of pts) flat.push(x, y, z);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#94a3b8',
      transparent: true,
      opacity: 0.55,
    });
    return new THREE.Line(geom, mat);
  }, [
    effectiveTimestampMs,
    solarSystemScaleMode,
    snapshot.bodies.Sun.scenePosition,
    preset.orbitLineSamples,
  ]);

  const planetOrbitLines = useMemo(() => {
    if (!layers.planetOrbits) return null;
    const allRingsIds: Array<Exclude<CelestialBodyId, 'Sun' | 'Moon'>> = [
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ];
    return allRingsIds.map((id) => {
      const pts = computeCelestialOrbitRing(
        id,
        effectiveTimestampMs,
        solarSystemScaleMode,
        snapshot.bodies.Sun.scenePosition,
        preset.orbitLineSamples
      );
      const flat: number[] = [];
      for (const [x, y, z] of pts) flat.push(x, y, z);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
      const mat = new THREE.LineBasicMaterial({
        color: BODY_PHYSICAL_CONSTANTS[id].colorHex,
        transparent: true,
        opacity: 0.42,
      });
      return { id, lineObj: new THREE.Line(geom, mat) };
    });
  }, [
    layers.planetOrbits,
    effectiveTimestampMs,
    solarSystemScaleMode,
    snapshot.bodies.Sun.scenePosition,
    preset.orbitLineSamples,
  ]);

  if (layers.naturalCelestialBodies === false || timeScale === 'deep-time') {
    return null;
  }

  const sunBody = snapshot.bodies.Sun;
  const moonBody = snapshot.bodies.Moon;
  const sunPbr = getProceduralPlanetPbrBundle('Sun');
  const moonPbr = getProceduralPlanetPbrBundle('Moon');
  const bodySegs = Math.max(24, Math.floor(preset.sphereSegments * 0.75));

  return (
    <group name="solar-system-explorer-group">
      {/* 1. Heliocentric Sun with Photospheric Granulation + Additive Corona Shell */}
      <group position={sunBody.scenePosition}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            setCelestialFocusTarget('Sun');
          }}
        >
          <sphereGeometry args={[sunBody.sceneRadius, bodySegs, bodySegs]} />
          <meshBasicMaterial map={sunPbr.colorMap} toneMapped={false} />
        </mesh>

        {/* Solar Chromosphere & Corona Rim Glow */}
        <mesh material={solarCoronaMaterial} scale={[1.18, 1.18, 1.18]}>
          <sphereGeometry args={[sunBody.sceneRadius, bodySegs, bodySegs]} />
        </mesh>

        <pointLight intensity={3.2} distance={0} decay={0} color="#fffaf0" />
      </group>

      {/* 2. Dedicated Moon Mesh (Maria Basins + Crater Bump Relief + Tidal Lock) */}
      <group
        position={moonBody.scenePosition}
        rotation={[0, snapshot.lunar.subEarthLonLatRotRad, 0]}
      >
        <mesh
          castShadow={preset.shadows}
          receiveShadow={preset.shadows}
          onClick={(e) => {
            e.stopPropagation();
            setCelestialFocusTarget('Moon');
          }}
        >
          <sphereGeometry args={[moonBody.sceneRadius, bodySegs, bodySegs]} />
          <meshStandardMaterial
            map={moonPbr.colorMap}
            bumpMap={moonPbr.bumpMap}
            bumpScale={moonPbr.bumpScale}
            roughnessMap={moonPbr.roughnessMap}
            roughness={moonPbr.baseRoughness}
            metalness={moonPbr.metalness}
          />
        </mesh>
      </group>

      {layers.moonOrbit !== false && <primitive object={moonOrbitLine} />}

      {/* 3. Seven Other Planets with PBR Relief, Atmosphere Rim Shaders & Saturn Rings */}
      {PLANET_IDS.map((pid) => {
        const body = snapshot.bodies[pid];
        const pbr = getProceduralPlanetPbrBundle(pid);
        const atmoMat = planetAtmosphereMaterials[pid];
        const spinRad = THREE.MathUtils.degToRad(body.spinAngleDeg);
        const tiltRad = THREE.MathUtils.degToRad(body.axialTiltDeg);

        return (
          <group key={pid} position={body.scenePosition} rotation={[0, 0, tiltRad]}>
            <mesh
              rotation={[0, spinRad, 0]}
              castShadow={preset.shadows}
              receiveShadow={preset.shadows}
              onClick={(e) => {
                e.stopPropagation();
                setCelestialFocusTarget(pid);
              }}
            >
              <sphereGeometry args={[body.sceneRadius, bodySegs, bodySegs]} />
              <meshStandardMaterial
                map={pbr.colorMap}
                bumpMap={pbr.bumpMap}
                bumpScale={pbr.bumpScale}
                roughnessMap={pbr.roughnessMap}
                roughness={pbr.baseRoughness}
                metalness={pbr.metalness}
              />
            </mesh>

            {/* Planetary Atmosphere Fresnel Rim Shell (Venus, Mars, Jupiter, Saturn, Uranus, Neptune) */}
            {atmoMat && (
              <mesh material={atmoMat} scale={[1.035, 1.035, 1.035]}>
                <sphereGeometry
                  args={[
                    body.sceneRadius,
                    Math.max(20, Math.floor(bodySegs * 0.75)),
                    Math.max(20, Math.floor(bodySegs * 0.75)),
                  ]}
                />
              </mesh>
            )}

            {/* Saturn's Multi-Band Ring System (C Ring, B Ring, Cassini Division, A Ring, Encke Gap) */}
            {pid === 'Saturn' && (
              <mesh
                geometry={saturnRingGeometry}
                rotation={[Math.PI / 2, 0, 0]}
                receiveShadow={preset.shadows}
              >
                <meshStandardMaterial
                  map={saturnRingMap}
                  side={THREE.DoubleSide}
                  transparent
                  roughness={0.78}
                  metalness={0.02}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 4. Heliocentric Planetary Orbit Rings */}
      {planetOrbitLines &&
        planetOrbitLines.map(({ id, lineObj }) => (
          <primitive key={`orbit-${id}`} object={lineObj} />
        ))}
    </group>
  );
};