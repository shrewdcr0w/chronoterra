import * as THREE from 'three';

export interface GeneratedEarthTextures {
  dayMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  isProceduralFallback: boolean;
}

function hash2D(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm2D(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

export function generateProceduralEarthTextures(
  includeGraticule: boolean
): GeneratedEarthTextures {
  const width = 1024;
  const height = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  const cloudCtx = cloudCanvas.getContext('2d')!;

  // 1. Deep bathymetric ocean base
  const oceanGrad = colorCtx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0f294a');
  oceanGrad.addColorStop(0.5, '#071b36');
  oceanGrad.addColorStop(1, '#0f294a');
  colorCtx.fillStyle = oceanGrad;
  colorCtx.fillRect(0, 0, width, height);

  // Ocean roughness: smooth enough for realistic solar specular glint, not mirror-plastic
  roughCtx.fillStyle = '#424242';
  roughCtx.fillRect(0, 0, width, height);

  bumpCtx.fillStyle = '#101010';
  bumpCtx.fillRect(0, 0, width, height);

  // 2. Refined continental outlines in equirectangular UV space
  const continents: Array<Array<[number, number]>> = [
    // North America
    [[85, 65], [160, 55], [275, 70], [310, 145], [260, 195], [230, 225], [185, 180], [135, 120]],
    // South America
    [[265, 232], [325, 250], [360, 295], [330, 385], [295, 435], [278, 360], [255, 280]],
    // Eurasia
    [[470, 68], [580, 52], [780, 58], [915, 95], [880, 185], [810, 235], [725, 252], [655, 210], [565, 195], [468, 150]],
    // Africa
    [[462, 175], [565, 185], [625, 245], [595, 340], [555, 402], [512, 385], [492, 290], [448, 235]],
    // Australia
    [[765, 315], [855, 308], [888, 355], [850, 398], [768, 382]],
    // Greenland
    [[335, 38], [415, 35], [395, 88], [345, 82]],
    // Antarctica
    [[0, 462], [1024, 462], [1024, 512], [0, 512]],
  ];

  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    pts: Array<[number, number]>,
    fill: string
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  };

  for (const poly of continents) {
    drawPolygon(colorCtx, poly, '#264e36');
    drawPolygon(roughCtx, poly, '#dcdcdc'); // Matte land
    drawPolygon(bumpCtx, poly, '#909090');
  }

  // 3. Add fractal terrain relief + procedural wispy cloud deck
  const cloudImg = cloudCtx.createImageData(width, height);
  const bumpImg = bumpCtx.getImageData(0, 0, width, height);
  const clData = cloudImg.data;
  const bmData = bumpImg.data;

  const step = 2;
  for (let y = 0; y < height; y += step) {
    const latNorm = Math.abs(y / height - 0.5) * 2; // 0 at equator, 1 at poles
    for (let x = 0; x < width; x += step) {
      // Swirled atmospheric cloud noise
      const swirl = fbm2D(x * 0.012, y * 0.024, 3);
      const cloudN = fbm2D(x * 0.018 + swirl * 2.2, y * 0.032 - swirl * 1.4, 4);
      // Higher cloud density along ITCZ (equator) and mid-latitude storm tracks
      const zonalBias =
        Math.exp(-Math.pow((latNorm - 0.05) * 6, 2)) * 0.14 +
        Math.exp(-Math.pow((latNorm - 0.52) * 5, 2)) * 0.16;

      const cloudAlpha = Math.max(0, Math.min(1, (cloudN + zonalBias - 0.54) * 2.8));
      const alphaByte = Math.round(cloudAlpha * 215);

      const terrainBump = Math.round(fbm2D(x * 0.04, y * 0.04, 3) * 95);

      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          clData[idx] = 248;
          clData[idx + 1] = 250;
          clData[idx + 2] = 255;
          clData[idx + 3] = alphaByte;

          if (bmData[idx] > 40) {
            const bVal = Math.min(255, bmData[idx] + terrainBump);
            bmData[idx] = bVal;
            bmData[idx + 1] = bVal;
            bmData[idx + 2] = bVal;
          }
        }
      }
    }
  }

  cloudCtx.putImageData(cloudImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  if (includeGraticule) {
    colorCtx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    colorCtx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 12) {
      colorCtx.beginPath();
      colorCtx.moveTo(x, 0);
      colorCtx.lineTo(x, height);
      colorCtx.stroke();
    }
    for (let y = 0; y <= height; y += height / 6) {
      colorCtx.beginPath();
      colorCtx.moveTo(0, y);
      colorCtx.lineTo(width, y);
      colorCtx.stroke();
    }
  }

  const dayMap = new THREE.CanvasTexture(colorCanvas);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  dayMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.needsUpdate = true;

  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.needsUpdate = true;

  return {
    dayMap,
    roughnessMap,
    bumpMap,
    cloudMap,
    isProceduralFallback: true,
  };
}