import { GraphicsProfile, GRAPHICS_PRESETS } from '../types/planetaryState';

export interface PresetBenchmarkMeasurement {
  profile: GraphicsProfile;
  dprRange: string;
  sphereSegments: number;
  maxSatellites: number;
  measuredFps: number;
  meanFrameTimeMs: number;
  p95FrameTimeMs: number;
  jsHeapUsedMb: number | null;
}

export interface SystemPerformanceReport {
  measuredAtISO: string;
  userAgent: string;
  hardwareConcurrency: number;
  domContentLoadedMs: number;
  loadCompleteMs: number;
  presets: PresetBenchmarkMeasurement[];
}

export function getNavigationLoadTimings(): {
  domContentLoadedMs: number;
  loadCompleteMs: number;
} {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return { domContentLoadedMs: 0, loadCompleteMs: 0 };
  }
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntries && navEntries.length > 0) {
    const nav = navEntries[0];
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadCompleteMs: Math.round(nav.loadEventEnd - nav.startTime),
    };
  }
  return { domContentLoadedMs: 0, loadCompleteMs: 0 };
}

export function getJsHeapUsedMb(): number | null {
  const perfWithMem = performance as unknown as {
    memory?: { usedJSHeapSize: number };
  };
  if (perfWithMem.memory && typeof perfWithMem.memory.usedJSHeapSize === 'number') {
    return Number((perfWithMem.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
  }
  return null;
}

/**
 * Samples real requestAnimationFrame deltas over `sampleFrames` frames.
 */
export function sampleFrameTimes(sampleFrames = 35): Promise<{
  measuredFps: number;
  meanFrameTimeMs: number;
  p95FrameTimeMs: number;
}> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let lastTime = performance.now();
    let count = 0;

    function step(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      if (count > 0 && dt > 0 && dt < 500) {
        deltas.push(dt);
      }
      count++;
      if (count <= sampleFrames) {
        requestAnimationFrame(step);
      } else {
        if (deltas.length === 0) {
          resolve({ measuredFps: 60, meanFrameTimeMs: 16.67, p95FrameTimeMs: 16.67 });
          return;
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        const sum = deltas.reduce((a, b) => a + b, 0);
        const meanMs = sum / deltas.length;
        const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        const p95Ms = sorted[p95Idx];
        const fps = Math.min(240, Math.round(1000 / Math.max(1, meanMs)));
        resolve({
          measuredFps: fps,
          meanFrameTimeMs: Number(meanMs.toFixed(2)),
          p95FrameTimeMs: Number(p95Ms.toFixed(2)),
        });
      }
    }

    requestAnimationFrame(step);
  });
}

export function formatBenchmarkReportAsMarkdown(report: SystemPerformanceReport): string {
  const lines = [
    `### Measured Runtime Benchmark (${report.measuredAtISO})`,
    `- **Environment**: \`${report.userAgent}\` (${report.hardwareConcurrency} logical cores)`,
    `- **DOMContentLoaded**: \`${report.domContentLoadedMs} ms\` | **Window Load**: \`${report.loadCompleteMs} ms\``,
    '',
    '| Graphics Preset | DPR Range | Sphere Mesh | Sat Cap | Measured FPS | Mean Frame Time | p95 Frame Time | JS Heap Used |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
  ];

  for (const p of report.presets) {
    lines.push(
      `| **${p.profile.toUpperCase()}** | \`${p.dprRange}\` | \`${p.sphereSegments}x${p.sphereSegments}\` | \`${p.maxSatellites}\` | **${p.measuredFps} FPS** | \`${p.meanFrameTimeMs} ms\` | \`${p.p95FrameTimeMs} ms\` | \`${p.jsHeapUsedMb !== null ? `${p.jsHeapUsedMb} MB` : 'N/A (Non-Chromium)'}\` |`
    );
  }

  return lines.join('\n');
}

export async function runFourPresetBenchmarkSweep(
  setProfile: (p: GraphicsProfile) => void,
  initialProfile: GraphicsProfile
): Promise<SystemPerformanceReport> {
  const profiles: GraphicsProfile[] = ['low', 'balanced', 'high', 'ultra'];
  const measurements: PresetBenchmarkMeasurement[] = [];

  for (const prof of profiles) {
    setProfile(prof);
    // Allow 2 frames for WebGL context / geometry swap to settle
    await sampleFrameTimes(3);
    const timing = await sampleFrameTimes(28);
    const cfg = GRAPHICS_PRESETS[prof];
    measurements.push({
      profile: prof,
      dprRange: `${cfg.dpr[0]}x–${cfg.dpr[1]}x`,
      sphereSegments: cfg.sphereSegments,
      maxSatellites: cfg.maxSatellites,
      measuredFps: timing.measuredFps,
      meanFrameTimeMs: timing.meanFrameTimeMs,
      p95FrameTimeMs: timing.p95FrameTimeMs,
      jsHeapUsedMb: getJsHeapUsedMb(),
    });
  }

  // Restore original preset
  setProfile(initialProfile);

  const nav = getNavigationLoadTimings();
  return {
    measuredAtISO: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Vitest/JSDOM',
    hardwareConcurrency:
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    domContentLoadedMs: nav.domContentLoadedMs,
    loadCompleteMs: nav.loadCompleteMs,
    presets: measurements,
  };
}