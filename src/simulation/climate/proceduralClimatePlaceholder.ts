import * as THREE from 'three';

/**
 * Generates an analytical seasonal/latitudinal thermal band texture that shifts with day-of-year.
 * Explicitly classified as HYPOTHETICAL (procedural placeholder for Phase 6 ERA5/GISTEMP NetCDF reanalysis).
 */
export function generateProceduralClimateTexture(dateISO: string): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const dateObj = new Date(`${dateISO}T00:00:00Z`);
  const startOfYear = new Date(Date.UTC(dateObj.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((dateObj.getTime() - startOfYear.getTime()) / 86_400_000);

  // Approximate solar declination in degrees (-23.44 to +23.44)
  const declinationDeg = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const effectiveThermalLat = Math.abs(lat - declinationDeg);
    const normalizedWarmth = Math.max(0, Math.min(1, 1 - effectiveThermalLat / 105));

    // Map warmth to semi-transparent scientific diverges: polar blue -> temperate cyan -> equatorial orange/red
    const r = Math.round(normalizedWarmth * 255);
    const g = Math.round(Math.sin(normalizedWarmth * Math.PI) * 180);
    const b = Math.round((1 - normalizedWarmth) * 255);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.36)`;
    ctx.fillRect(0, y, width, 1);
  }

  // Draw thermal equator indicator line
  const eqY = Math.round(((90 - declinationDeg) / 180) * height);
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(width, eqY);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}