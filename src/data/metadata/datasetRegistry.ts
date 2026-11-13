import { ScenarioType } from '../../types/planetaryState';

export interface DatasetMetadata {
  id: string;
  title: string;
  shortLabel: string;
  category:
    | 'imagery'
    | 'thermal'
    | 'events'
    | 'climate'
    | 'paleogeography'
    | 'paleobiome'
    | 'orbital'
    | 'fallback';
  epistemicClass: ScenarioType;
  provider: string;
  license: string;
  temporalCoverage: {
    startISO: string;
    endISO: string | 'present';
    cadence: 'daily' | 'near-real-time' | 'discrete-geological-slices' | 'static-procedural' | 'hourly-gp-elements';
  };
  spatialResolution: string;
  endpointTemplate: string;
  citationUrl: string;
  notes: string;
}

export const HISTORICAL_MIN_ISO = '2000-03-01';
export const HISTORICAL_MIN_EPOCH_MS = Date.parse('2000-03-01T00:00:00.000Z');
export const ONE_DAY_MS = 86_400_000;

export const DATASET_REGISTRY: Record<string, DatasetMetadata> = {
  'gibs-modis-terra-truecolor': {
    id: 'gibs-modis-terra-truecolor',
    title: 'MODIS Terra Corrected Reflectance (True Color)',
    shortLabel: 'NASA GIBS True Color (MODIS Terra)',
    category: 'imagery',
    epistemicClass: 'observed',
    provider: 'NASA EOSDIS Global Imagery Browse Services (GIBS)',
    license: 'Public Domain (17 U.S.C. § 105 / NASA Open Data Policy)',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'daily',
    },
    spatialResolution: '250m native (downsampled to preset equirectangular WMS)',
    endpointTemplate:
      'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&TIME={YYYY-MM-DD}',
    citationUrl: 'https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs',
    notes: 'Daily satellite reflectance composite.',
  },

  'gibs-modis-terra-lst-day': {
    id: 'gibs-modis-terra-lst-day',
    title: 'MODIS Terra Land Surface Temperature (Day, L3 Global 1km SIN Grid)',
    shortLabel: 'NASA GIBS Land Surface Temp (Day)',
    category: 'thermal',
    epistemicClass: 'observed',
    provider: 'NASA LP DAAC / EOSDIS GIBS (MOD11C1)',
    license: 'Public Domain (17 U.S.C. § 105 / NASA Open Data Policy)',
    temporalCoverage: {
      startISO: '2000-03-05',
      endISO: 'present',
      cadence: 'daily',
    },
    spatialResolution: '1km native (WMS EPSG:4326 transparent overlay)',
    endpointTemplate:
      'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=MODIS_Terra_Land_Surface_Temp_Day&TIME={YYYY-MM-DD}',
    citationUrl: 'https://lpdaac.usgs.gov/products/mod11c1v061/',
    notes: 'Radiometric skin temperature of land surfaces retrieved from thermal IR bands 31 and 32.',
  },

  'nasa-eonet-v3-events': {
    id: 'nasa-eonet-v3-events',
    title: 'Earth Observatory Natural Event Tracker (EONET v3)',
    shortLabel: 'NASA EONET Natural Events',
    category: 'events',
    epistemicClass: 'observed',
    provider: 'NASA Goddard Space Flight Center (EONET)',
    license: 'Public Domain (17 U.S.C. § 105)',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'near-real-time',
    },
    spatialResolution: 'Point & polygon event telemetry',
    endpointTemplate: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&start={START}&end={END}',
    citationUrl: 'https://eonet.gsfc.nasa.gov/docs/v3',
    notes: 'Curated active and historical natural hazards.',
  },

  'celestrak-gp-omm-json': {
    id: 'celestrak-gp-omm-json',
    title: 'CelesTrak General Perturbations (GP) Orbit Mean-Elements Message (OMM JSON)',
    shortLabel: 'CelesTrak GP OMM-JSON (SGP4/SDP4)',
    category: 'orbital',
    epistemicClass: 'observed',
    provider: 'CelesTrak / 18th Space Defense Squadron (18 SDS)',
    license: 'Public Domain / CelesTrak Open Data Policy (Free Use with Attribution)',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'hourly-gp-elements',
    },
    spatialResolution: 'SGP4/SDP4 analytical state vectors (km ECI/ECF)',
    endpointTemplate: 'https://celestrak.org/NORAD/elements/gp.php?GROUP={GROUP}&FORMAT=json',
    citationUrl: 'https://celestrak.org/NORAD/documentation/gp-data-formats.php',
    notes:
      'Fetched explicitly with FORMAT=json as CCSDS OMM objects to support 6-digit+ NORAD catalog numbers (>99999) following mid-2026 5-digit TLE exhaustion.',
  },

  'scotese-gplates-paleomap-v3': {
    id: 'scotese-gplates-paleomap-v3',
    title: 'PALEOMAP & GPlates Reconstructed Continental Coastlines & Cratons',
    shortLabel: 'PALEOMAP / GPlates Continents',
    category: 'paleogeography',
    epistemicClass: 'reconstructed',
    provider: 'Scotese PALEOMAP Project / EarthByte GPlates Web Service',
    license: 'CC-BY-4.0 (GPlates / EarthByte Open Data & PALEOMAP Academic Citation)',
    temporalCoverage: {
      startISO: '400 Ma',
      endISO: '14 Ma',
      cadence: 'discrete-geological-slices',
    },
    spatialResolution: '1°x1° paleocontinental plate polygons & 3D coastline vectors',
    endpointTemplate: 'https://gws.gplates.org/reconstruct/coastlines/?time={MA}&model=PALEOMAP',
    citationUrl: 'https://www.earthbyte.org/paleodem-resource-scotese-and-wright-2018/',
    notes: 'RECONSTRUCTED from marine magnetic isochrons and paleomagnetic apparent polar wander paths.',
  },

  'paleobiome-climate-belt-procedural-v1': {
    id: 'paleobiome-climate-belt-procedural-v1',
    title: 'Rule-Based Paleobiome & Ancient Flora Zonal Reconstruction',
    shortLabel: 'Ancient Flora & Biome Belts (Procedural)',
    category: 'paleobiome',
    epistemicClass: 'hypothetical',
    provider: 'Chronoterra Paleoclimate Belt Engine (Parameterized from Scotese 2021)',
    license: 'MIT License (Internal Code)',
    temporalCoverage: {
      startISO: '400 Ma',
      endISO: '14 Ma',
      cadence: 'discrete-geological-slices',
    },
    spatialResolution: '1024x512 land-masked equirectangular canvas',
    endpointTemplate: 'internal://paleo-vegetation-generator',
    citationUrl: 'docs/scientific-sources.md',
    notes: 'HYPOTHETICAL procedural biome distribution computed from epoch paleolatitude.',
  },

  'procedural-zonal-climate-placeholder-v1': {
    id: 'procedural-zonal-climate-placeholder-v1',
    title: 'Procedural Zonal & Seasonal Thermal Anomaly Placeholder',
    shortLabel: 'Procedural Climate Anomaly (Placeholder)',
    category: 'climate',
    epistemicClass: 'hypothetical',
    provider: 'Chronoterra Internal Procedural Generator',
    license: 'MIT License (Internal Code)',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'static-procedural',
    },
    spatialResolution: '512x256 equirectangular canvas',
    endpointTemplate: 'internal://procedural-climate-canvas',
    citationUrl: 'docs/development-roadmap.md',
    notes: 'PLACEHOLDER: Analytical latitudinal + solar-declination heatmap.',
  },

  'smithsonian-gvp-historical-volcanoes': {
    id: 'smithsonian-gvp-historical-volcanoes',
    title: 'Smithsonian Institution Global Volcanism Program (Holocene & Historical Eruptions)',
    shortLabel: 'Smithsonian GVP Eruption Catalog',
    category: 'events',
    epistemicClass: 'observed',
    provider: 'Smithsonian Institution National Museum of Natural History (GVP)',
    license: 'CC-BY-4.0 (Global Volcanism Program Volcanoes of the World v5.2)',
    temporalCoverage: {
      startISO: '1815-04-10',
      endISO: 'present',
      cadence: 'discrete-geological-slices',
    },
    spatialResolution: 'Vent coordinates & Volcanic Explosivity Index (VEI)',
    endpointTemplate: 'internal://curated-catastrophe-events',
    citationUrl: 'https://volcano.si.edu/',
    notes:
      'Observed and reconstructed eruption coordinates, dates, and VEI magnitudes (Hunga Tonga 2022, Pinatubo 1991, Tambora 1815).',
  },

  'earth-impact-database-passc': {
    id: 'earth-impact-database-passc',
    title: 'Earth Impact Database (PASSC) & NASA CNEOS Bolide Catalog',
    shortLabel: 'PASSC Impact & CNEOS Bolide Catalog',
    category: 'events',
    epistemicClass: 'reconstructed',
    provider: 'Planetary and Space Science Centre (UNB) / NASA CNEOS',
    license: 'Academic Open Access / Public Domain (NASA CNEOS)',
    temporalCoverage: {
      startISO: '66 Ma',
      endISO: 'present',
      cadence: 'discrete-geological-slices',
    },
    spatialResolution: 'Crater / airburst coordinates & kinetic energy estimates',
    endpointTemplate: 'internal://curated-catastrophe-events',
    citationUrl: 'https://cneos.jpl.nasa.gov/fireballs/',
    notes:
      'Confirmed terrestrial impact structures (Chicxulub 66 Ma) and instrumental superbolide airbursts (Chelyabinsk 2013).',
  },

  'chronoterra-event-decay-regrowth-model-v1': {
    id: 'chronoterra-event-decay-regrowth-model-v1',
    title: 'Simplified Analytical Catastrophe Blast, Ash & Vegetation Recovery Model',
    shortLabel: 'Simplified Event & Flora Recovery Model',
    category: 'paleobiome',
    epistemicClass: 'hypothetical',
    provider: 'Chronoterra Analytical Catastrophe Engine',
    license: 'MIT License (Internal Code)',
    temporalCoverage: {
      startISO: '400 Ma',
      endISO: 'present',
      cadence: 'static-procedural',
    },
    spatialResolution: '1024x512 equirectangular radial & zonal parameterization',
    endpointTemplate: 'internal://event-simulation-model',
    citationUrl: 'docs/simulation-models.md',
    notes:
      'HYPOTHETICAL simplified analytical model for shockwave rings, zonal ash dispersion, and exponential vegetation decay/regrowth. Explicitly NOT a physics/GCM simulator.',
  },

  'astronomy-engine-ephemeris': {
    id: 'astronomy-engine-ephemeris',
    title: 'VSOP87 / ELP2000 Solar System & Lunar Ephemeris (astronomy-engine)',
    shortLabel: 'VSOP87 Solar System Ephemeris',
    category: 'orbital',
    epistemicClass: 'observed',
    provider: 'astronomy-engine (Don Cross / NASA JPL & IAU WGCCRE)',
    license: 'MIT License',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'near-real-time',
    },
    spatialResolution: 'Sub-arcsecond J2000 heliocentric & geocentric state vectors',
    endpointTemplate: 'internal://astronomy-engine-vsop87',
    citationUrl: 'https://github.com/cosinekitty/astronomy',
    notes:
      'Real astronomical positions, lunar phase illumination, and IAU rotational axes computed at PlanetaryState.timestamp.',
  },
  
  'ipcc-ar6-cmip6-ssp-projections': {
    id: 'ipcc-ar6-cmip6-ssp-projections',
    title: 'IPCC AR6 WGI CMIP6 Multi-Model Projections (SSP1-2.6, SSP2-4.5, SSP5-8.5)',
    shortLabel: 'IPCC AR6 WGI SSP Projections',
    category: 'climate',
    epistemicClass: 'projected',
    provider: 'Intergovernmental Panel on Climate Change (IPCC AR6 WGI / CMIP6)',
    license: 'CC-BY-4.0 (IPCC Sixth Assessment Report Open Data)',
    temporalCoverage: {
      startISO: '2050-01-01',
      endISO: '2200-12-31',
      cadence: 'discrete-geological-slices',
    },
    spatialResolution: 'Global & zonal surface warming (Table SPM.1) + GMSL rise (Ch. 9 Table 9.9)',
    endpointTemplate: 'internal://ipcc-ar6-cmip6-ssp-table',
    citationUrl: 'https://www.ipcc.ch/report/ar6/wg1/',
    notes:
      'PROJECTED ensemble medians and likely ranges for 2050, 2100, and 2200 across SSP1-2.6, SSP2-4.5, and SSP5-8.5.',
  },

  'custom-hypothetical-future-sliders-v1': {
    id: 'custom-hypothetical-future-sliders-v1',
    title: 'User-Defined Hypothetical Future Warming & Sea-Level Scenario',
    shortLabel: 'Custom Future Sliders (Hypothetical)',
    category: 'climate',
    epistemicClass: 'hypothetical',
    provider: 'Chronoterra Interactive User Sandbox',
    license: 'MIT License (Internal Code)',
    temporalCoverage: {
      startISO: '2050-01-01',
      endISO: '2200-12-31',
      cadence: 'static-procedural',
    },
    spatialResolution: '1024x512 equirectangular parameterized biome & coastal shelf canvas',
    endpointTemplate: 'internal://custom-future-sliders',
    citationUrl: 'docs/simulation-models.md',
    notes:
      'HYPOTHETICAL user-controlled ΔT warming and sea-level rise sliders. Explicitly not a published IPCC projection.',
  },

  'procedural-fallback-v1': {
    id: 'procedural-fallback-v1',
    title: 'Procedural Land/Ocean & Graticule Canvas',
    shortLabel: 'Procedural Base Map (Fallback)',
    category: 'fallback',
    epistemicClass: 'hypothetical',
    provider: 'Chronoterra Internal Procedural Generator',
    license: 'MIT License (Internal Code)',
    temporalCoverage: {
      startISO: '2000-03-01',
      endISO: 'present',
      cadence: 'static-procedural',
    },
    spatialResolution: '1024x512 equirectangular canvas',
    endpointTemplate: 'internal://procedural-earth-canvas',
    citationUrl: 'docs/attributions.md',
    notes: 'Offline fallback when NASA GIBS is unreachable.',
  },
};

export function toISODateString(epochMs: number): string {
  const clamped = Math.max(HISTORICAL_MIN_EPOCH_MS, epochMs);
  return new Date(clamped).toISOString().slice(0, 10);
}