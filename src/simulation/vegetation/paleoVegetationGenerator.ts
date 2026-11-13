import * as THREE from 'three';
import { CratonPolygon, DeepTimeSlice } from '../time/deepTimeSlices';

/**
 * Generates a land-masked ancient vegetation & paleobiome overlay for the active deep-time slice.
 * Classified as HYPOTHETICAL (rule-based projection from published paleoclimate belt reconstructions).
 */
export function generatePaleoVegetationTexture(
  slice: DeepTimeSlice,
  polygons: CratonPolygon[]
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;

  // 1. Create a crisp land mask canvas from the reconstructed craton polygons
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d')!;

  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(0, 0, width, height);

  for (const craton of polygons) {
    maskCtx.beginPath();
    craton.coordinates.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (idx === 0) maskCtx.moveTo(x, y);
      else maskCtx.lineTo(x, y);
    });
    maskCtx.closePath();

    if (slice.paleoClimate.vascularFloraMaturity === 'early-coastal') {
      // At 400 Ma (Early Devonian), vascular flora is restricted to coastal/estuarine margins
      maskCtx.lineWidth = 14;
      maskCtx.strokeStyle = '#ffffff';
      maskCtx.stroke();
      maskCtx.fillStyle = '#555555'; // Barren continental interior regolith
      maskCtx.fill();
    } else {
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fill();
    }
  }

  // 2. Paint latitudinal paleobiome belts onto biomeCanvas
  const biomeCanvas = document.createElement('canvas');
  biomeCanvas.width = width;
  biomeCanvas.height = height;
  const biomeCtx = biomeCanvas.getContext('2d')!;

  const {
    polarIceCapLatThreshold,
    aridBeltLatRange,
    tropicalBeltHalfWidthDeg,
    vascularFloraMaturity,
  } = slice.paleoClimate;

  for (let y = 0; y < height; y++) {
    const absLat = Math.abs(90 - (y / height) * 180);
    let fill = 'rgba(21, 128, 61, 0.78)'; // Default warm-temperate forest

    if (absLat >= polarIceCapLatThreshold) {
      // Ice sheet / periglacial tundra
      fill = 'rgba(226, 232, 240, 0.85)';
    } else if (absLat <= tropicalBeltHalfWidthDeg) {
      // Equatorial coal swamps / tropical everwet rainforest
      fill =
        vascularFloraMaturity === 'early-coastal'
          ? 'rgba(101, 163, 13, 0.82)' // Early lycopsid/rhyniophyte marsh
          : 'rgba(6, 95, 70, 0.82)'; // Dense tropical canopy
    } else if (absLat >= aridBeltLatRange[0] && absLat <= aridBeltLatRange[1]) {
      // Subtropical high-pressure arid evaporite / red-bed desert belt (huge in 250 Ma Pangea)
      fill = 'rgba(180, 83, 9, 0.78)';
    } else if (absLat > aridBeltLatRange[1]) {
      // High-latitude greenhouse temperate forest (e.g. 66 Ma polar Metasequoia/Araucaria forests)
      fill = 'rgba(54, 83, 20, 0.76)';
    }

    biomeCtx.fillStyle = fill;
    biomeCtx.fillRect(0, y, width, 1);
  }

  // 3. Mask the biome belts strictly to reconstructed continental polygons
  biomeCtx.globalCompositeOperation = 'destination-in';
  biomeCtx.drawImage(maskCanvas, 0, 0);
  biomeCtx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(biomeCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}