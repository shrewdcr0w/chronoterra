import { create } from 'zustand';
import {
  GraphicsProfile,
  PlanetaryState,
  ScenarioType,
  TimeScale,
} from '../types/planetaryState';
import {
  HISTORICAL_MIN_EPOCH_MS,
  ONE_DAY_MS,
} from '../data/metadata/datasetRegistry';
import {
  DEEP_TIME_SLICES,
  getDeepTimeSliceByMa,
} from '../simulation/time/deepTimeSlices';
import {
  CelestrakGroupId,
  PropagatedSatelliteState,
} from '../simulation/orbit/ommTypes';
import {
  CelestialFocusTarget,
  computeSolarSystemEphemeris,
  SolarSystemScaleMode,
  SolarSystemSnapshot,
} from '../simulation/astronomy/solarSystemEphemeris';
import {
  CatalogCatastropheEvent,
  CatastropheKind,
  CURATED_CATASTROPHE_EVENTS,
} from '../simulation/catastrophes/curatedEvents';
import {
  epochMsToNearestHorizonYear,
  evaluateFutureScenarioState,
  FutureHorizonYear,
  FuturePathwayId,
  horizonYearToEpochMs,
} from '../simulation/climate/futureProjections';

export type TimelineScrubMode = 'planetary-date' | 'event' | 'future-projection';

export interface ActiveEventMetadata {
  id: string;
  title: string;
  kind: CatastropheKind;
  lat: number;
  lon: number;
  recoveryHorizonYears: number;
  isUserPlacedHypothetical: boolean;
  recordEpistemicClass: ScenarioType;
  dateDisplay: string;
  sourceId: string;
  citationSummary: string;
}

export interface TelemetryRuntimeStatus {
  usingProceduralBaseFallback: boolean;
  lastCacheSource: 'memory' | 'idb' | 'network' | 'idle';
  eonetEventCount: number;
  isLoadingImagery: boolean;
  activeCratonCount: number;
  totalTrackedSatellites: number;
  renderedSatellitesCount: number;
  ommDataSourceOrigin: string;
}

export interface PlanetaryStoreActions {
  setGraphicsProfile: (profile: GraphicsProfile) => void;
  setCamera: (cameraPartial: Partial<PlanetaryState['camera']>) => void;
  toggleLayer: (layerKey: string) => void;
  setLayer: (layerKey: string, enabled: boolean) => void;
  setShowSatellites: (show: boolean) => void;
  toggleSatelliteGroup: (group: CelestrakGroupId) => void;
  setSatelliteDensity: (density: number) => void;
  setSatelliteSearchQuery: (query: string) => void;
  setSelectedSatelliteNoradId: (noradId: number | null) => void;
  setPropagatedSatellites: (sats: PropagatedSatelliteState[]) => void;
  setSolarSystemScaleMode: (mode: SolarSystemScaleMode) => void;
  setCelestialFocusTarget: (target: CelestialFocusTarget) => void;
  setLatestEphemerisSnapshot: (snapshot: SolarSystemSnapshot) => void;
  setTimeScaleMode: (mode: TimeScale) => void;
  selectDeepTimeSlice: (ma: number) => void;
  setSimulatedTime: (timestamp: number, timeScale: TimeScale) => void;
  stepHistoricalDays: (daysDelta: number) => void;
  stepHistoricalMinutes: (minutesDelta: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeedDaysPerTick: (days: number) => void;
  launchCatalogEvent: (catalogEvent: CatalogCatastropheEvent) => void;
  launchHypotheticalEvent: (params: {
    kind: CatastropheKind;
    lat: number;
    lon: number;
    intensity: number;
    recoveryHorizonYears: number;
  }) => void;
  setEventIntensity: (intensity: number) => void;
  setEventProgress: (progress: number) => void;
  stepEventProgress: (delta: number) => void;
  setIsPlacingHypotheticalEvent: (placing: boolean) => void;
  setTimelineScrubMode: (mode: TimelineScrubMode) => void;
  clearActiveEvent: () => void;
  setFuturePathway: (pathwayId: FuturePathwayId) => void;
  setFutureHorizonYear: (year: FutureHorizonYear) => void;
  setCustomFutureSliders: (warmingDeltaC: number, seaLevelMeters: number) => void;
  setScenario: (type: ScenarioType, sourceIds: string[]) => void;
  updateRuntimeTelemetry: (partial: Partial<TelemetryRuntimeStatus>) => void;
  hydrateFromValidatedState: (validated: PlanetaryState) => void;
  resetToDefault: () => void;
  getSerializableState: () => PlanetaryState;
}

export interface PlanetaryStore extends PlanetaryState, PlanetaryStoreActions {
  isPlaying: boolean;
  playbackSpeedDaysPerTick: number;
  lastHistoricalTimestamp: number;
  enabledSatelliteGroups: Record<CelestrakGroupId, boolean>;
  satelliteDensity: number;
  satelliteSearchQuery: string;
  selectedSatelliteNoradId: number | null;
  propagatedSatellites: PropagatedSatelliteState[];
  solarSystemScaleMode: SolarSystemScaleMode;
  celestialFocusTarget: CelestialFocusTarget;
  latestEphemerisSnapshot: SolarSystemSnapshot | null;
  activeEventMeta: ActiveEventMetadata | null;
  isPlacingHypotheticalEvent: boolean;
  timelineScrubMode: TimelineScrubMode;
  futurePathwayId: FuturePathwayId;
  futureHorizonYear: FutureHorizonYear;
  customWarmingDeltaC: number;
  customSeaLevelMeters: number;
  runtimeTelemetry: TelemetryRuntimeStatus;
}

export function clampHistoricalTimestamp(epochMs: number, maxEpochMs = Date.now()): number {
  return Math.max(HISTORICAL_MIN_EPOCH_MS, Math.min(maxEpochMs, epochMs));
}

export function computeActiveSourceIdsAndScenario(
  timeScale: TimeScale,
  timelineScrubMode: TimelineScrubMode,
  layers: Record<string, boolean>,
  showSatellites: boolean,
  usingProceduralBaseFallback: boolean,
  activeEvent?: PlanetaryState['event'],
  activeEventMeta?: ActiveEventMetadata | null,
  futurePathwayId: FuturePathwayId = 'ssp2-45'
): { type: ScenarioType; sourceIds: string[] } {
  // 1. Future Projection Mode (Phase 8)
  if (timelineScrubMode === 'future-projection') {
    const isCustom = futurePathwayId === 'custom-hypothetical';
    const primarySource = isCustom
      ? 'custom-hypothetical-future-sliders-v1'
      : 'ipcc-ar6-cmip6-ssp-projections';
    const sourceIds = [primarySource, 'astronomy-engine-ephemeris'];
    return {
      type: isCustom ? 'hypothetical' : 'projected',
      sourceIds,
    };
  }

  // 2. Deep-Time Mode (Phase 4)
  const sourceIds: string[] = [];
  if (timeScale === 'deep-time') {
    sourceIds.push('scotese-gplates-paleomap-v3');
    if (layers.paleoVegetation) {
      sourceIds.push('paleobiome-climate-belt-procedural-v1');
    }
  } else {
    // 3. Historical Satellite Mode (Phases 3, 5, 6)
    sourceIds.push('astronomy-engine-ephemeris');
    if (layers.gibsTrueColor && !usingProceduralBaseFallback) {
      sourceIds.push('gibs-modis-terra-truecolor');
    } else {
      sourceIds.push('procedural-fallback-v1');
    }
    if (layers.gibsLandSurfaceTemp) {
      sourceIds.push('gibs-modis-terra-lst-day');
    }
    if (layers.eonetEvents) {
      sourceIds.push('nasa-eonet-v3-events');
    }
    if (showSatellites) {
      sourceIds.push('celestrak-gp-omm-json');
    }
    if (layers.climatePlaceholder) {
      sourceIds.push('procedural-zonal-climate-placeholder-v1');
    }
  }

  // 4. Active Catastrophe Event Override (Phase 7)
  if (activeEvent) {
    if (activeEventMeta?.sourceId && !sourceIds.includes(activeEventMeta.sourceId)) {
      sourceIds.push(activeEventMeta.sourceId);
    }
    if (!sourceIds.includes('chronoterra-event-decay-regrowth-model-v1')) {
      sourceIds.push('chronoterra-event-decay-regrowth-model-v1');
    }
    return { type: 'hypothetical', sourceIds };
  }

  if (timeScale === 'deep-time') {
    return {
      type: layers.paleoVegetation ? 'hypothetical' : 'reconstructed',
      sourceIds,
    };
  }

  const hasHypothetical =
    Boolean(layers.climatePlaceholder) ||
    usingProceduralBaseFallback ||
    !layers.gibsTrueColor;

  return {
    type: hasHypothetical ? 'hypothetical' : 'observed',
    sourceIds,
  };
}

export const createDefaultPlanetaryState = (nowMs: number = Date.now()): PlanetaryState => {
  const defaultHistoricalMs = clampHistoricalTimestamp(nowMs - 3 * ONE_DAY_MS, nowMs);

  const initialLayers: Record<string, boolean> = {
    atmosphere: true,
    specularOcean: true,
    graticule: false,
    gibsTrueColor: true,
    gibsLandSurfaceTemp: false,
    eonetEvents: true,
    climatePlaceholder: false,
    paleoCoastlines: true,
    paleoVegetation: true,
    biosphereVegetation: true,
    naturalCelestialBodies: true,
    moonOrbit: true,
    planetOrbits: true,
    futureThermalAnomaly: true,
    futureBiomeShift: true,
    futureCoastalInundation: true,
  };

  return {
    id: 'phase9-chronoterra-v1',
    version: 1,
    label: 'Present Day — Earth, Moon, Solar System, Event Lab & Future Projections',
    createdAt: nowMs,
    timestamp: defaultHistoricalMs,
    timeScale: 'historical',
    geography: {
      continentalModel: 'present-wgs84',
      seaLevel: 0,
      terrainDataset: 'gibs-modis-terra-truecolor',
    },
    atmosphere: {
      temperatureDataset: 'none',
      compositionDataset: 'standard-n2-o2-ar',
      cloudDataset: 'included-in-truecolor',
    },
    biosphere: {
      vegetationDataset: 'none',
      biomeDataset: 'none',
      biodiversityDataset: 'none',
    },
    orbitalState: {
      satelliteDataset: 'celestrak-gp-omm-json:stations,weather',
      planetaryEphemeris: 'astronomy-engine-vsop87-educational',
      showSatellites: true,
    },
    scenario: {
      type: 'observed',
      sourceIds: [
        'astronomy-engine-ephemeris',
        'gibs-modis-terra-truecolor',
        'nasa-eonet-v3-events',
        'celestrak-gp-omm-json',
      ],
    },
    camera: {
      lat: 20.59,
      lon: 78.96,
      distance: 3.1,
      heading: 0,
      pitch: 0,
    },
    graphicsProfile: 'balanced',
    layers: initialLayers,
  };
};

export const usePlanetaryStore = create<PlanetaryStore>((set, get) => {
  const initial = createDefaultPlanetaryState();
  const initialSnapshot = computeSolarSystemEphemeris(initial.timestamp, 'educational');

  return {
    ...initial,
    isPlaying: false,
    playbackSpeedDaysPerTick: 1,
    lastHistoricalTimestamp: initial.timestamp,
    enabledSatelliteGroups: {
      stations: true,
      weather: true,
      'gps-ops': false,
      resource: false,
    },
    satelliteDensity: 1.0,
    satelliteSearchQuery: '',
    selectedSatelliteNoradId: 25544,
    propagatedSatellites: [],
    solarSystemScaleMode: 'educational',
    celestialFocusTarget: 'Earth',
    latestEphemerisSnapshot: initialSnapshot,
    activeEventMeta: null,
    isPlacingHypotheticalEvent: false,
    timelineScrubMode: 'planetary-date',
    futurePathwayId: 'ssp2-45',
    futureHorizonYear: 2100,
    customWarmingDeltaC: 4.0,
    customSeaLevelMeters: 8.0,
    runtimeTelemetry: {
      usingProceduralBaseFallback: false,
      lastCacheSource: 'idle',
      eonetEventCount: 0,
      isLoadingImagery: false,
      activeCratonCount: DEEP_TIME_SLICES[0].cratons.length,
      totalTrackedSatellites: 0,
      renderedSatellitesCount: 0,
      ommDataSourceOrigin: 'initializing',
    },

    setGraphicsProfile: (graphicsProfile) => set({ graphicsProfile }),

    setCamera: (cameraPartial) =>
      set((state) => ({
        camera: { ...state.camera, ...cameraPartial },
      })),

    toggleLayer: (layerKey) =>
      set((state) => {
        const nextLayers = {
          ...state.layers,
          [layerKey]: !state.layers[layerKey],
        };
        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          state.timelineScrubMode,
          nextLayers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          layers: nextLayers,
          scenario: nextScenario,
        };
      }),

    setLayer: (layerKey, enabled) =>
      set((state) => {
        const nextLayers = { ...state.layers, [layerKey]: enabled };
        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          state.timelineScrubMode,
          nextLayers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          layers: nextLayers,
          scenario: nextScenario,
        };
      }),

    setShowSatellites: (showSatellites) =>
      set((state) => {
        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          state.timelineScrubMode,
          state.layers,
          showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          orbitalState: {
            ...state.orbitalState,
            showSatellites,
          },
          scenario: nextScenario,
        };
      }),

    toggleSatelliteGroup: (group) =>
      set((state) => {
        const nextGroups = {
          ...state.enabledSatelliteGroups,
          [group]: !state.enabledSatelliteGroups[group],
        };
        const activeGroupNames = (Object.keys(nextGroups) as CelestrakGroupId[]).filter(
          (g) => nextGroups[g]
        );
        return {
          enabledSatelliteGroups: nextGroups,
          orbitalState: {
            ...state.orbitalState,
            satelliteDataset:
              activeGroupNames.length > 0
                ? `celestrak-gp-omm-json:${activeGroupNames.join(',')}`
                : 'none',
          },
        };
      }),

    setSatelliteDensity: (satelliteDensity) =>
      set({
        satelliteDensity: Math.max(0.1, Math.min(1.0, satelliteDensity)),
      }),

    setSatelliteSearchQuery: (satelliteSearchQuery) => set({ satelliteSearchQuery }),

    setSelectedSatelliteNoradId: (selectedSatelliteNoradId) =>
      set({ selectedSatelliteNoradId }),

    setPropagatedSatellites: (propagatedSatellites) => set({ propagatedSatellites }),

    setSolarSystemScaleMode: (solarSystemScaleMode) =>
      set((state) => ({
        solarSystemScaleMode,
        orbitalState: {
          ...state.orbitalState,
          planetaryEphemeris: `astronomy-engine-vsop87-${solarSystemScaleMode}`,
        },
        latestEphemerisSnapshot: computeSolarSystemEphemeris(
          state.timeScale === 'historical' ? state.timestamp : Date.now(),
          solarSystemScaleMode
        ),
      })),

    setCelestialFocusTarget: (celestialFocusTarget) => set({ celestialFocusTarget }),

    setLatestEphemerisSnapshot: (latestEphemerisSnapshot) =>
      set({ latestEphemerisSnapshot }),

    setTimeScaleMode: (mode) =>
      set((state) => {
        if (mode === 'deep-time') {
          const defaultSlice = getDeepTimeSliceByMa(66);
          const nextScenario = computeActiveSourceIdsAndScenario(
            'deep-time',
            'planetary-date',
            state.layers,
            state.orbitalState.showSatellites,
            state.runtimeTelemetry.usingProceduralBaseFallback,
            state.event,
            state.activeEventMeta,
            state.futurePathwayId
          );
          return {
            isPlaying: false,
            timelineScrubMode: 'planetary-date',
            celestialFocusTarget: 'Earth',
            lastHistoricalTimestamp:
              state.timeScale === 'historical' && state.timelineScrubMode === 'planetary-date'
                ? state.timestamp
                : state.lastHistoricalTimestamp,
            timeScale: 'deep-time',
            timestamp: defaultSlice.ma,
            label: `${defaultSlice.ma} Ma — ${defaultSlice.name}`,
            geography: {
              continentalModel: defaultSlice.continentalModel,
              seaLevel: defaultSlice.seaLevelMeters,
              terrainDataset: 'scotese-gplates-paleomap-v3',
            },
            scenario: nextScenario,
          };
        }

        const restoredEpochMs = clampHistoricalTimestamp(
          state.lastHistoricalTimestamp || Date.now() - 3 * ONE_DAY_MS
        );
        const nextScenario = computeActiveSourceIdsAndScenario(
          'historical',
          'planetary-date',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          isPlaying: false,
          timelineScrubMode: 'planetary-date',
          timeScale: 'historical',
          timestamp: restoredEpochMs,
          label: 'Present Day — Satellite Era Observation',
          geography: {
            continentalModel: 'present-wgs84',
            seaLevel: 0,
            terrainDataset: 'gibs-modis-terra-truecolor',
          },
          scenario: nextScenario,
        };
      }),

    selectDeepTimeSlice: (ma) =>
      set((state) => {
        const slice = getDeepTimeSliceByMa(ma);
        const nextScenario = computeActiveSourceIdsAndScenario(
          'deep-time',
          'planetary-date',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          isPlaying: false,
          timelineScrubMode: 'planetary-date',
          timeScale: 'deep-time',
          timestamp: slice.ma,
          label: `${slice.ma} Ma — ${slice.name}`,
          geography: {
            continentalModel: slice.continentalModel,
            seaLevel: slice.seaLevelMeters,
            terrainDataset: 'scotese-gplates-paleomap-v3',
          },
          scenario: nextScenario,
        };
      }),

    setSimulatedTime: (timestamp, timeScale) =>
      set((state) => {
        if (timeScale === 'deep-time') {
          const slice = getDeepTimeSliceByMa(timestamp);
          const nextScenario = computeActiveSourceIdsAndScenario(
            'deep-time',
            'planetary-date',
            state.layers,
            state.orbitalState.showSatellites,
            state.runtimeTelemetry.usingProceduralBaseFallback,
            state.event,
            state.activeEventMeta,
            state.futurePathwayId
          );
          return {
            timelineScrubMode: 'planetary-date',
            timeScale: 'deep-time',
            timestamp: slice.ma,
            geography: {
              continentalModel: slice.continentalModel,
              seaLevel: slice.seaLevelMeters,
              terrainDataset: 'scotese-gplates-paleomap-v3',
            },
            scenario: nextScenario,
          };
        }
        const clampedMs = clampHistoricalTimestamp(timestamp);
        return {
          timelineScrubMode: 'planetary-date',
          timestamp: clampedMs,
          timeScale: 'historical',
          latestEphemerisSnapshot: computeSolarSystemEphemeris(
            clampedMs,
            state.solarSystemScaleMode
          ),
        };
      }),

    stepHistoricalDays: (daysDelta) =>
      set((state) => {
        if (state.timeScale !== 'historical') return state;
        const nextMs = state.timestamp + daysDelta * ONE_DAY_MS;
        const maxMs = Date.now();
        const clamped = clampHistoricalTimestamp(nextMs, maxMs);
        return {
          timestamp: clamped,
          isPlaying: nextMs > maxMs ? false : state.isPlaying,
          latestEphemerisSnapshot: computeSolarSystemEphemeris(
            clamped,
            state.solarSystemScaleMode
          ),
        };
      }),

    stepHistoricalMinutes: (minutesDelta) =>
      set((state) => {
        if (state.timeScale !== 'historical') return state;
        const nextMs = state.timestamp + minutesDelta * 60_000;
        const clamped = clampHistoricalTimestamp(nextMs, Date.now());
        return {
          timestamp: clamped,
          latestEphemerisSnapshot: computeSolarSystemEphemeris(
            clamped,
            state.solarSystemScaleMode
          ),
        };
      }),

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    setPlaybackSpeedDaysPerTick: (playbackSpeedDaysPerTick) =>
      set({ playbackSpeedDaysPerTick }),

    launchCatalogEvent: (catalogEvent) =>
      set((state) => {
        const nextEvent: NonNullable<PlanetaryState['event']> = {
          type: catalogEvent.id,
          intensity: catalogEvent.defaultIntensity,
          progress: 0.2,
        };
        const nextMeta: ActiveEventMetadata = {
          id: catalogEvent.id,
          title: catalogEvent.title,
          kind: catalogEvent.kind,
          lat: catalogEvent.lat,
          lon: catalogEvent.lon,
          recoveryHorizonYears: catalogEvent.recoveryHorizonYears,
          isUserPlacedHypothetical: false,
          recordEpistemicClass: catalogEvent.recordEpistemicClass,
          dateDisplay: catalogEvent.dateDisplay,
          sourceId: catalogEvent.sourceId,
          citationSummary: catalogEvent.citationSummary,
        };

        const targetTimeScale = catalogEvent.timeScale;
        const targetTimestamp =
          targetTimeScale === 'deep-time'
            ? getDeepTimeSliceByMa(catalogEvent.timestamp).ma
            : clampHistoricalTimestamp(catalogEvent.timestamp);

        const nextScenario = computeActiveSourceIdsAndScenario(
          targetTimeScale,
          'event',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          nextEvent,
          nextMeta,
          state.futurePathwayId
        );

        return {
          celestialFocusTarget: 'Earth',
          timeScale: targetTimeScale,
          timestamp: targetTimestamp,
          event: nextEvent,
          activeEventMeta: nextMeta,
          isPlacingHypotheticalEvent: false,
          timelineScrubMode: 'event',
          camera: {
            ...state.camera,
            lat: catalogEvent.lat,
            lon: catalogEvent.lon,
          },
          biosphere: {
            ...state.biosphere,
            vegetationDataset: 'chronoterra-event-decay-regrowth-model-v1',
          },
          scenario: nextScenario,
        };
      }),

    launchHypotheticalEvent: ({ kind, lat, lon, intensity, recoveryHorizonYears }) =>
      set((state) => {
        const clampedIntensity = Math.max(1, Math.min(10, intensity));
        const eventTypeId = `hypothetical-${kind}`;
        const nextEvent: NonNullable<PlanetaryState['event']> = {
          type: eventTypeId,
          intensity: clampedIntensity,
          progress: 0.2,
        };
        const nextMeta: ActiveEventMetadata = {
          id: `${eventTypeId}-${Date.now()}`,
          title:
            kind === 'impact'
              ? 'Hypothetical Bolide Impact'
              : 'Hypothetical Volcanic Eruption',
          kind,
          lat: Number(lat.toFixed(2)),
          lon: Number(lon.toFixed(2)),
          recoveryHorizonYears,
          isUserPlacedHypothetical: true,
          recordEpistemicClass: 'hypothetical',
          dateDisplay: 'User-Defined Hypothetical Scenario',
          sourceId: 'chronoterra-event-decay-regrowth-model-v1',
          citationSummary: 'Parameterized analytical model (see docs/simulation-models.md)',
        };

        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          'event',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          nextEvent,
          nextMeta,
          state.futurePathwayId
        );

        return {
          celestialFocusTarget: 'Earth',
          event: nextEvent,
          activeEventMeta: nextMeta,
          isPlacingHypotheticalEvent: false,
          timelineScrubMode: 'event',
          camera: {
            ...state.camera,
            lat: nextMeta.lat,
            lon: nextMeta.lon,
          },
          biosphere: {
            ...state.biosphere,
            vegetationDataset: 'chronoterra-event-decay-regrowth-model-v1',
          },
          scenario: nextScenario,
        };
      }),

    setEventIntensity: (intensity) =>
      set((state) => {
        if (!state.event) return state;
        return {
          event: {
            ...state.event,
            intensity: Math.max(1, Math.min(10, intensity)),
          },
        };
      }),

    setEventProgress: (progress) =>
      set((state) => {
        if (!state.event) return state;
        return {
          event: {
            ...state.event,
            progress: Math.max(0, Math.min(1, Number(progress.toFixed(3)))),
          },
        };
      }),

    stepEventProgress: (delta) =>
      set((state) => {
        if (!state.event) return state;
        const nextP = state.event.progress + delta;
        if (nextP >= 1.0) {
          return {
            isPlaying: false,
            event: { ...state.event, progress: 1.0 },
          };
        }
        return {
          event: {
            ...state.event,
            progress: Math.max(0, Number(nextP.toFixed(3))),
          },
        };
      }),

    setIsPlacingHypotheticalEvent: (isPlacingHypotheticalEvent) =>
      set({ isPlacingHypotheticalEvent }),

    setTimelineScrubMode: (timelineScrubMode) =>
      set((state) => {
        if (timelineScrubMode === 'future-projection') {
          const evaluated = evaluateFutureScenarioState(
            state.futurePathwayId,
            state.futureHorizonYear,
            state.customWarmingDeltaC,
            state.customSeaLevelMeters
          );
          const futureEpochMs = horizonYearToEpochMs(state.futureHorizonYear);
          const nextScenario = computeActiveSourceIdsAndScenario(
            'historical',
            'future-projection',
            state.layers,
            state.orbitalState.showSatellites,
            state.runtimeTelemetry.usingProceduralBaseFallback,
            undefined,
            null,
            state.futurePathwayId
          );
          return {
            isPlaying: false,
            event: undefined,
            activeEventMeta: null,
            timelineScrubMode: 'future-projection',
            timeScale: 'historical',
            timestamp: futureEpochMs,
            geography: {
              continentalModel: 'present-wgs84',
              seaLevel: evaluated.seaLevelRiseMeters,
              terrainDataset: evaluated.sourceId,
            },
            atmosphere: {
              ...state.atmosphere,
              temperatureDataset: evaluated.sourceId,
            },
            biosphere: {
              ...state.biosphere,
              biomeDataset: evaluated.sourceId,
            },
            latestEphemerisSnapshot: computeSolarSystemEphemeris(
              futureEpochMs,
              state.solarSystemScaleMode
            ),
            scenario: nextScenario,
          };
        }

        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          timelineScrubMode,
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          timelineScrubMode,
          scenario: nextScenario,
        };
      }),

    clearActiveEvent: () =>
      set((state) => {
        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          'planetary-date',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          undefined,
          null,
          state.futurePathwayId
        );
        return {
          isPlaying: false,
          event: undefined,
          activeEventMeta: null,
          isPlacingHypotheticalEvent: false,
          timelineScrubMode: 'planetary-date',
          scenario: nextScenario,
        };
      }),

    /**
     * Switches between SSP1-2.6, SSP2-4.5, SSP5-8.5, and Custom Hypothetical Sliders.
     */
    setFuturePathway: (futurePathwayId) =>
      set((state) => {
        const evaluated = evaluateFutureScenarioState(
          futurePathwayId,
          state.futureHorizonYear,
          state.customWarmingDeltaC,
          state.customSeaLevelMeters
        );
        const futureEpochMs = horizonYearToEpochMs(state.futureHorizonYear);
        const nextScenario = computeActiveSourceIdsAndScenario(
          'historical',
          'future-projection',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          undefined,
          null,
          futurePathwayId
        );

        return {
          isPlaying: false,
          event: undefined,
          activeEventMeta: null,
          celestialFocusTarget: 'Earth',
          timelineScrubMode: 'future-projection',
          timeScale: 'historical',
          timestamp: futureEpochMs,
          futurePathwayId,
          label: `${evaluated.horizonYear} CE — ${futurePathwayId.toUpperCase()}`,
          geography: {
            continentalModel: 'present-wgs84',
            seaLevel: evaluated.seaLevelRiseMeters,
            terrainDataset: evaluated.sourceId,
          },
          atmosphere: {
            ...state.atmosphere,
            temperatureDataset: evaluated.sourceId,
          },
          biosphere: {
            ...state.biosphere,
            biomeDataset: evaluated.sourceId,
            vegetationDataset: evaluated.sourceId,
          },
          latestEphemerisSnapshot: computeSolarSystemEphemeris(
            futureEpochMs,
            state.solarSystemScaleMode
          ),
          scenario: nextScenario,
        };
      }),

    /**
     * Selects one of the discrete future reference dates (2050, 2100, 2200 CE).
     */
    setFutureHorizonYear: (futureHorizonYear) =>
      set((state) => {
        const evaluated = evaluateFutureScenarioState(
          state.futurePathwayId,
          futureHorizonYear,
          state.customWarmingDeltaC,
          state.customSeaLevelMeters
        );
        const futureEpochMs = horizonYearToEpochMs(futureHorizonYear);
        const nextScenario = computeActiveSourceIdsAndScenario(
          'historical',
          'future-projection',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          undefined,
          null,
          state.futurePathwayId
        );

        return {
          isPlaying: false,
          event: undefined,
          activeEventMeta: null,
          celestialFocusTarget: 'Earth',
          timelineScrubMode: 'future-projection',
          timeScale: 'historical',
          timestamp: futureEpochMs,
          futureHorizonYear,
          label: `${futureHorizonYear} CE — ${state.futurePathwayId.toUpperCase()}`,
          geography: {
            continentalModel: 'present-wgs84',
            seaLevel: evaluated.seaLevelRiseMeters,
            terrainDataset: evaluated.sourceId,
          },
          atmosphere: {
            ...state.atmosphere,
            temperatureDataset: evaluated.sourceId,
          },
          biosphere: {
            ...state.biosphere,
            biomeDataset: evaluated.sourceId,
            vegetationDataset: evaluated.sourceId,
          },
          latestEphemerisSnapshot: computeSolarSystemEphemeris(
            futureEpochMs,
            state.solarSystemScaleMode
          ),
          scenario: nextScenario,
        };
      }),

    /**
     * Updates user-defined custom future sliders and forces `futurePathwayId = 'custom-hypothetical'`.
     */
    setCustomFutureSliders: (warmingDeltaC, seaLevelMeters) =>
      set((state) => {
        const clampedWarming = Number(Math.max(0.5, Math.min(10.0, warmingDeltaC)).toFixed(2));
        const clampedSeaLevel = Number(Math.max(0, Math.min(65.0, seaLevelMeters)).toFixed(2));
        const evaluated = evaluateFutureScenarioState(
          'custom-hypothetical',
          state.futureHorizonYear,
          clampedWarming,
          clampedSeaLevel
        );
        const futureEpochMs = horizonYearToEpochMs(state.futureHorizonYear);
        const nextScenario = computeActiveSourceIdsAndScenario(
          'historical',
          'future-projection',
          state.layers,
          state.orbitalState.showSatellites,
          state.runtimeTelemetry.usingProceduralBaseFallback,
          undefined,
          null,
          'custom-hypothetical'
        );

        return {
          timelineScrubMode: 'future-projection',
          timeScale: 'historical',
          timestamp: futureEpochMs,
          futurePathwayId: 'custom-hypothetical',
          customWarmingDeltaC: clampedWarming,
          customSeaLevelMeters: clampedSeaLevel,
          geography: {
            continentalModel: 'present-wgs84',
            seaLevel: evaluated.seaLevelRiseMeters,
            terrainDataset: evaluated.sourceId,
          },
          atmosphere: {
            ...state.atmosphere,
            temperatureDataset: evaluated.sourceId,
          },
          biosphere: {
            ...state.biosphere,
            biomeDataset: evaluated.sourceId,
            vegetationDataset: evaluated.sourceId,
          },
          scenario: nextScenario,
        };
      }),

    setScenario: (type, sourceIds) => set({ scenario: { type, sourceIds } }),

    updateRuntimeTelemetry: (partial) =>
      set((state) => {
        const nextTelemetry = { ...state.runtimeTelemetry, ...partial };
        const nextScenario = computeActiveSourceIdsAndScenario(
          state.timeScale,
          state.timelineScrubMode,
          state.layers,
          state.orbitalState.showSatellites,
          nextTelemetry.usingProceduralBaseFallback,
          state.event,
          state.activeEventMeta,
          state.futurePathwayId
        );
        return {
          runtimeTelemetry: nextTelemetry,
          scenario: nextScenario,
        };
      }),

    /**
     * Restores a Zod-validated PlanetaryState (from a shared URL hash, saved IndexedDB state,
     * or comparison snapshot) and reconciles derived UI mode flags cleanly.
     */
    hydrateFromValidatedState: (validated) =>
      set((state) => {
        const isFutureDate =
          validated.timeScale === 'historical' &&
          validated.timestamp > Date.parse('2035-01-01T00:00:00Z');

        let nextScrubMode: TimelineScrubMode = 'planetary-date';
        let nextFuturePathwayId: FuturePathwayId = state.futurePathwayId;
        let nextFutureHorizonYear: FutureHorizonYear = state.futureHorizonYear;
        let nextCustomSeaLevel = state.customSeaLevelMeters;

        if (validated.event) {
          nextScrubMode = 'event';
        } else if (
          isFutureDate ||
          validated.scenario.type === 'projected' ||
          validated.scenario.sourceIds.includes('ipcc-ar6-cmip6-ssp-projections') ||
          validated.scenario.sourceIds.includes('custom-hypothetical-future-sliders-v1')
        ) {
          nextScrubMode = 'future-projection';
          nextFutureHorizonYear = epochMsToNearestHorizonYear(validated.timestamp);
          if (
            validated.scenario.sourceIds.includes('custom-hypothetical-future-sliders-v1') ||
            validated.scenario.type === 'hypothetical'
          ) {
            nextFuturePathwayId = 'custom-hypothetical';
            if (typeof validated.geography.seaLevel === 'number') {
              nextCustomSeaLevel = validated.geography.seaLevel;
            }
          } else if (validated.label?.toLowerCase().includes('ssp1')) {
            nextFuturePathwayId = 'ssp1-26';
          } else if (validated.label?.toLowerCase().includes('ssp5')) {
            nextFuturePathwayId = 'ssp5-85';
          } else {
            nextFuturePathwayId = 'ssp2-45';
          }
        }

        // Reconcile activeEventMeta if the hydrated state carries an active event
        let nextEventMeta: ActiveEventMetadata | null = null;
        if (validated.event) {
          const matchedCurated = CURATED_CATASTROPHE_EVENTS.find(
            (e) => e.id === validated.event?.type
          );
          if (matchedCurated) {
            nextEventMeta = {
              id: matchedCurated.id,
              title: matchedCurated.title,
              kind: matchedCurated.kind,
              lat: matchedCurated.lat,
              lon: matchedCurated.lon,
              recoveryHorizonYears: matchedCurated.recoveryHorizonYears,
              isUserPlacedHypothetical: false,
              recordEpistemicClass: matchedCurated.recordEpistemicClass,
              dateDisplay: matchedCurated.dateDisplay,
              sourceId: matchedCurated.sourceId,
              citationSummary: matchedCurated.citationSummary,
            };
          } else {
            const isVolcano = validated.event.type.includes('volcano');
            nextEventMeta = {
              id: validated.event.type,
              title: isVolcano
                ? 'Hypothetical Volcanic Eruption'
                : 'Hypothetical Bolide Impact',
              kind: isVolcano ? 'volcano' : 'impact',
              lat: validated.camera.lat,
              lon: validated.camera.lon,
              recoveryHorizonYears: 50,
              isUserPlacedHypothetical: true,
              recordEpistemicClass: 'hypothetical',
              dateDisplay: 'Restored Shared Event State',
              sourceId: 'chronoterra-event-decay-regrowth-model-v1',
              citationSummary: 'Parameterized analytical model (see docs/simulation-models.md)',
            };
          }
        }

        const nextEphemeris =
          validated.timeScale === 'historical'
            ? computeSolarSystemEphemeris(
                validated.timestamp,
                state.solarSystemScaleMode
              )
            : state.latestEphemerisSnapshot;

        return {
          ...validated,
          event: validated.event ?? undefined,
          activeEventMeta: nextEventMeta,
          isPlaying: false,
          isPlacingHypotheticalEvent: false,
          timelineScrubMode: nextScrubMode,
          futurePathwayId: nextFuturePathwayId,
          futureHorizonYear: nextFutureHorizonYear,
          customSeaLevelMeters: nextCustomSeaLevel,
          latestEphemerisSnapshot: nextEphemeris,
        };
      }),

    resetToDefault: () => {
      const now = Date.now();
      const resetState = createDefaultPlanetaryState(now);
      set({
        ...resetState,
        event: undefined,
        activeEventMeta: null,
        isPlacingHypotheticalEvent: false,
        timelineScrubMode: 'planetary-date',
        futurePathwayId: 'ssp2-45',
        futureHorizonYear: 2100,
        customWarmingDeltaC: 4.0,
        customSeaLevelMeters: 8.0,
        isPlaying: false,
        playbackSpeedDaysPerTick: 1,
        lastHistoricalTimestamp: resetState.timestamp,
        enabledSatelliteGroups: {
          stations: true,
          weather: true,
          'gps-ops': false,
          resource: false,
        },
        satelliteDensity: 1.0,
        satelliteSearchQuery: '',
        selectedSatelliteNoradId: 25544,
        propagatedSatellites: [],
        solarSystemScaleMode: 'educational',
        celestialFocusTarget: 'Earth',
        latestEphemerisSnapshot: computeSolarSystemEphemeris(
          resetState.timestamp,
          'educational'
        ),
        runtimeTelemetry: {
          usingProceduralBaseFallback: false,
          lastCacheSource: 'idle',
          eonetEventCount: 0,
          isLoadingImagery: false,
          activeCratonCount: DEEP_TIME_SLICES[0].cratons.length,
          totalTrackedSatellites: 0,
          renderedSatellitesCount: 0,
          ommDataSourceOrigin: 'idle',
        },
      });
    },

    getSerializableState: () => {
      const s = get();
      return {
        id: s.id,
        version: s.version,
        label: s.label,
        createdAt: s.createdAt,
        timestamp: s.timestamp,
        timeScale: s.timeScale,
        geography: s.geography,
        atmosphere: s.atmosphere,
        biosphere: s.biosphere,
        orbitalState: s.orbitalState,
        event: s.event,
        scenario: s.scenario,
        camera: s.camera,
        graphicsProfile: s.graphicsProfile,
        layers: s.layers,
      };
    },
  };
});