import React, { useEffect } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  HISTORICAL_MIN_EPOCH_MS,
  HISTORICAL_MIN_ISO,
  ONE_DAY_MS,
  toISODateString,
} from '../data/metadata/datasetRegistry';
import { DEEP_TIME_SLICES, getDeepTimeSliceByMa } from '../simulation/time/deepTimeSlices';
import { evaluateCatastropheModel } from '../simulation/catastrophes/eventSimulationModel';
import {
  evaluateFutureScenarioState,
  FUTURE_HORIZON_YEARS,
  FUTURE_PATHWAYS,
} from '../simulation/climate/futureProjections';

export const TimelineBar: React.FC = () => {
  const timestamp = usePlanetaryStore((s) => s.timestamp);
  const timeScale = usePlanetaryStore((s) => s.timeScale);
  const isPlaying = usePlanetaryStore((s) => s.isPlaying);
  const playbackSpeedDaysPerTick = usePlanetaryStore((s) => s.playbackSpeedDaysPerTick);
  const isLoadingImagery = usePlanetaryStore((s) => s.runtimeTelemetry.isLoadingImagery);
  const event = usePlanetaryStore((s) => s.event);
  const activeEventMeta = usePlanetaryStore((s) => s.activeEventMeta);
  const timelineScrubMode = usePlanetaryStore((s) => s.timelineScrubMode);
  const futurePathwayId = usePlanetaryStore((s) => s.futurePathwayId);
  const futureHorizonYear = usePlanetaryStore((s) => s.futureHorizonYear);
  const customWarmingDeltaC = usePlanetaryStore((s) => s.customWarmingDeltaC);
  const customSeaLevelMeters = usePlanetaryStore((s) => s.customSeaLevelMeters);

  const setTimeScaleMode = usePlanetaryStore((s) => s.setTimeScaleMode);
  const setTimelineScrubMode = usePlanetaryStore((s) => s.setTimelineScrubMode);
  const selectDeepTimeSlice = usePlanetaryStore((s) => s.selectDeepTimeSlice);
  const setSimulatedTime = usePlanetaryStore((s) => s.setSimulatedTime);
  const stepHistoricalDays = usePlanetaryStore((s) => s.stepHistoricalDays);
  const setEventProgress = usePlanetaryStore((s) => s.setEventProgress);
  const setEventIntensity = usePlanetaryStore((s) => s.setEventIntensity);
  const stepEventProgress = usePlanetaryStore((s) => s.stepEventProgress);
  const setFutureHorizonYear = usePlanetaryStore((s) => s.setFutureHorizonYear);
  const setIsPlaying = usePlanetaryStore((s) => s.setIsPlaying);
  const setPlaybackSpeedDaysPerTick = usePlanetaryStore((s) => s.setPlaybackSpeedDaysPerTick);

  const maxEpochMs = Date.now();
  const maxISO = toISODateString(maxEpochMs);
  const currentISO =
    timeScale === 'historical' && timelineScrubMode === 'planetary-date'
      ? toISODateString(timestamp)
      : HISTORICAL_MIN_ISO;

  useEffect(() => {
    if (!isPlaying) return;

    if (timelineScrubMode === 'event' && event) {
      const interval = window.setInterval(() => {
        stepEventProgress(0.02);
      }, 120);
      return () => window.clearInterval(interval);
    }

    if (timeScale === 'historical' && timelineScrubMode === 'planetary-date') {
      const interval = window.setInterval(() => {
        stepHistoricalDays(playbackSpeedDaysPerTick);
      }, 450);
      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [
    isPlaying,
    timelineScrubMode,
    event,
    timeScale,
    playbackSpeedDaysPerTick,
    stepEventProgress,
    stepHistoricalDays,
  ]);

  const activeDeepSlice = timeScale === 'deep-time' ? getDeepTimeSliceByMa(timestamp) : null;
  const eventKinematics =
    event && activeEventMeta
      ? evaluateCatastropheModel(
          activeEventMeta.kind,
          event.intensity,
          event.progress,
          activeEventMeta.recoveryHorizonYears
        )
      : null;

  const activeFuturePathway = FUTURE_PATHWAYS[futurePathwayId];

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        background: 'rgba(10, 15, 29, 0.94)',
        border:
          timelineScrubMode === 'future-projection'
            ? futurePathwayId === 'custom-hypothetical'
              ? '1px solid #ef4444'
              : '1px solid #f97316'
            : timelineScrubMode === 'event' && event
            ? '1px solid #ef4444'
            : timeScale === 'deep-time'
            ? '1px solid #a855f7'
            : '1px solid #1e293b',
        borderRadius: '4px',
        padding: '10px 16px',
        zIndex: 20,
        fontFamily: 'monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Top Row: Segregated Epistemic Timeline Regime Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8' }}>Epistemic Time Regime:</span>

          <button
            onClick={() => {
              setTimeScaleMode('deep-time');
            }}
            style={{
              background:
                timelineScrubMode === 'planetary-date' && timeScale === 'deep-time'
                  ? '#6b21a8'
                  : '#0f172a',
              color:
                timelineScrubMode === 'planetary-date' && timeScale === 'deep-time'
                  ? '#ffffff'
                  : '#c084fc',
              border: '1px solid #7e22ce',
              padding: '4px 10px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Deep-Time Slices (Ma — RECONSTRUCTED)
          </button>

          <button
            onClick={() => {
              setTimeScaleMode('historical');
            }}
            style={{
              background:
                timelineScrubMode === 'planetary-date' && timeScale === 'historical'
                  ? '#0284c7'
                  : '#0f172a',
              color:
                timelineScrubMode === 'planetary-date' && timeScale === 'historical'
                  ? '#ffffff'
                  : '#38bdf8',
              border: '1px solid #0284c7',
              padding: '4px 10px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Satellite Era (2000–Present — OBSERVED)
          </button>

          <button
            onClick={() => setTimelineScrubMode('future-projection')}
            style={{
              background:
                timelineScrubMode === 'future-projection' ? '#ea580c' : '#0f172a',
              color:
                timelineScrubMode === 'future-projection' ? '#ffffff' : '#fb923c',
              border: '1px solid #f97316',
              padding: '4px 10px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Future Horizons (2050–2200 CE — PROJECTED / HYPOTHETICAL)
          </button>

          {event && activeEventMeta && (
            <button
              onClick={() => setTimelineScrubMode('event')}
              style={{
                background: timelineScrubMode === 'event' ? '#dc2626' : '#450a0a',
                color: '#ffffff',
                border: '1px solid #f87171',
                padding: '4px 10px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Event Scrubber: {activeEventMeta.title.slice(0, 22)} (HYPOTHETICAL)
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Active Regime Controls */}
      {timelineScrubMode === 'future-projection' ? (
        <div
          role="group"
          aria-label="Discrete Future Reference Dates"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {FUTURE_HORIZON_YEARS.map((yr) => {
            const isSelected = futureHorizonYear === yr;
            const evalSnap = evaluateFutureScenarioState(
              futurePathwayId,
              yr,
              customWarmingDeltaC,
              customSeaLevelMeters
            );
            return (
              <button
                key={yr}
                onClick={() => setFutureHorizonYear(yr)}
                style={{
                  background: isSelected ? '#7c2d12' : '#0f172a',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  border: isSelected ? '2px solid #fb923c' : '1px solid #334155',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span style={{ color: '#fed7aa' }}>{yr} CE Reference Horizon</span>
                  <span
                    style={{
                      fontSize: '10px',
                      color:
                        activeFuturePathway.epistemicClass === 'projected'
                          ? '#fb923c'
                          : '#f87171',
                    }}
                  >
                    {activeFuturePathway.epistemicClass.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  {activeFuturePathway.shortCode} — ΔT +{evalSnap.warmingDeltaC}°C | GMSL +
                  {evalSnap.seaLevelRiseMeters} m
                </div>
              </button>
            );
          })}
        </div>
      ) : timelineScrubMode === 'event' && event && activeEventMeta && eventKinematics ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setEventProgress(0)}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Reset (0%)
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? '#dc2626' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            {isPlaying ? 'PAUSE EVENT' : 'PLAY EVENT'}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fecaca' }}>
            <span>Intensity:</span>
            <input
              aria-label="Timeline Event Intensity Scrubber"
              type="range"
              min={1}
              max={10}
              step={0.2}
              value={event.intensity}
              onChange={(e) => setEventIntensity(Number(e.target.value))}
              style={{ width: '90px', accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <strong>{event.intensity.toFixed(1)}</strong>
          </label>

          <span style={{ color: '#fde047' }}>Progress:</span>
          <input
            aria-label="Timeline Event Progress Scrubber"
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={event.progress}
            onChange={(e) => setEventProgress(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#f59e0b', cursor: 'pointer' }}
          />

          <span style={{ color: '#fecaca', minWidth: '240px', textAlign: 'right' }}>
            {Math.round(event.progress * 100)}% — {eventKinematics.phaseLabel} (+
            {eventKinematics.elapsedRecoveryYears} yr)
          </span>
        </div>
      ) : timeScale === 'historical' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => stepHistoricalDays(-1)}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            -1d
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? '#dc2626' : '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={() => stepHistoricalDays(1)}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            +1d
          </button>

          <select
            aria-label="Timeline Playback Step Speed"
            value={playbackSpeedDaysPerTick}
            onChange={(e) => setPlaybackSpeedDaysPerTick(Number(e.target.value))}
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '3px 6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            <option value={1}>1 Day / tick</option>
            <option value={7}>7 Days / tick</option>
            <option value={30}>30 Days / tick</option>
          </select>

          <input
            aria-label="Direct Date Entry"
            type="date"
            min={HISTORICAL_MIN_ISO}
            max={maxISO}
            value={currentISO}
            onChange={(e) => {
              const parsed = Date.parse(`${e.target.value}T00:00:00.000Z`);
              if (!Number.isNaN(parsed)) setSimulatedTime(parsed, 'historical');
            }}
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #334155',
              padding: '3px 6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          />

          <input
            aria-label="Historical Timeline Scrubber"
            type="range"
            min={HISTORICAL_MIN_EPOCH_MS}
            max={maxEpochMs}
            step={ONE_DAY_MS}
            value={timestamp}
            onChange={(e) => setSimulatedTime(Number(e.target.value), 'historical')}
            style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <span style={{ color: isLoadingImagery ? '#fbbf24' : '#34d399' }}>
            {isLoadingImagery ? 'SYNCING...' : 'READY'}
          </span>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Discrete Geological Time Slices"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '8px',
          }}
        >
          {DEEP_TIME_SLICES.map((slice) => {
            const isSelected = activeDeepSlice?.ma === slice.ma;
            return (
              <button
                key={slice.id}
                onClick={() => selectDeepTimeSlice(slice.ma)}
                style={{
                  background: isSelected ? '#4c1d95' : '#0f172a',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  border: isSelected ? '2px solid #c084fc' : '1px solid #334155',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span style={{ color: '#e9d5ff' }}>{slice.ma} Ma</span>
                  <span style={{ fontSize: '10px', color: '#c084fc' }}>{slice.era}</span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>{slice.name}</div>
              </button>
            );
          })}
        </div>
      )}
    </footer>
  );
};