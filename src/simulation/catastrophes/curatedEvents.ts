import { ScenarioType, TimeScale } from '../../types/planetaryState';
import { EonetEventMarker } from '../../data/loaders/eonetLoader';

export type CatastropheKind = 'impact' | 'volcano' | 'wildfire';

export interface CatalogCatastropheEvent {
  id: string;
  title: string;
  kind: CatastropheKind;
  /** The epistemic classification of the underlying historical/geological record itself */
  recordEpistemicClass: ScenarioType;
  timeScale: TimeScale;
  /** Epoch ms if historical, or Ma (Millions of years ago) if deep-time */
  timestamp: number;
  dateDisplay: string;
  lat: number;
  lon: number;
  defaultIntensity: number; // 1.0 to 10.0 internal scale
  magnitudeLabel: string;
  recoveryHorizonYears: number;
  sourceId: string;
  citationSummary: string;
  description: string;
}

export const CURATED_CATASTROPHE_EVENTS: CatalogCatastropheEvent[] = [
  {
    id: 'historical-hunga-tonga-2022',
    title: '2022 Hunga Tonga–Hunga Haʻapai Submarine Eruption',
    kind: 'volcano',
    recordEpistemicClass: 'observed',
    timeScale: 'historical',
    timestamp: Date.parse('2022-01-15T04:14:45.000Z'),
    dateDisplay: '2022-01-15 UTC',
    lat: -20.536,
    lon: -175.382,
    defaultIntensity: 6.2,
    magnitudeLabel: 'VEI 5–6 (57 km mesospheric plume, Lamb wave)',
    recoveryHorizonYears: 12,
    sourceId: 'smithsonian-gvp-historical-volcanoes',
    citationSummary: 'Smithsonian GVP #243040; Proud et al. (2022), Science 378(6619).',
    description:
      'Phreatomagmatic eruption that injected ~146 Tg of water vapor into the stratosphere and generated global atmospheric Lamb waves.',
  },
  {
    id: 'historical-chelyabinsk-2013',
    title: '2013 Chelyabinsk Superbolide Airburst',
    kind: 'impact',
    recordEpistemicClass: 'observed',
    timeScale: 'historical',
    timestamp: Date.parse('2013-02-15T03:20:33.000Z'),
    dateDisplay: '2013-02-15 UTC',
    lat: 54.8,
    lon: 61.1,
    defaultIntensity: 2.8,
    magnitudeLabel: '~18m LL5 chondrite (~500 kt TNT airburst at 29.7 km)',
    recoveryHorizonYears: 2,
    sourceId: 'earth-impact-database-passc',
    citationSummary: 'NASA CNEOS / Brown et al. (2013), Nature 503, 238–241.',
    description:
      'Observed near-Earth asteroid airburst over the southern Urals producing a regional shockwave ring with minimal long-term biosphere scarring.',
  },
  {
    id: 'historical-pinatubo-1991',
    title: '1991 Mount Pinatubo Climatic Eruption',
    kind: 'volcano',
    recordEpistemicClass: 'observed',
    timeScale: 'historical',
    // Clamped to satellite-era floor when viewing GIBS, but preserves true metadata
    timestamp: Date.parse('2000-03-01T00:00:00.000Z'),
    dateDisplay: '1991-06-15 (Pre-MODIS Historical Record)',
    lat: 15.142,
    lon: 120.35,
    defaultIntensity: 7.0,
    magnitudeLabel: 'VEI 6 (~20 Mt SO₂, -0.5°C global stratospheric cooling)',
    recoveryHorizonYears: 25,
    sourceId: 'smithsonian-gvp-historical-volcanoes',
    citationSummary: 'Smithsonian GVP #273083; McCormick et al. (1995), Nature 373.',
    description:
      'Second-largest terrestrial eruption of the 20th century; buried surrounding Zambales forests in lahars and pyroclastic flows.',
  },
  {
    id: 'reconstructed-tambora-1815',
    title: '1815 Mount Tambora Super-Colossal Eruption',
    kind: 'volcano',
    recordEpistemicClass: 'reconstructed',
    timeScale: 'historical',
    timestamp: Date.parse('2000-03-01T00:00:00.000Z'),
    dateDisplay: '1815-04-10 (Reconstructed Historical Record)',
    lat: -8.247,
    lon: 117.991,
    defaultIntensity: 8.2,
    magnitudeLabel: 'VEI 7 (~160 km³ tephra, 1816 "Year Without a Summer")',
    recoveryHorizonYears: 65,
    sourceId: 'smithsonian-gvp-historical-volcanoes',
    citationSummary: 'Stothers (1984), Science 224; Oppenheimer (2003), Prog. Phys. Geog.',
    description:
      'Largest documented historical eruption of the Holocene; stripped Sumbawa Island of vegetation and triggered hemispheric crop failures.',
  },
  {
    id: 'reconstructed-chicxulub-66ma',
    title: '66 Ma Chicxulub K–Pg Boundary Impactor',
    kind: 'impact',
    recordEpistemicClass: 'reconstructed',
    timeScale: 'deep-time',
    timestamp: 66,
    dateDisplay: '66.04 Ma (Cretaceous–Paleogene Boundary)',
    lat: 21.4,
    lon: -89.52,
    defaultIntensity: 9.8,
    magnitudeLabel: '~10–12 km bolide (~180 km crater, ~10⁸ Mt TNT equivalent)',
    recoveryHorizonYears: 5000,
    sourceId: 'earth-impact-database-passc',
    citationSummary: 'Schulte et al. (2010), Science 327; Morgan et al. (2016), Science 354.',
    description:
      'End-Cretaceous impactor on the Yucatán carbonate platform causing global ejecta thermal pulse, impact winter, and the post-impact "fern spike".',
  },
  {
    id: 'reconstructed-siberian-traps-250ma',
    title: '250 Ma Siberian Traps Flood Basalt Province',
    kind: 'volcano',
    recordEpistemicClass: 'reconstructed',
    timeScale: 'deep-time',
    timestamp: 250,
    dateDisplay: '251.9 Ma (Permian–Triassic Boundary)',
    lat: 64.0,
    lon: 98.0,
    defaultIntensity: 10.0,
    magnitudeLabel: 'LIP (~4 × 10⁶ km³ basaltic lava & thermogenic CO₂/SO₂)',
    recoveryHorizonYears: 10000,
    sourceId: 'smithsonian-gvp-historical-volcanoes',
    citationSummary: 'Burgess, Bowring & Shen (2014), PNAS 111(9), 3316–3321.',
    description:
      'Continental flood-basalt emplacement across northern Pangea linked to the End-Permian mass extinction and prolonged terrestrial flora collapse.',
  },
];

/**
 * Converts a live NASA EONET natural event marker from Phase 3 into an Event Lab preset.
 */
export function convertEonetMarkerToCatalogEvent(
  marker: EonetEventMarker
): CatalogCatastropheEvent {
  const isVolcano = marker.categoryId === 'volcanoes';
  const kind: CatastropheKind = isVolcano ? 'volcano' : 'wildfire';
  const defaultIntensity = isVolcano ? 4.8 : 3.2;

  return {
    id: `eonet-${marker.id}`,
    title: `EONET: ${marker.title}`,
    kind,
    recordEpistemicClass: 'observed',
    timeScale: 'historical',
    timestamp: Date.parse(`${marker.dateISO}T00:00:00.000Z`),
    dateDisplay: `${marker.dateISO} (NASA EONET v3)`,
    lat: marker.lat,
    lon: marker.lon,
    defaultIntensity,
    magnitudeLabel: `${marker.categoryTitle} (Observed EONET Telemetry)`,
    recoveryHorizonYears: isVolcano ? 8 : 3,
    sourceId: 'nasa-eonet-v3-events',
    citationSummary: `NASA GSFC EONET v3 Event ID ${marker.id}`,
    description: `Observed ${marker.categoryTitle.toLowerCase()} event reported by NASA EONET. Animated radial impact and recovery curves use Chronoterra's simplified analytical model.`,
  };
}