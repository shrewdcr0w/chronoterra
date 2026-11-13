export interface CratonPolygon {
  id: string;
  name: string;
  /** Closed ring of [longitude, latitude] vertices in degrees (-180..180, -90..90) */
  coordinates: Array<[number, number]>;
}

export interface PaleoClimateParameters {
  globalMeanTempC: number;
  polarIceCapLatThreshold: number; // >90 means ice-free poles (hothouse)
  aridBeltLatRange: [number, number];
  tropicalBeltHalfWidthDeg: number;
  vascularFloraMaturity: 'early-coastal' | 'gymnosperm-fern' | 'angiosperm-modern';
  biomeSummary: string;
}

export interface DeepTimeSlice {
  ma: number; // Millions of years before present (stored directly in PlanetaryState.timestamp)
  id: string;
  name: string;
  era: 'Cenozoic' | 'Mesozoic' | 'Paleozoic';
  period: string;
  continentalModel: string;
  seaLevelMeters: number;
  uncertaintyNote: string;
  paleoClimate: PaleoClimateParameters;
  cratons: CratonPolygon[];
}

export const DEEP_TIME_SLICES: DeepTimeSlice[] = [
  {
    ma: 14,
    id: 'paleomap-14ma-miocene',
    name: 'Middle Miocene Climatic Optimum',
    era: 'Cenozoic',
    period: 'Neogene (Langhian, 14 Ma)',
    continentalModel: 'Scotese-PALEOMAP-GPlates-14Ma',
    seaLevelMeters: 45,
    uncertaintyNote:
      'Constrained by marine magnetic anomalies and hotspot tracks (±1–2° positional uncertainty). Central American Seaway and Paratethys remain partially open.',
    paleoClimate: {
      globalMeanTempC: 18.4,
      polarIceCapLatThreshold: 74,
      aridBeltLatRange: [18, 34],
      tropicalBeltHalfWidthDeg: 24,
      vascularFloraMaturity: 'angiosperm-modern',
      biomeSummary: 'Expanding C4 grasslands, warm-temperate boreal forests, and East Antarctic ice sheet.',
    },
    cratons: [
      {
        id: 'north-america-14ma',
        name: 'North America (Neogene)',
        coordinates: [[-162, 68], [-62, 65], [-74, 22], [-95, 14], [-118, 32], [-162, 68]],
      },
      {
        id: 'south-america-14ma',
        name: 'South America (Isolated Island Continent)',
        coordinates: [[-78, 9], [-36, -6], [-48, -38], [-68, -54], [-76, -18], [-78, 9]],
      },
      {
        id: 'eurasia-14ma',
        name: 'Eurasia & Paratethys Margin',
        coordinates: [[-8, 38], [28, 70], [145, 66], [135, 22], [95, 18], [45, 28], [-8, 38]],
      },
      {
        id: 'africa-arabia-14ma',
        name: 'Africa–Arabia (Closing Tethys)',
        coordinates: [[-16, 33], [48, 26], [50, 8], [36, -34], [16, -34], [-16, 12], [-16, 33]],
      },
      {
        id: 'india-14ma',
        name: 'Greater India (Himalayan Orageny)',
        coordinates: [[68, 28], [90, 27], [80, 6], [68, 28]],
      },
      {
        id: 'australia-14ma',
        name: 'Australia (Drifting Northward)',
        coordinates: [[113, -18], [151, -19], [148, -42], [114, -38], [113, -18]],
      },
      {
        id: 'antarctica-14ma',
        name: 'Antarctica',
        coordinates: [[-180, -66], [180, -66], [180, -89], [-180, -89], [-180, -66]],
      },
    ],
  },

  {
    ma: 66,
    id: 'paleomap-66ma-kpg',
    name: 'Cretaceous–Paleogene (K–Pg) Boundary',
    era: 'Mesozoic',
    period: 'Late Cretaceous (Maastrichtian, 66 Ma)',
    continentalModel: 'Scotese-PALEOMAP-GPlates-66Ma',
    seaLevelMeters: 170,
    uncertaintyNote:
      'High eustatic sea level (+170m) floods continental interiors (Western Interior Seaway, Trans-Saharan Seaway). Constrained by Atlantic/Indian seafloor spreading isochrons (±2–4°).',
    paleoClimate: {
      globalMeanTempC: 21.5,
      polarIceCapLatThreshold: 95, // Ice-free poles
      aridBeltLatRange: [20, 32],
      tropicalBeltHalfWidthDeg: 30,
      vascularFloraMaturity: 'angiosperm-modern',
      biomeSummary: 'Hothouse greenhouse climate; polar deciduous conifer/angiosperm forests up to 80° N/S, zero permanent polar ice.',
    },
    cratons: [
      {
        id: 'laramidia-66ma',
        name: 'Laramidia (Western North America)',
        coordinates: [[-150, 66], [-105, 62], [-98, 24], [-120, 34], [-150, 66]],
      },
      {
        id: 'appalachia-66ma',
        name: 'Appalachia (Eastern North America)',
        coordinates: [[-88, 58], [-58, 54], [-72, 28], [-86, 30], [-88, 58]],
      },
      {
        id: 'south-america-66ma',
        name: 'South America (Narrow South Atlantic)',
        coordinates: [[-68, 6], [-32, -8], [-42, -46], [-64, -52], [-68, 6]],
      },
      {
        id: 'africa-66ma',
        name: 'Africa (Divided by Trans-Saharan Seaway)',
        coordinates: [[-10, 26], [38, 22], [44, -28], [14, -32], [-10, 4], [-10, 26]],
      },
      {
        id: 'india-madagascar-66ma',
        name: 'Insular India & Deccan Traps (Mid-Tethys Transit)',
        coordinates: [[54, -4], [74, -6], [66, -28], [52, -24], [54, -4]],
      },
      {
        id: 'eurasia-66ma',
        name: 'Eurasia & European Archipelago',
        coordinates: [[12, 46], [45, 68], [142, 64], [128, 20], [82, 26], [12, 46]],
      },
      {
        id: 'australia-antarctica-66ma',
        name: 'East Gondwana (Antarctica–Australia Joined)',
        coordinates: [[-175, -62], [155, -42], [110, -48], [20, -68], [-175, -62]],
      },
    ],
  },

  {
    ma: 150,
    id: 'paleomap-150ma-jurassic',
    name: 'Late Jurassic Breakup of Pangea',
    era: 'Mesozoic',
    period: 'Late Jurassic (Tithonian, 150 Ma)',
    continentalModel: 'Scotese-PALEOMAP-GPlates-150Ma',
    seaLevelMeters: 120,
    uncertaintyNote:
      'Oldest preserved oceanic crust in situ (~170 Ma); longitudinal positions combine marine magnetic anomalies with apparent polar wander paths (±4–6°).',
    paleoClimate: {
      globalMeanTempC: 20.2,
      polarIceCapLatThreshold: 95,
      aridBeltLatRange: [16, 36],
      tropicalBeltHalfWidthDeg: 28,
      vascularFloraMaturity: 'gymnosperm-fern',
      biomeSummary: 'Conifer, cycad, ginkgo, and tree-fern savannas; no flowering plants (angiosperms) yet widespread.',
    },
    cratons: [
      {
        id: 'laurasia-west-150ma',
        name: 'Laurasia (North America–Greenland Block)',
        coordinates: [[-115, 58], [-38, 56], [-48, 18], [-95, 16], [-115, 58]],
      },
      {
        id: 'laurasia-east-150ma',
        name: 'Eurasian Block & Turgai Seaway',
        coordinates: [[10, 42], [55, 66], [132, 54], [116, 18], [52, 26], [10, 42]],
      },
      {
        id: 'west-gondwana-150ma',
        name: 'West Gondwana (South America–Africa Joined)',
        coordinates: [[-52, 12], [28, 18], [38, -32], [-18, -48], [-54, -36], [-52, 12]],
      },
      {
        id: 'east-gondwana-150ma',
        name: 'East Gondwana (India–Madagascar–Antarctica–Australia)',
        coordinates: [[36, -16], [118, -28], [135, -66], [25, -72], [36, -16]],
      },
    ],
  },

  {
    ma: 250,
    id: 'paleomap-250ma-pangea',
    name: 'Permian–Triassic Boundary (Supercontinent Pangea)',
    era: 'Mesozoic',
    period: 'Early Triassic / End-Permian (250 Ma)',
    continentalModel: 'Scotese-PALEOMAP-GPlates-250Ma',
    seaLevelMeters: -20,
    uncertaintyNote:
      'Pre-seafloor-spreading epoch: paleolatitude is well-constrained by paleomagnetism, while absolute paleolongitude carries ±8–12° uncertainty relative to the mantle reference frame.',
    paleoClimate: {
      globalMeanTempC: 22.8,
      polarIceCapLatThreshold: 95,
      aridBeltLatRange: [8, 42],
      tropicalBeltHalfWidthDeg: 14,
      vascularFloraMaturity: 'gymnosperm-fern',
      biomeSummary: 'Extreme megamonsoon and hyper-arid Pangean interior red-beds following the End-Permian Siberian Traps extinction.',
    },
    cratons: [
      {
        id: 'pangea-core-250ma',
        name: 'Supercontinent Pangea (Pole-to-Pole Assembly)',
        coordinates: [
          [-45, 52],
          [35, 68],
          [75, 48],
          [38, 12],
          [68, -22],
          [85, -58],
          [15, -75],
          [-55, -48],
          [-62, -8],
          [-38, 18],
          [-45, 52],
        ],
      },
      {
        id: 'north-china-250ma',
        name: 'North & South China Terranes (Paleo-Tethys Margin)',
        coordinates: [[88, 24], [116, 28], [118, 4], [92, 2], [88, 24]],
      },
    ],
  },

  {
    ma: 400,
    id: 'paleomap-400ma-devonian',
    name: 'Early Devonian (Gondwana & Laurussia)',
    era: 'Paleozoic',
    period: 'Early Devonian (Emsian, 400 Ma)',
    continentalModel: 'Scotese-PALEOMAP-GPlates-400Ma',
    seaLevelMeters: 90,
    uncertaintyNote:
      'Deep Paleozoic reconstruction: derived from paleomagnetic poles, biogeographic provincials, and lithologic climate indicators (evaporites, coals, tillites). High longitudinal uncertainty (±15°).',
    paleoClimate: {
      globalMeanTempC: 19.5,
      polarIceCapLatThreshold: 82,
      aridBeltLatRange: [15, 35],
      tropicalBeltHalfWidthDeg: 22,
      vascularFloraMaturity: 'early-coastal',
      biomeSummary: 'Early vascular land flora (Rhynie chert lycopsids & trimerophytes) restricted to coastal/riparian marshes; barren continental interiors.',
    },
    cratons: [
      {
        id: 'laurussia-400ma',
        name: 'Laurussia / Old Red Sandstone Continent (Euramerica)',
        coordinates: [[-58, 15], [15, 22], [24, -14], [-48, -22], [-58, 15]],
      },
      {
        id: 'siberia-400ma',
        name: 'Siberian Craton (Northern Hemisphere)',
        coordinates: [[42, 44], [88, 48], [92, 18], [46, 16], [42, 44]],
      },
      {
        id: 'gondwana-400ma',
        name: 'Supercontinent Gondwana (Southern Hemisphere)',
        coordinates: [
          [-75, -28],
          [85, -18],
          [135, -35],
          [115, -78],
          [-85, -84],
          [-75, -28],
        ],
      },
    ],
  },
];

export function getDeepTimeSliceByMa(ma: number): DeepTimeSlice {
  const exact = DEEP_TIME_SLICES.find((s) => s.ma === ma);
  if (exact) return exact;
  // Snap to nearest valid discrete time slice — never interpolate between slices
  return DEEP_TIME_SLICES.reduce((prev, curr) =>
    Math.abs(curr.ma - ma) < Math.abs(prev.ma - ma) ? curr : prev
  );
}