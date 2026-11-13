import * as THREE from 'three';
import { CratonPolygon, DeepTimeSlice } from '../time/deepTimeSlices';
import { generatePaleoVegetationTexture } from './paleoVegetationGenerator';
import {
  computeLocalVegetationDamage,
  evaluateCatastropheModel,
  greatCircleAngularDistanceDeg,
} from '../catastrophes/eventSimulationModel';
import { CatastropheKind } from '../catastrophes/curatedEvents';

export interface ActiveEventDamageParams {
  kind: CatastropheKind;
  lat: number;
  lon: number;
  intensity: number;
  progress: number;
  recoveryHorizonYears: number;
}

/**
 * Paints the radial vegetation damage scar and pioneer succession ring onto an equirectangular
 * 1024x512 biome canvas, then masks it to land polygons so oceans are never tinted green/charcoal.
 */
function paintEventDamageAndRegrowthOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  eventParams: ActiveEventDamageParams
): void {
  const kinematics = evaluateCatastropheModel(
    eventParams.kind,
    eventParams.intensity,
    eventParams.progress,
    eventParams.recoveryHorizonYears
  );

  if (kinematics.progress <= 0) return;

  // Step through coarse 4x4 pixel blocks inside the bounding box of the event scar for fast CPU canvas updates
  const stepPx = 4;
  for (let py = 0; py < height; py += stepPx) {
    const lat = 90 - ((py + stepPx * 0.5) / height) * 180;
    if (Math.abs(lat - eventParams.lat) > kinematics.maxDamageRadiusDeg + 2) {
      continue;
    }

    for (let px = 0; px < width; px += stepPx) {
      const lon = ((px + stepPx * 0.5) / width) * 360 - 180;
      const psiDeg = greatCircleAngularDistanceDeg(
        eventParams.lat,
        eventParams.lon,
        lat,
        lon
      );

      if (psiDeg > kinematics.maxDamageRadiusDeg) continue;

      const { damageFraction, pioneerFraction } = computeLocalVegetationDamage(
        psiDeg,
        kinematics
      );

      if (damageFraction > 0.04) {
        // Scorched / defoliated ash-charcoal & oxidized regolith scar
        const r = Math.round(55 + damageFraction * 115);
        const g = Math.round(38 + (1 - damageFraction) * 30);
        const b = Math.round(24);
        const alpha = Math.min(0.92, 0.35 + damageFraction * 0.6);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(px, py, stepPx, stepPx);
      } else if (pioneerFraction > 0.06) {
        // Pioneer succession flora (bright lycopsid / fern-spike / early grassland green)
        const alpha = Math.min(0.85, pioneerFraction * 0.75);
        ctx.fillStyle = `rgba(132, 204, 22, ${alpha})`;
        ctx.fillRect(px, py, stepPx, stepPx);
      }
    }
  }
}

/**
 * Generates the Deep-Time vegetation texture with optional active event damage & recovery.
 */
export function generateDeepTimeVegetationWithEvent(
  slice: DeepTimeSlice,
  polygons: CratonPolygon[],
  eventParams: ActiveEventDamageParams | null
): THREE.CanvasTexture {
  const baseTex = generatePaleoVegetationTexture(slice, polygons);
  if (!eventParams || eventParams.progress <= 0) {
    return baseTex;
  }

  const baseCanvas = baseTex.image as HTMLCanvasElement;
  const width = baseCanvas.width;
  const height = baseCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d')!;

  // 1. Copy base paleobiome belts
  ctx.drawImage(baseCanvas, 0, 0);

  // 2. Overlay event damage scar & pioneer regrowth only where base land alpha > 0
  ctx.globalCompositeOperation = 'source-atop';
  paintEventDamageAndRegrowthOnCanvas(ctx, width, height, eventParams);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(outCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a Modern/Historical biosphere vegetation & event-scar overlay texture.
 */
export function generateHistoricalBiosphereWithEvent(
  eventParams: ActiveEventDamageParams | null
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Baseline zonal vegetation tint (tropical, temperate, boreal)
  for (let y = 0; y < height; y++) {
    const absLat = Math.abs(90 - (y / height) * 180);
    if (absLat < 23.5) {
      ctx.fillStyle = 'rgba(21, 128, 61, 0.32)';
    } else if (absLat < 35) {
      ctx.fillStyle = 'rgba(161, 98, 7, 0.18)';
    } else if (absLat < 66) {
      ctx.fillStyle = 'rgba(22, 101, 52, 0.28)';
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.15)';
    }
    ctx.fillRect(0, y, width, 1);
  }

  if (eventParams && eventParams.progress > 0) {
    paintEventDamageAndRegrowthOnCanvas(ctx, width, height, eventParams);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}