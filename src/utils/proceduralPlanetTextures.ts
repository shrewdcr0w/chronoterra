import * as THREE from 'three';
import { CelestialBodyId } from '../simulation/astronomy/solarSystemEphemeris';

export interface PlanetPbrTextureBundle {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpScale: number;
  baseRoughness: number;
  metalness: number;
  atmosphereColorHex?: string;
  atmosphereTwilightHex?: string;
  atmosphereIntensity?: number;
}

const pbrBundleCache = new Map<CelestialBodyId, PlanetPbrTextureBundle>();
let saturnRingTextureCache: THREE.CanvasTexture | null = null;

function hash2D(ix: number, iy: number, seed = 1): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number, seed = 1): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm2D(x: number, y: number, octaves = 4, seed = 1): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise2D(x * freq, y * freq, seed + i * 13);
    freq *= 2.03;
    amp *= 0.5;
  }
  return value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * clamped),
    Math.round(c1[1] + (c2[1] - c1[1]) * clamped),
    Math.round(c1[2] + (c2[2] - c1[2]) * clamped),
  ];
}

/**
 * Evaluates a procedural radial impact crater profile (depressed floor + raised rim).
 */
function evaluateCraterField(
  u: number,
  v: number,
  craterCount: number,
  seed: number
): number {
  let deltaHeight = 0;
  for (let i = 0; i < craterCount; i++) {
    const cx = hash2D(i, 1, seed);
    const cy = 0.12 + hash2D(i, 2, seed) * 0.76;
    const radius = 0.012 + Math.pow(hash2D(i, 3, seed), 2.6) * 0.065;

    // Handle equirectangular wrap-around along longitude u
    let dx = Math.abs(u - cx);
    if (dx > 0.5) dx = 1.0 - dx;
    const dy = (v - cy) * 0.55;
    const dist = Math.hypot(dx, dy);

    if (dist < radius * 1.35) {
      const rNorm = dist / radius;
      if (rNorm < 0.78) {
        // Bowl depression
        const bowl = -Math.cos((rNorm / 0.78) * (Math.PI * 0.5));
        deltaHeight += bowl * 0.45;
      } else {
        // Raised ejecta rim
        const rimPhase = (rNorm - 0.78) / 0.57;
        const rim = Math.sin(rimPhase * Math.PI) * (1 - rimPhase * 0.5);
        deltaHeight += rim * 0.32;
      }
    }
  }
  return Math.max(-0.7, Math.min(0.7, deltaHeight));
}

export function getProceduralPlanetPbrBundle(
  bodyId: CelestialBodyId
): PlanetPbrTextureBundle {
  const cached = pbrBundleCache.get(bodyId);
  if (cached) return cached;

  const width = 512;
  const height = 256;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d');

  if (colorCtx && bumpCtx && roughCtx) {
    const colorImg = colorCtx.createImageData(width, height);
    const bumpImg = bumpCtx.createImageData(width, height);
    const roughImg = roughCtx.createImageData(width, height);

    const cData = colorImg.data;
    const bData = bumpImg.data;
    const rData = roughImg.data;

    for (let y = 0; y < height; y++) {
      const v = y / height; // 0 (North Pole) .. 1 (South Pole)
      const latNorm = (0.5 - v) * 2.0; // +1 North .. -1 South
      const absLat = Math.abs(latNorm);

      for (let x = 0; x < width; x++) {
        const u = x / width; // 0 .. 1 longitude
        const idx = (y * width + x) * 4;

        let rgb: [number, number, number] = [128, 128, 128];
        let bumpVal = 128;
        let roughVal = 215;

        if (bodyId === 'Sun') {
          // Photospheric convection granulation + active sunspot belts
          const gran1 = fbm2D(u * 36, v * 18, 4, 10);
          const gran2 = fbm2D(u * 90 + gran1 * 2, v * 45 - gran1 * 2, 3, 20);
          const spotNoise = fbm2D(u * 14, v * 7, 3, 30);
          const inSunspotBelt = Math.exp(-Math.pow((absLat - 0.25) * 6.5, 2));
          const spotMask =
            spotNoise > 0.72 && inSunspotBelt > 0.35
              ? Math.min(1, (spotNoise - 0.72) * 9)
              : 0;

          const baseSolar = lerpColor([234, 88, 12], [254, 240, 138], gran1 * 0.65 + gran2 * 0.35);
          rgb = lerpColor(baseSolar, [68, 22, 6], spotMask * 0.85);
          bumpVal = Math.round(gran2 * 255);
          roughVal = 255;
        } else if (bodyId === 'Moon') {
          // Lunar Highlands + dark basaltic Maria basins + impact crater relief
          const mariaNoise = fbm2D(u * 4.5, v * 2.5, 4, 101);
          const detailNoise = fbm2D(u * 28, v * 14, 4, 102);
          const craters = evaluateCraterField(u, v, 52, 103);

          // Concentrate Maria on the near-side northern/equatorial hemisphere
          const nearSideBias = Math.exp(-Math.pow((u - 0.5) * 3.2, 2)) * (1 - absLat * 0.65);
          const isMare = Math.max(0, Math.min(1, (mariaNoise * 0.85 + nearSideBias * 0.45 - 0.56) * 4.5));

          const highlandColor: [number, number, number] = [176, 182, 190];
          const mareColor: [number, number, number] = [78, 84, 94];
          const baseLunar = lerpColor(highlandColor, mareColor, isMare);

          const shade = 1.0 + craters * 0.38 + (detailNoise - 0.5) * 0.25;
          rgb = [
            Math.max(25, Math.min(245, Math.round(baseLunar[0] * shade))),
            Math.max(25, Math.min(245, Math.round(baseLunar[1] * shade))),
            Math.max(28, Math.min(248, Math.round(baseLunar[2] * shade))),
          ];

          const heightNorm = 0.5 - isMare * 0.22 + craters * 0.42 + (detailNoise - 0.5) * 0.18;
          bumpVal = Math.max(0, Math.min(255, Math.round(heightNorm * 255)));
          roughVal = 238;
        } else if (bodyId === 'Mercury') {
          // Heavily cratered silicate regolith & Caloris-style basins
          const regolith = fbm2D(u * 8, v * 4, 4, 201);
          const fine = fbm2D(u * 32, v * 16, 4, 202);
          const craters = evaluateCraterField(u, v, 64, 203);

          const baseMerc = lerpColor([92, 86, 80], [158, 151, 144], regolith);
          const shade = 1.0 + craters * 0.42 + (fine - 0.5) * 0.22;
          rgb = [
            Math.max(30, Math.min(230, Math.round(baseMerc[0] * shade))),
            Math.max(28, Math.min(225, Math.round(baseMerc[1] * shade))),
            Math.max(26, Math.min(220, Math.round(baseMerc[2] * shade))),
          ];
          bumpVal = Math.max(0, Math.min(255, Math.round((0.5 + craters * 0.45 + (fine - 0.5) * 0.2) * 255)));
          roughVal = 232;
        } else if (bodyId === 'Venus') {
          // Super-rotating sulfuric acid clouds with equatorial V-shaped chevron waves
          const chevronShift = Math.cos(latNorm * Math.PI * 1.3) * 0.18;
          const swirl = fbm2D((u + chevronShift) * 6, v * 5, 4, 301);
          const bands = fbm2D((u + chevronShift * 1.5) * 12 + swirl * 1.4, v * 10, 4, 302);

          const t = Math.max(0, Math.min(1, bands * 0.7 + swirl * 0.3));
          rgb = lerpColor([184, 134, 45], [248, 226, 158], t);
          bumpVal = Math.round(lerp(105, 165, t));
          roughVal = 195;
        } else if (bodyId === 'Mars') {
          // Ferric oxide deserts, dark basaltic Syrtis Major/Valles Marineris, craters & polar ice caps
          const albedoNoise = fbm2D(u * 5.5, v * 3.2, 4, 401);
          const fine = fbm2D(u * 26, v * 13, 4, 402);
          const craters = evaluateCraterField(u, v, 38, 403);

          const darkBasaltMask = Math.max(0, Math.min(1, (albedoNoise - 0.52) * 4.2));
          const dustyOchre: [number, number, number] = [212, 108, 52];
          const rustRed: [number, number, number] = [166, 66, 32];
          const basaltDark: [number, number, number] = [78, 44, 34];

          let marsBase = lerpColor(rustRed, dustyOchre, fine);
          marsBase = lerpColor(marsBase, basaltDark, darkBasaltMask * 0.72);

          // Polar CO2/H2O Ice Caps with irregular frost boundary
          const polarCapEdge = 0.86 + (albedoNoise - 0.5) * 0.08;
          if (absLat > polarCapEdge) {
            const iceBlend = Math.min(1, (absLat - polarCapEdge) * 14);
            rgb = lerpColor(marsBase, [242, 246, 250], iceBlend);
            bumpVal = 210;
            roughVal = 165;
          } else {
            const shade = 1.0 + craters * 0.32 + (fine - 0.5) * 0.2;
            rgb = [
              Math.max(30, Math.min(245, Math.round(marsBase[0] * shade))),
              Math.max(20, Math.min(220, Math.round(marsBase[1] * shade))),
              Math.max(15, Math.min(200, Math.round(marsBase[2] * shade))),
            ];
            bumpVal = Math.max(
              0,
              Math.min(255, Math.round((0.5 + craters * 0.4 + (fine - 0.5) * 0.25 - darkBasaltMask * 0.15) * 255))
            );
            roughVal = 225;
          }
        } else if (bodyId === 'Jupiter') {
          // Domain-warped zonal ammonia zones, reddish-brown belts & Great Red Spot at 22 deg S
          const eddy = fbm2D(u * 10, v * 20, 3, 501);
          const warpedV = v + (eddy - 0.5) * 0.045;
          const zonalWave =
            Math.sin(warpedV * Math.PI * 16) * 0.55 +
            Math.cos(warpedV * Math.PI * 7) * 0.35 +
            (fbm2D(u * 18 + eddy * 2, v * 36, 3, 502) - 0.5) * 0.4;

          const zoneColor: [number, number, number] = [238, 224, 198];
          const beltColor: [number, number, number] = [172, 98, 54];
          const deepBeltColor: [number, number, number] = [124, 56, 32];

          const bandNorm = Math.max(0, Math.min(1, zonalWave * 0.5 + 0.5));
          rgb =
            bandNorm > 0.45
              ? lerpColor(beltColor, zoneColor, (bandNorm - 0.45) / 0.55)
              : lerpColor(deepBeltColor, beltColor, bandNorm / 0.45);

          // Great Red Spot at u = 0.62, v = 0.62 (~22 deg S)
          const grsDx = (u - 0.62) / 0.065;
          const grsDy = (v - 0.62) / 0.038;
          const grsDist = Math.hypot(grsDx, grsDy);
          if (grsDist < 1.25) {
            const swirlAngle = Math.atan2(grsDy, grsDx) + (1.25 - grsDist) * 3.5;
            const vortexNoise = Math.sin(swirlAngle * 3) * 0.15 + 0.85;
            const grsCore: [number, number, number] = [208, 68, 36];
            const grsBlend = Math.pow(Math.max(0, 1 - grsDist / 1.25), 1.4) * vortexNoise;
            rgb = lerpColor(rgb, grsCore, grsBlend);
          }

          // Polar darkening (Juno-style bluish-grey polar cyclones)
          if (absLat > 0.78) {
            const polarMix = (absLat - 0.78) / 0.22;
            rgb = lerpColor(rgb, [110, 122, 138], polarMix * 0.65);
          }

          bumpVal = Math.round(lerp(95, 175, bandNorm));
          roughVal = 175;
        } else if (bodyId === 'Saturn') {
          // Butterscotch/gold ammonia-haze zonal bands & north polar hexagon tint
          const eddy = fbm2D(u * 8, v * 16, 3, 601);
          const warpedV = v + (eddy - 0.5) * 0.022;
          const zonal =
            Math.sin(warpedV * Math.PI * 12) * 0.5 +
            Math.cos(warpedV * Math.PI * 5) * 0.35 +
            (eddy - 0.5) * 0.25;

          const bandNorm = Math.max(0, Math.min(1, zonal * 0.5 + 0.5));
          rgb = lerpColor([178, 142, 84], [244, 226, 172], bandNorm);

          if (absLat > 0.82) {
            rgb = lerpColor(rgb, [118, 134, 138], ((absLat - 0.82) / 0.18) * 0.7);
          }

          bumpVal = Math.round(lerp(110, 150, bandNorm));
          roughVal = 180;
        } else if (bodyId === 'Uranus') {
          // Pale cyan-aquamarine methane atmosphere with high-latitude collar brightening
          const band = Math.cos(latNorm * Math.PI * 3) * 0.15 + fbm2D(u * 6, v * 12, 3, 701) * 0.2;
          const collar = Math.exp(-Math.pow((absLat - 0.65) * 5, 2)) * 0.25;
          const t = Math.max(0, Math.min(1, 0.45 + band + collar));

          rgb = lerpColor([72, 182, 204], [186, 242, 250], t);
          bumpVal = 128;
          roughVal = 165;
        } else if (bodyId === 'Neptune') {
          // Deep cobalt-azure methane bands, bright white methane-ice cirrus streaks & Great Dark Spot
          const eddy = fbm2D(u * 10, v * 18, 3, 801);
          const zonal = Math.sin((v + (eddy - 0.5) * 0.03) * Math.PI * 10);
          const bandNorm = Math.max(0, Math.min(1, zonal * 0.5 + 0.5));

          rgb = lerpColor([24, 58, 158], [62, 122, 235], bandNorm);

          // Dark Spot vortex at 20 deg S (v = 0.61)
          const gdsDist = Math.hypot((u - 0.38) / 0.055, (v - 0.61) / 0.032);
          if (gdsDist < 1.0) {
            rgb = lerpColor(rgb, [12, 24, 82], (1 - gdsDist) * 0.82);
          }

          // High-altitude white methane-ice cirrus streaks
          const cirrus = fbm2D(u * 24 + eddy * 2, v * 48, 3, 802);
          if (cirrus > 0.68 && absLat < 0.75) {
            const cMix = Math.min(1, (cirrus - 0.68) * 5.5);
            rgb = lerpColor(rgb, [235, 248, 255], cMix * 0.75);
            bumpVal = Math.round(128 + cMix * 65);
          } else {
            bumpVal = Math.round(lerp(115, 142, bandNorm));
          }
          roughVal = 165;
        }

        cData[idx] = rgb[0];
        cData[idx + 1] = rgb[1];
        cData[idx + 2] = rgb[2];
        cData[idx + 3] = 255;

        bData[idx] = bumpVal;
        bData[idx + 1] = bumpVal;
        bData[idx + 2] = bumpVal;
        bData[idx + 3] = 255;

        rData[idx] = roughVal;
        rData[idx + 1] = roughVal;
        rData[idx + 2] = roughVal;
        rData[idx + 3] = 255;
      }
    }

    colorCtx.putImageData(colorImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = 4;
  colorMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.needsUpdate = true;

  const materialTuning: Record<
    CelestialBodyId,
    {
      bumpScale: number;
      baseRoughness: number;
      metalness: number;
      atmosphereColorHex?: string;
      atmosphereTwilightHex?: string;
      atmosphereIntensity?: number;
    }
  > = {
    Sun: { bumpScale: 0, baseRoughness: 1.0, metalness: 0 },
    Moon: { bumpScale: 0.022, baseRoughness: 0.94, metalness: 0.02 },
    Mercury: { bumpScale: 0.024, baseRoughness: 0.92, metalness: 0.06 },
    Venus: {
      bumpScale: 0.005,
      baseRoughness: 0.78,
      metalness: 0.01,
      atmosphereColorHex: '#fde68a',
      atmosphereTwilightHex: '#d97706',
      atmosphereIntensity: 1.15,
    },
    Earth: { bumpScale: 0.014, baseRoughness: 0.9, metalness: 0.04 },
    Mars: {
      bumpScale: 0.026,
      baseRoughness: 0.89,
      metalness: 0.03,
      atmosphereColorHex: '#fdba74',
      atmosphereTwilightHex: '#ea580c',
      atmosphereIntensity: 0.72,
    },
    Jupiter: {
      bumpScale: 0.008,
      baseRoughness: 0.74,
      metalness: 0.01,
      atmosphereColorHex: '#fed7aa',
      atmosphereTwilightHex: '#c2410c',
      atmosphereIntensity: 0.88,
    },
    Saturn: {
      bumpScale: 0.006,
      baseRoughness: 0.76,
      metalness: 0.01,
      atmosphereColorHex: '#fef08a',
      atmosphereTwilightHex: '#ca8a04',
      atmosphereIntensity: 0.85,
    },
    Uranus: {
      bumpScale: 0.003,
      baseRoughness: 0.7,
      metalness: 0.01,
      atmosphereColorHex: '#67e8f9',
      atmosphereTwilightHex: '#0284c7',
      atmosphereIntensity: 1.05,
    },
    Neptune: {
      bumpScale: 0.005,
      baseRoughness: 0.7,
      metalness: 0.01,
      atmosphereColorHex: '#60a5fa',
      atmosphereTwilightHex: '#1d4ed8',
      atmosphereIntensity: 1.12,
    },
  };

  const tuning = materialTuning[bodyId];
  const bundle: PlanetPbrTextureBundle = {
    colorMap,
    bumpMap,
    roughnessMap,
    ...tuning,
  };

  pbrBundleCache.set(bodyId, bundle);
  return bundle;
}

/**
 * Backward-compatible helper returning the primary diffuse colorMap.
 */
export function getProceduralBodyTexture(bodyId: CelestialBodyId): THREE.CanvasTexture {
  return getProceduralPlanetPbrBundle(bodyId).colorMap;
}

/**
 * Generates a radial 1D-swept Saturn Ring texture with realistic C Ring, B Ring,
 * Cassini Division gap, A Ring, Encke gap, and F Ring optical depth.
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (saturnRingTextureCache) return saturnRingTextureCache;

  const width = 512;
  const height = 32;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const img = ctx.createImageData(width, height);
    const data = img.data;

    for (let x = 0; x < width; x++) {
      const rNorm = x / (width - 1); // 0 = inner edge (1.25 R_sat), 1 = outer edge (2.35 R_sat)
      const fineRipple =
        Math.sin(rNorm * 180) * 0.08 +
        Math.cos(rNorm * 420) * 0.05 +
        (hash2D(x, 1, 901) - 0.5) * 0.06;

      let rgb: [number, number, number] = [218, 196, 152];
      let alpha = 0.0;

      if (rNorm < 0.04) {
        // Inner gap
        alpha = 0.0;
      } else if (rNorm < 0.24) {
        // C Ring (faint, translucent smoky inner ring)
        rgb = [148, 132, 108];
        alpha = 0.22 + fineRipple * 0.3;
      } else if (rNorm < 0.58) {
        // B Ring (brightest, densest main ring)
        const bProgress = (rNorm - 0.24) / 0.34;
        rgb = lerpColor([212, 188, 138], [246, 228, 184], bProgress + fineRipple);
        alpha = 0.88 + fineRipple * 0.25;
      } else if (rNorm < 0.64) {
        // Cassini Division (prominent dark 4,800 km gap)
        rgb = [60, 52, 44];
        alpha = 0.05;
      } else if (rNorm < 0.93) {
        // A Ring (with Encke Gap at rNorm ~ 0.86)
        if (rNorm > 0.85 && rNorm < 0.87) {
          // Encke Gap
          alpha = 0.06;
        } else {
          rgb = lerpColor([204, 184, 144], [228, 208, 166], 0.5 + fineRipple);
          alpha = 0.68 + fineRipple * 0.2;
        }
      } else if (rNorm > 0.96 && rNorm < 0.985) {
        // Narrow outer F Ring shepherd strand
        rgb = [235, 218, 178];
        alpha = 0.42;
      }

      const aByte = Math.max(0, Math.min(255, Math.round(alpha * 255)));

      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = aByte;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  saturnRingTextureCache = tex;
  return tex;
}

/**
 * Creates a RingGeometry whose UV.x maps radially from innerRadius (0) to outerRadius (1),
 * allowing 1D radial ring textures (Cassini Division, Encke Gap) to wrap concentrically.
 */
export function createRadialUvRingGeometry(
  innerRadius: number,
  outerRadius: number,
  thetaSegments = 96
): THREE.RingGeometry {
  const geom = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments, 1);
  const pos = geom.attributes.position;
  const uvs = geom.attributes.uv;
  const v3 = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const radius = v3.length();
    const u = (radius - innerRadius) / Math.max(0.0001, outerRadius - innerRadius);
    uvs.setXY(i, u, 0.5);
  }

  uvs.needsUpdate = true;
  return geom;
}