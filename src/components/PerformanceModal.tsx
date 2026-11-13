import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import {
  formatBenchmarkReportAsMarkdown,
  runFourPresetBenchmarkSweep,
  SystemPerformanceReport,
} from '../utils/performanceProfiler';

export const PerformanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const graphicsProfile = usePlanetaryStore((s) => s.graphicsProfile);
  const setGraphicsProfile = usePlanetaryStore((s) => s.setGraphicsProfile);

  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SystemPerformanceReport | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunSweep = async () => {
    setIsRunning(true);
    setCopied(false);
    const res = await runFourPresetBenchmarkSweep(setGraphicsProfile, graphicsProfile);
    setReport(res);
    setIsRunning(false);
  };

  const markdownOutput = report ? formatBenchmarkReportAsMarkdown(report) : '';

  return (
    <div
      role="dialog"
      aria-label="Hardware Performance Benchmark Profiler"
      data-testid="performance-modal"
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(820px, 94vw)',
        maxHeight: '82vh',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.98)',
        border: '1px solid #38bdf8',
        borderRadius: '6px',
        padding: '16px',
        zIndex: 35,
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
            EMPIRICAL HARDWARE & PRESET BENCHMARK PROFILER
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
            Measures real Navigation Timing load latency, JS heap memory, and frame times across
            Low, Balanced, High, and Ultra presets on this machine for <code>docs/architecture.md</code>.
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          Close [X]
        </button>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleRunSweep}
          disabled={isRunning}
          style={{
            background: isRunning ? '#475569' : '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '3px',
            cursor: isRunning ? 'wait' : 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          {isRunning
            ? 'Sampling Low -> Balanced -> High -> Ultra...'
            : 'Run 4-Preset Hardware Benchmark Sweep'}
        </button>

        {report && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(markdownOutput);
              setCopied(true);
            }}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {copied ? 'Copied Markdown!' : 'Copy Markdown for docs/architecture.md'}
          </button>
        )}
      </div>

      {report && (
        <pre
          style={{
            marginTop: '12px',
            background: '#05070d',
            border: '1px solid #1e293b',
            padding: '10px',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '11px',
            color: '#a7f3d0',
          }}
        >
          {markdownOutput}
        </pre>
      )}
    </div>
  );
};