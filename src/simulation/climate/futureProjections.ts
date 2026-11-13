import * as THREE from 'three';
import { ScenarioType } from '../../types/planetaryState';
import {
  CratonPolygon,
  DeepTimeSlice,
  PaleoClimateParameters,
} from '../time/deepTimeSlices';

export type FutureHorizonYear = 2050 | 2100 | 2200;

export type FuturePathwayId =
  | 'ssp1-26'
  | 'ssp2-45'
  | 'ssp5-85'
  | 'custom-hypothetical';

export const FUTURE_HORIZON_YEARS: FutureHorizonYear[] = [2050, 2100, 2200];

export function horizonYearToEpochMs(year: FutureHorizonYear): number {
  return Date.parse(`${year}-07-01T00:00:00.000Z`);
}

export function epochMsToNearestHorizonYear(epochMs: number): FutureHorizonYear {
  const year = new Date(epochMs).getUTCFullYear();
  if (year <= 2075) return 2050;
  if (year <= 2150) return 2100;
  return 2200;
}

export interface PublishedHorizonProjection {
  year: FutureHorizonYear;
  /** Global Mean Surface Temperature change (deg C) relative to 1850-1900 (IPCC AR6 WGI Table SPM.1 / Ch. 4) */
  warmingDeltaC: number;
  warmingLikelyRangeC: [number, number];
  /** Global Mean Sea Level rise (m) relative to 1995-2014 baseline (IPCC AR6 WGI Table 9.9) */
  seaLevelRiseMeters: number;
  seaLevelLikelyRangeMeters: [number, number];
  arcticSummerSeaIceFree: boolean;
}

export interface FuturePathwayDefinition {
  id: FuturePathwayId;
  shortCode: string;
  title: string;
  epistemicClass: ScenarioType;
  sourceId: string;
  citationSummary: string;
  description: string;
  horizons: Record<FutureHorizonYear, PublishedHorizonProjection>;
}

/**
 * Published IPCC AR6 Working Group I (2021) CMIP6 projections.
 * Every number traces directly to IPCC AR6 WGI Table SPM.1 and Chapter 9 (Fox-Kemper et al., 2021).
 */
export const FUTURE_PATHWAYS: Record<FuturePathwayId, FuturePathwayDefinition> = {
  'ssp1-26': {
    id: 'ssp1-26',
    shortCode: 'SSP1-2.6 (Low Emissions)',
    title: 'SSP1-2.6 — Sustainability ("Taking the Green Road")',
    epistemicClass: 'projected',
    sourceId: 'ipcc-ar6-cmip6-ssp-projections',
    citationSummary:
      'IPCC AR6 WGI (2021) Table SPM.1 & Ch. 9 Table 9.9 (2.6 W/m² radiative forcing in 2100; net-zero CO₂ after 2050).',
    description:
      'Strong mitigation pathway limiting multi-century warming below ~2.0°C with stabilized high-latitude ice sheets but continued slow millennial thermal-expansion sea-level commitment.',
    horizons: {
      2050: {
        year: 2050,
        warmingDeltaC: 1.7,
        warmingLikelyRangeC: [1.3, 2.2],
        seaLevelRiseMeters: 0.19,
        seaLevelLikelyRangeMeters: [0.15, 0.23],
        arcticSummerSeaIceFree: false,
      },
      2100: {
        year: 2100,
        warmingDeltaC: 1.8,
        warmingLikelyRangeC: [1.3, 2.4],
        seaLevelRiseMeters: 0.44,
        seaLevelLikelyRangeMeters: [0.32, 0.62],
        arcticSummerSeaIceFree: false,
      },
      2200: {
        year: 2200,
        warmingDeltaC: 1.8,
        warmingLikelyRangeC: [1.2, 2.5],
        seaLevelRiseMeters: 0.85,
        seaLevelLikelyRangeMeters: [0.56, 1.3],
        arcticSummerSeaIceFree: false,
      },
    },
  },

  'ssp2-45': {
    id: 'ssp2-45',
    shortCode: 'SSP2-4.5 (Intermediate)',
    title: 'SSP2-4.5 — Intermediate Emissions ("Middle of the Road")',
    epistemicClass: 'projected',
    sourceId: 'ipcc-ar6-cmip6-ssp-projections',
    citationSummary:
      'IPCC AR6 WGI (2021) Table SPM.1 & Ch. 9 Table 9.9 (4.5 W/m² radiative forcing in 2100).',
    description:
      'Intermediate emissions trajectory with CO₂ emissions hovering near current levels until mid-century before declining, driving poleward biome shifts and >1m sea-level rise by 2200.',
    horizons: {
      2050: {
        year: 2050,
        warmingDeltaC: 2.0,
        warmingLikelyRangeC: [1.6, 2.5],
        seaLevelRiseMeters: 0.21,
        seaLevelLikelyRangeMeters: [0.17, 0.26],
        arcticSummerSeaIceFree: true,
      },
      2100: {
        year: 2100,
        warmingDeltaC: 2.7,
        warmingLikelyRangeC: [2.1, 3.5],
        seaLevelRiseMeters: 0.56,
        seaLevelLikelyRangeMeters: [0.44, 0.76],
        arcticSummerSeaIceFree: true,
      },
      2200: {
        year: 2200,
        warmingDeltaC: 3.2,
        warmingLikelyRangeC: [2.3, 4.4],
        seaLevelRiseMeters: 1.35,
        seaLevelLikelyRangeMeters: [0.9, 2.1],
        arcticSummerSeaIceFree: true,
      },
    },
  },

  'ssp5-85': {
    id: 'ssp5-85',
    shortCode: 'SSP5-8.5 (High Emissions)',
    title: 'SSP5-8.5 — Very High GHG Emissions ("Fossil-Fueled Development")',
    epistemicClass: 'projected',
    sourceId: 'ipcc-ar6-cmip6-ssp-projections',
    citationSummary:
      'IPCC AR6 WGI (2021) Table SPM.1 & Ch. 9 Table 9.9 (8.5 W/m² radiative forcing in 2100).',
    description:
      'High-forcing baseline with rapid polar amplification, severe subtropical aridification, boreal forest dieback, and multi-meter sea-level rise through 2200.',
    horizons: {
      2050: {
        year: 2050,
        warmingDeltaC: 2.4,
        warmingLikelyRangeC: [1.9, 3.0],
        seaLevelRiseMeters: 0.24,
        seaLevelLikelyRangeMeters: [0.2, 0.3],
        arcticSummerSeaIceFree: true,
      },
      2100: {
        year: 2100,
        warmingDeltaC: 4.4,
        warmingLikelyRangeC: [3.3, 5.7],
        seaLevelRiseMeters: 0.77,
        seaLevelLikelyRangeMeters: [0.63, 1.01],
        arcticSummerSeaIceFree: true,
      },
      2200: {
        year: 2200,
        warmingDeltaC: 6.2,
        warmingLikelyRangeC: [4.2, 8.5],
        seaLevelRiseMeters: 2.3,
        seaLevelLikelyRangeMeters: [1.4, 3.8],
        arcticSummerSeaIceFree: true,
      },
    },
  },

  'custom-hypothetical': {
    id: 'custom-hypothetical',
    shortCode: 'Custom Sliders (Hypothetical)',
    title: 'User-Defined Hypothetical Warming & Ice-Melt Scenario',
    epistemicClass: 'hypothetical',
    sourceId: 'custom-hypothetical-future-sliders-v1',
    citationSummary:
      'USER-DEFINED HYPOTHETICAL SCENARIO — Not a published IPCC/CMIP6 projection.',
    description:
      'Interactive hypothetical sandbox controlled directly by user warming and sea-level sliders to explore extreme climate and coastal inundation sensitivities.',
    horizons: {
      2050: {
        year: 2050,
        warmingDeltaC: 3.5,
        warmingLikelyRangeC: [3.5, 3.5],
        seaLevelRiseMeters: 5.0,
        seaLevelLikelyRangeMeters: [5.0, 5.0],
        arcticSummerSeaIceFree: true,
      },
      2100: {
        year: 2100,
        warmingDeltaC: 5.0,
        warmingLikelyRangeC: [5.0, 5.0],
        seaLevelRiseMeters: 12.0,
        seaLevelLikelyRangeMeters: [12.0, 12.0],
        arcticSummerSeaIceFree: true,
      },
      2200: {
        year: 2200,
        warmingDeltaC: 7.5,
        warmingLikelyRangeC: [7.5, 7.5],
        seaLevelRiseMeters: 25.0,
        seaLevelLikelyRangeMeters: [25.0, 25.0],
        arcticSummerSeaIceFree: true,
      },
    },
  },
};

/**
 * Modern WGS84 continental craton outlines reused with Phase 4's biome and coastal inundation engines.
 */
export const PRESENT_WGS84_CRATONS: CratonPolygon[] = [
  {
    id: 'present-north-america',
    name: 'North America (Modern WGS84)',
    coordinates: [[-165, 70], [-60, 66], [-76, 25], [-97, 18], [-122, 34], [-165, 70]],
  },
  {
    id: 'present-south-america',
    name: 'South America (Modern WGS84)',
    coordinates: [[-78, 10], [-35, -6], [-48, -38], [-68, -55], [-76, -18], [-78, 10]],
  },
  {
    id: 'present-eurasia',
    name: 'Eurasia (Modern WGS84)',
    coordinates: [[-9, 38], [28, 71], [148, 66], [136, 22], [98, 14], [48, 28], [-9, 38]],
  },
  {
    id: 'present-africa',
    name: 'Africa (Modern WGS84)',
    coordinates: [[-17, 35], [51, 12], [40, -34], [18, -34], [-17, 14], [-17, 35]],
  },
  {
    id: 'present-australia',
    name: 'Australia (Modern WGS84)',
    coordinates: [[113, -14], [153, -18], [148, -39], [115, -34], [113, -14]],
  },
  {
    id: 'present-antarctica',
    name: 'Antarctica (Modern WGS84)',
    coordinates: [[-180, -68], [180, -68], [180, -89], [-180, -89], [-180, -68]],
  },
];

export interface EvaluatedFutureScenarioState {
  pathwayId: FuturePathwayId;
  horizonYear: FutureHorizonYear;
  epistemicClass: ScenarioType;
  sourceId: string;
  warmingDeltaC: number;
  globalMeanTempC: number;
  seaLevelRiseMeters: number;
  polarIceCapLatThreshold: number;
  aridBeltLatRange: [number, number];
  tropicalBeltHalfWidthDeg: number;
  syntheticSliceForBiomeReuse: DeepTimeSlice;
}

/**
 * Evaluates the active future climate state (either directly from published IPCC AR6 tables
 * or from explicit custom sliders when `pathwayId === 'custom-hypothetical'`) and adapts it
 * for Phase 4's biome, polar-ice, and coastal-shelf rendering pipeline.
 */
export function evaluateFutureScenarioState(
  pathwayId: FuturePathwayId,
  horizonYear: FutureHorizonYear,
  customWarmingDeltaC: number,
  customSeaLevelMeters: number
): EvaluatedFutureScenarioState {
  const pathway = FUTURE_PATHWAYS[pathwayId];
  const published = pathway.horizons[horizonYear];

  const isCustom = pathwayId === 'custom-hypothetical';
  const warmingDeltaC = isCustom
    ? Number(Math.max(0.5, Math.min(10.0, customWarmingDeltaC)).toFixed(2))
    : published.warmingDeltaC;

  const seaLevelRiseMeters = isCustom
    ? Number(Math.max(0, Math.min(65.0, customSeaLevelMeters)).toFixed(2))
    : published.seaLevelRiseMeters;

  // Pre-industrial baseline ~14.0°C
  const globalMeanTempC = Number((14.0 + warmingDeltaC).toFixed(2));

  // Polar ice sheet latitude threshold: retreats poleward from 68° baseline as warming increases
  const polarIceCapLatThreshold = Number(
    Math.min(95, Math.round(68 + warmingDeltaC * 3.8))
  );

  // Subtropical Hadley cell & arid belt expansion with warming
  const aridMinLat = Math.max(12, Math.round(19 - warmingDeltaC * 0.6));
  const aridMaxLat = Math.min(48, Math.round(31 + warmingDeltaC * 2.1));
  const aridBeltLatRange: [number, number] = [aridMinLat, aridMaxLat];

  // Tropical biome belt poleward shift
  const tropicalBeltHalfWidthDeg = Math.min(
    36,
    Math.round(23 + warmingDeltaC * 1.4)
  );

  const paleoClimate: PaleoClimateParameters = {
    globalMeanTempC,
    polarIceCapLatThreshold,
    aridBeltLatRange,
    tropicalBeltHalfWidthDeg,
    vascularFloraMaturity: 'angiosperm-modern',
    biomeSummary: `${pathway.shortCode} (${horizonYear} CE): ΔT +${warmingDeltaC}°C, GMSL +${seaLevelRiseMeters}m, subtropical arid zone ${aridMinLat}°–${aridMaxLat}°, polar ice threshold ${
      polarIceCapLatThreshold > 90 ? 'Ice-Free Summer Poles' : `${polarIceCapLatThreshold}°`
    }.`,
  };

  // Visual coastal inundation exaggeration factor so 0.44m–2.30m IPCC sea-level rise
  // and multi-meter custom scenarios visibly widen coastal inundation halos on the globe
  const effectiveVisualSeaLevelMeters = Math.round(seaLevelRiseMeters * 35);

  const syntheticSliceForBiomeReuse: DeepTimeSlice = {
    ma: 0,
    id: `future-${pathwayId}-${horizonYear}`,
    name: `${pathway.shortCode} (${horizonYear} CE)`,
    era: 'Cenozoic',
    period: `Anthropocene / Future Projection (${horizonYear} CE)`,
    continentalModel: 'present-wgs84',
    seaLevelMeters: effectiveVisualSeaLevelMeters,
    uncertaintyNote: pathway.citationSummary,
    paleoClimate,
    cratons: PRESENT_WGS84_CRATONS,
  };

  return {
    pathwayId,
    horizonYear,
    epistemicClass: pathway.epistemicClass,
    sourceId: pathway.sourceId,
    warmingDeltaC,
    globalMeanTempC,
    seaLevelRiseMeters,
    polarIceCapLatThreshold,
    aridBeltLatRange,
    tropicalBeltHalfWidthDeg,
    syntheticSliceForBiomeReuse,
  };
}

/**
 * Generates a surface warming anomaly texture (with Arctic/Antarctic polar amplification)
 * for the selected IPCC SSP pathway or custom hypothetical warming slider.
 */
export function generateFutureThermalAnomalyTexture(
  state: EvaluatedFutureScenarioState
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const absLat = Math.abs(lat);

    // Arctic polar amplification (~2.2x global mean warming above 60N)
    const polarAmplification =
      lat > 55
        ? 1.0 + ((lat - 55) / 35) * 1.25
        : absLat > 60
        ? 1.0 + ((absLat - 60) / 30) * 0.7
        : 1.0;

    const localWarmingC = state.warmingDeltaC * polarAmplification;
    const norm = Math.max(0, Math.min(1, localWarmingC / 9.0));

    // IPCC WGI style warming palette: amber -> orange -> deep crimson -> purple
    const r = Math.min(255, Math.round(180 + norm * 75));
    const g = Math.max(15, Math.round(165 - norm * 150));
    const b = norm > 0.7 ? Math.round((norm - 0.7) * 280) : 20;
    const alpha = Math.min(0.68, 0.16 + norm * 0.52);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(0, y, width, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}