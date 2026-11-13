import * as THREE from 'three';
import { CratonPolygon, DeepTimeSlice } from '../../simulation/time/deepTimeSlices';
import { buildCacheKey, getOrFetchCached } from './cacheManager';

export interface PaleoSurfaceBundle {
  surfaceTexture: THREE.CanvasTexture;
  roughnessTexture: THREE.CanvasTexture;
  polygons: CratonPolygon[];
  sourceOrigin: 'gplates-remote-or-local' | 'builtin-paleomap-cratons';
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { NAME?: string; PLATEID1?: string | number };
    geometry?: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
  }>;
}

function lonLatToUv(lon: number, lat: number, width: number, height: number): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

/**
 * Loads optional local GeoJSON or GPlates Web Service coastline reconstruction,
 * falling back cleanly to the slice's built-in PALEOMAP craton polygons.
 */
export async function loadPaleoPolygonsForSlice(
  slice: DeepTimeSlice
): Promise<{ polygons: CratonPolygon[]; origin: 'gplates-remote-or-local' | 'builtin-paleomap-cratons' }> {
  const cacheKey = buildCacheKey('paleomap', slice.id, `${slice.ma}Ma`, 'polygons');

  try {
    const { data } = await getOrFetchCached<CratonPolygon[]>(cacheKey, async () => {
      const localUrl = `${import.meta.env.BASE_URL}datasets/paleomap/slice_${slice.ma}ma.json`;
      const res = await fetch(localUrl);
      if (!res.ok) {
        throw new Error(`No local GeoJSON at ${localUrl}`);
      }
      const geojson = (await res.json()) as GeoJsonFeatureCollection;
      const extracted: CratonPolygon[] = [];

      geojson.features.forEach((feat, idx) => {
        if (!feat.geometry) return;
        const name = feat.properties?.NAME || `Plate-${idx}`;
        if (feat.geometry.type === 'Polygon') {
          const ring = feat.geometry.coordinates[0] as Array<[number, number]>;
          if (ring && ring.length >= 3) {
            extracted.push({ id: `${slice.ma}-${idx}`, name, coordinates: ring });
          }
        } else if (feat.geometry.type === 'MultiPolygon') {
          (feat.geometry.coordinates as Array<Array<Array<[number, number]>>>).forEach((poly, pIdx) => {
            if (poly[0] && poly[0].length >= 3) {
              extracted.push({ id: `${slice.ma}-${idx}-${pIdx}`, name, coordinates: poly[0] });
            }
          });
        }
      });

      if (extracted.length === 0) throw new Error('Empty GeoJSON features');
      return extracted;
    });

    return { polygons: data, origin: 'gplates-remote-or-local' };
  } catch {
    return { polygons: slice.cratons, origin: 'builtin-paleomap-cratons' };
  }
}

/**
 * Generates a cartographically stylized paleogeographic surface texture with diagonal survey hatching
 * and eustatic continental shelf halos so RECONSTRUCTED continents look intentionally distinct from OBSERVED imagery.
 */
export function buildPaleoContinentalTextures(
  slice: DeepTimeSlice,
  polygons: CratonPolygon[]
): { surfaceTexture: THREE.CanvasTexture; roughnessTexture: THREE.CanvasTexture } {
  const width = 1024;
  const height = 512;

  const surfaceCanvas = document.createElement('canvas');
  surfaceCanvas.width = width;
  surfaceCanvas.height = height;
  const ctx = surfaceCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d')!;

  // 1. Deep Paleo-Ocean Abyssal Plain (Panthalassa / Tethys)
  ctx.fillStyle = '#091e36';
  ctx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#2b2b2b';
  roughCtx.fillRect(0, 0, width, height);

  // 2. Subtle paleolatitude survey grid (every 30 deg)
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.18)';
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = lonLatToUv(0, lat, width, height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Eustatic Continental Shelf Halo (wider when seaLevelMeters is high, e.g., +170m at 66 Ma)
  const shelfStrokePx = Math.max(4, Math.round(6 + slice.seaLevelMeters / 25));
  for (const craton of polygons) {
    ctx.beginPath();
    craton.coordinates.forEach(([lon, lat], idx) => {
      const [x, y] = lonLatToUv(lon, lat, width, height);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    // Shallow epicontinental sea / flooded shelf
    ctx.lineJoin = 'round';
    ctx.lineWidth = shelfStrokePx;
    ctx.strokeStyle = '#164e63';
    ctx.stroke();

    // Reconstructed Craton Interior Fill (warm geological survey parchment/ochre)
    ctx.fillStyle = '#6b5b45';
    ctx.fill();

    // Matte roughness on exposed craton land
    roughCtx.beginPath();
    craton.coordinates.forEach(([lon, lat], idx) => {
      const [x, y] = lonLatToUv(lon, lat, width, height);
      if (idx === 0) roughCtx.moveTo(x, y);
      else roughCtx.lineTo(x, y);
    });
    roughCtx.closePath();
    roughCtx.fillStyle = '#dedede';
    roughCtx.fill();
  }

  // 4. Cartographic Diagonal Hatch Pattern over Landmasses (Explicit visual cue for RECONSTRUCTED data)
  ctx.save();
  ctx.strokeStyle = 'rgba(233, 213, 255, 0.14)';
  ctx.lineWidth = 1;
  for (let i = -height; i < width + height; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Polar Glaciation Cap if slice has polar ice (e.g., 14 Ma Miocene & 400 Ma Southern Gondwana)
  if (slice.paleoClimate.polarIceCapLatThreshold <= 85) {
    const iceLat = slice.paleoClimate.polarIceCapLatThreshold;
    const [, northIceY] = lonLatToUv(0, iceLat, width, height);
    const [, southIceY] = lonLatToUv(0, -iceLat, width, height);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.fillRect(0, 0, width, northIceY);
    ctx.fillRect(0, southIceY, width, height - southIceY);
  }

  const surfaceTexture = new THREE.CanvasTexture(surfaceCanvas);
  surfaceTexture.colorSpace = THREE.SRGBColorSpace;
  surfaceTexture.needsUpdate = true;

  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.needsUpdate = true;

  return { surfaceTexture, roughnessTexture };
}