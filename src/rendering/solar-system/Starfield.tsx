import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlanetaryStore } from '../../stores/usePlanetaryStore';
import { GraphicsProfile } from '../../types/planetaryState';

const STAR_COUNTS_BY_PRESET: Record<GraphicsProfile, number> = {
  low: 2500,
  balanced: 6500,
  high: 13000,
  ultra: 22000,
};

/**
 * Deterministic PRNG (Mulberry32) so star positions and magnitudes stay constant across renders.
 */
function createSeededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps a 0..1 roll to realistic Harvard spectral classification RGB colors:
 * O/B (blue-white), A (pure white), F/G (yellow-white), K (warm orange), M (red-orange).
 */
function sampleStellarSpectralColor(u: number): [number, number, number] {
  if (u < 0.08) return [0.68, 0.8, 1.0];   // O/B hot blue-white star
  if (u < 0.28) return [0.92, 0.96, 1.0];  // A/F white star
  if (u < 0.58) return [1.0, 0.97, 0.9];   // G solar yellow-white star
  if (u < 0.84) return [1.0, 0.84, 0.66];  // K orange star
  return [1.0, 0.68, 0.52];                // M red dwarf / giant
}

const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    vColor = color;
    vBrightness = aBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize;
  }
`;

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    // Circular soft Airy-disk point sprite with bright core
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv) * 2.0;
    if (dist > 1.0) discard;

    float core = exp(-dist * dist * 6.5);
    float halo = pow(max(0.0, 1.0 - dist), 2.2) * 0.35;
    float alpha = clamp((core + halo) * vBrightness, 0.0, 1.0);

    gl_FragColor = vec4(vColor, alpha);
  }
`;

export const Starfield: React.FC = () => {
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  const count = STAR_COUNTS_BY_PRESET[graphicsProfile];

  const { geometry, material } = useMemo(() => {
    const rand = createSeededRandom(133742);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightnesses = new Float32Array(count);

    // Galactic plane tilt (~60.2 deg relative to celestial equator)
    const galacticTiltRad = (60.2 * Math.PI) / 180;
    const cosTilt = Math.cos(galacticTiltRad);
    const sinTilt = Math.sin(galacticTiltRad);

    const sphereRadius = 900.0;

    for (let i = 0; i < count; i++) {
      // Concentrate 40% of stars toward the Milky Way galactic band
      const inGalacticBand = rand() < 0.4;
      const theta = rand() * Math.PI * 2;

      let latRad: number;
      if (inGalacticBand) {
        // Gaussian-like concentration near galactic equator
        const g1 = rand() - 0.5 + (rand() - 0.5);
        latRad = g1 * 0.38;
      } else {
        latRad = Math.asin(2 * rand() - 1);
      }

      const rCos = Math.cos(latRad);
      const x0 = sphereRadius * rCos * Math.cos(theta);
      const y0 = sphereRadius * Math.sin(latRad);
      const z0 = sphereRadius * rCos * Math.sin(theta);

      // Rotate galactic band by 60.2 deg
      positions[i * 3] = x0;
      positions[i * 3 + 1] = y0 * cosTilt - z0 * sinTilt;
      positions[i * 3 + 2] = y0 * sinTilt + z0 * cosTilt;

      const [r, g, b] = sampleStellarSpectralColor(rand());
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Power-law apparent magnitude: many pinpoint faint stars, rare brilliant beacons
      const magRoll = Math.pow(rand(), 4.5);
      sizes[i] = 1.15 + magRoll * 3.6;
      brightnesses[i] = 0.28 + Math.pow(rand(), 2.2) * 0.72;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [count]);

  // Keep star dome centered on camera so user never flies past the stars in Solar System mode
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.position.copy(camera.position);
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
};