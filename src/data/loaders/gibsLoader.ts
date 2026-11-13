import * as THREE from 'three';
import { GraphicsProfile } from '../../types/planetaryState';
import { buildCacheKey, getOrFetchCached } from './cacheManager';

export type GibsProductId =
  | 'MODIS_Terra_CorrectedReflectance_TrueColor'
  | 'MODIS_Terra_Land_Surface_Temp_Day';

export interface LoadedGibsBundle {
  texture: THREE.Texture;
  roughnessMap?: THREE.Texture;
  bumpMap?: THREE.Texture;
  cacheSource: 'memory' | 'idb' | 'network';
}

const GIBS_WMS_BASE = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

const RESOLUTION_BY_PRESET: Record<GraphicsProfile, { width: number; height: number }> = {
  low: { width: 1024, height: 512 },
  balanced: { width: 2048, height: 1024 },
  high: { width: 2048, height: 1024 },
  ultra: { width: 4096, height: 2048 },
};

export function buildGibsWmsUrl(
  product: GibsProductId,
  dateISO: string,
  profile: GraphicsProfile,
  transparent = false
): string {
  const { width, height } = RESOLUTION_BY_PRESET[profile];
  const format = transparent ? 'image/png' : 'image/jpeg';
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: product,
    CRS: 'EPSG:4326',
    BBOX: '-90,-180,90,180',
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: format,
    TRANSPARENT: transparent ? 'TRUE' : 'FALSE',
    TIME: dateISO,
  });
  return `${GIBS_WMS_BASE}?${params.toString()}`;
}

/**
 * 1. Heals NASA MODIS pitch-black orbital swath gaps & polar-night holes.
 * 2. Derives a pixel-aligned PBR Roughness Map (smooth specular oceans vs matte land/clouds).
 * 3. Derives a Topographic & Cloud-Top Bump Map so mountain ranges and clouds catch sunlight relief.
 */
function processModisTrueColorPbrMaps(
  bitmap: ImageBitmap,
  width: number,
  height: number
): {
  colorCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
  bumpCanvas: HTMLCanvasElement;
} {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext('2d')!;
  colorCtx.drawImage(bitmap, 0, 0, width, height);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const colorImg = colorCtx.getImageData(0, 0, width, height);
  const roughImg = roughCtx.createImageData(width, height);
  const bumpImg = bumpCtx.createImageData(width, height);

  const cData = colorImg.data;
  const rData = roughImg.data;
  const bData = bumpImg.data;

  const southIceRowStart = Math.floor(height * 0.86);
  const northIceRowEnd = Math.floor(height * 0.08);

  for (let y = 0; y < height; y++) {
    const isAntarcticCap = y >= southIceRowStart;
    const isArcticCap = y <= northIceRowEnd;
    const rowOffset = y * width * 4;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      let r = cData[idx];
      let g = cData[idx + 1];
      let b = cData[idx + 2];

      // 1. Heal MODIS No-Data voids (swath gaps & polar night)
      if (r < 10 && g < 10 && b < 10) {
        if (isAntarcticCap) {
          r = 214;
          g = 226;
          b = 238;
        } else if (isArcticCap) {
          r = 24;
          g = 48;
          b = 82;
        } else {
          r = 9;
          g = 31;
          b = 58;
        }
        cData[idx] = r;
        cData[idx + 1] = g;
        cData[idx + 2] = b;
      }

      // 2. Classify pixel into Ocean, Cloud/Ice, or Continental Land
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const isCloudOrSnow = r > 175 && g > 175 && b > 175;
      const isOceanWater = !isCloudOrSnow && b > r * 1.18 && b > g * 1.04 && luminance < 95;

      let roughnessByte: number;
      let bumpByte: number;

      if (isOceanWater) {
        // Open ocean: smooth specular water surface (low roughness = realistic sun glint)
        roughnessByte = 62;
        bumpByte = 15;
      } else if (isCloudOrSnow) {
        // Cloud tops & glaciers: high diffuse roughness + elevated bump height
        roughnessByte = 240;
        bumpByte = Math.min(255, Math.round(145 + (luminance - 175) * 1.3));
      } else {
        // Continental land (forests, deserts, mountains): matte roughness + terrain relief bump
        roughnessByte = 215;
        bumpByte = Math.min(220, Math.round(55 + luminance * 0.85));
      }

      rData[idx] = roughnessByte;
      rData[idx + 1] = roughnessByte;
      rData[idx + 2] = roughnessByte;
      rData[idx + 3] = 255;

      bData[idx] = bumpByte;
      bData[idx + 1] = bumpByte;
      bData[idx + 2] = bumpByte;
      bData[idx + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  return { colorCanvas, roughnessCanvas: roughCanvas, bumpCanvas };
}

export async function loadGibsTexture(
  product: GibsProductId,
  dateISO: string,
  profile: GraphicsProfile,
  transparent = false
): Promise<LoadedGibsBundle> {
  const { width, height } = RESOLUTION_BY_PRESET[profile];
  const cacheKey = buildCacheKey('gibs-wms', product, dateISO, `${width}x${height}`);
  const url = buildGibsWmsUrl(product, dateISO, profile, transparent);

  const { data: blob, source } = await getOrFetchCached<Blob>(cacheKey, async () => {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`NASA GIBS HTTP ${response.status} for ${product} on ${dateISO}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('xml') || contentType.includes('html')) {
      throw new Error(`NASA GIBS returned service exception XML for ${product} on ${dateISO}`);
    }
    return await response.blob();
  });

  const bitmap = await createImageBitmap(blob);

  if (product === 'MODIS_Terra_CorrectedReflectance_TrueColor' && !transparent) {
    const pbr = processModisTrueColorPbrMaps(bitmap, width, height);

    const texture = new THREE.CanvasTexture(pbr.colorCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;

    const roughnessMap = new THREE.CanvasTexture(pbr.roughnessCanvas);
    roughnessMap.needsUpdate = true;

    const bumpMap = new THREE.CanvasTexture(pbr.bumpCanvas);
    bumpMap.needsUpdate = true;

    return { texture, roughnessMap, bumpMap, cacheSource: source };
  }

  const texture = new THREE.CanvasTexture(bitmap as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return { texture, cacheSource: source };
}