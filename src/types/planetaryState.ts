import { z } from 'zod';

export type TimeScale = 'historical' | 'deep-time';
export type ScenarioType = 'observed' | 'reconstructed' | 'projected' | 'hypothetical';
export type GraphicsProfile = 'low' | 'balanced' | 'high' | 'ultra';

export interface PlanetaryState {
  id: string;
  version: number;
  label?: string;
  createdAt: number;
  timestamp: number;
  timeScale: TimeScale;
  geography: { continentalModel: string; seaLevel?: number; terrainDataset?: string };
  atmosphere: { temperatureDataset?: string; compositionDataset?: string; cloudDataset?: string };
  biosphere: { vegetationDataset?: string; biomeDataset?: string; biodiversityDataset?: string };
  orbitalState: { satelliteDataset?: string; planetaryEphemeris?: string; showSatellites: boolean };
  event?: { type: string; intensity: number; progress: number };
  scenario: { type: ScenarioType; sourceIds: string[] };
  camera: { lat: number; lon: number; distance: number; heading: number; pitch: number };
  graphicsProfile: GraphicsProfile;
  layers: Record<string, boolean>;
}

export const PlanetaryStateSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().optional(),
  createdAt: z.number(),
  timestamp: z.number(),
  timeScale: z.enum(['historical', 'deep-time']),
  geography: z.object({
    continentalModel: z.string(),
    seaLevel: z.number().optional(),
    terrainDataset: z.string().optional(),
  }),
  atmosphere: z.object({
    temperatureDataset: z.string().optional(),
    compositionDataset: z.string().optional(),
    cloudDataset: z.string().optional(),
  }),
  biosphere: z.object({
    vegetationDataset: z.string().optional(),
    biomeDataset: z.string().optional(),
    biodiversityDataset: z.string().optional(),
  }),
  orbitalState: z.object({
    satelliteDataset: z.string().optional(),
    planetaryEphemeris: z.string().optional(),
    showSatellites: z.boolean(),
  }),
  event: z
    .object({
      type: z.string(),
      intensity: z.number(),
      progress: z.number(),
    })
    .optional(),
  scenario: z.object({
    type: z.enum(['observed', 'reconstructed', 'projected', 'hypothetical']),
    sourceIds: z.array(z.string()),
  }),
  camera: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    distance: z.number().positive(),
    heading: z.number(),
    pitch: z.number(),
  }),
  graphicsProfile: z.enum(['low', 'balanced', 'high', 'ultra']),
  layers: z.record(z.string(), z.boolean()),
});

export interface GraphicsPresetConfig {
  dpr: [number, number];
  sphereSegments: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  fresnelSamples: number;
  maxSatellites: number;
  orbitLineSamples: number;
  cullBackfaceSatellites: boolean;
  description: string;
}

export const GRAPHICS_PRESETS: Record<GraphicsProfile, GraphicsPresetConfig> = {
  low: {
    dpr: [0.75, 1.0],
    sphereSegments: 32,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    fresnelSamples: 1,
    maxSatellites: 35,
    orbitLineSamples: 48,
    cullBackfaceSatellites: true,
    description: '0.75x-1.0x DPR, 32-seg sphere, max 35 sats + backface culling (Integrated GPU saver)',
  },
  balanced: {
    dpr: [1.0, 1.5],
    sphereSegments: 64,
    antialias: true,
    shadows: false,
    shadowMapSize: 1024,
    fresnelSamples: 2,
    maxSatellites: 120,
    orbitLineSamples: 72,
    cullBackfaceSatellites: false,
    description: '1.0x-1.5x DPR, 64-seg sphere, max 120 sats, MSAA on (Default)',
  },
  high: {
    dpr: [1.5, 2.0],
    sphereSegments: 96,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    fresnelSamples: 4,
    maxSatellites: 260,
    orbitLineSamples: 96,
    cullBackfaceSatellites: false,
    description: '1.5x-2.0x DPR, 96-seg sphere, max 260 sats, 2048px shadows',
  },
  ultra: {
    dpr: [2.0, 2.5],
    sphereSegments: 128,
    antialias: true,
    shadows: true,
    shadowMapSize: 4096,
    fresnelSamples: 8,
    maxSatellites: 500,
    orbitLineSamples: 144,
    cullBackfaceSatellites: false,
    description: '2.0x+ DPR, 128-seg sphere, max 500 sats, 4096px shadows',
  },
};

export function formatSimulatedTimestamp(timestamp: number, timeScale: TimeScale): string {
  if (timeScale === 'deep-time') {
    if (timestamp === 0) return '0.0 Ma (Present Geological Epoch)';
    return `${timestamp.toFixed(2)} Ma (${timestamp} Million Years Before Present)`;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Historical Timestamp';
  }
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}