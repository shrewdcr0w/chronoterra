import React, { useState } from 'react';
import { usePlanetaryStore } from '../stores/usePlanetaryStore';
import { formatSimulatedTimestamp, PlanetaryState } from '../types/planetaryState';
import {
  deleteSavedStateFromIdb,
  encodeStateToUrlHash,
  saveNamedStateToIdb,
} from '../utils/stateSharing';

interface ShareAndSavePanelProps {
  savedStates: PlanetaryState[];
  onSavedStatesChange: (next: PlanetaryState[]) => void;
  urlLoadNotice: string | null;
  onOpenComparison: () => void;
  onOpenAttributions: () => void;
  onOpenPerformance: () => void;
}

export const ShareAndSavePanel: React.FC<ShareAndSavePanelProps> = ({
  savedStates,
  onSavedStatesChange,
  urlLoadNotice,
  onOpenComparison,
  onOpenAttributions,
  onOpenPerformance,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [stateNameInput, setStateNameInput] = useState('');
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const getSerializableState = usePlanetaryStore((s) => s.getSerializableState);
  const hydrateFromValidatedState = usePlanetaryStore(
    (s) => s.hydrateFromValidatedState
  );

  const handleCopyShareUrl = () => {
    try {
      const current = getSerializableState();
      const hash = encodeStateToUrlHash(current);
      window.history.replaceState(null, '', hash);
      const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;
      navigator.clipboard?.writeText(fullUrl);
      setShareStatus('Shareable URL written to #state= & copied!');
    } catch (err) {
      setShareStatus(
        err instanceof Error ? err.message : 'Failed to encode URL state'
      );
    }
  };

  const handleSaveCurrentState = async () => {
    const current = getSerializableState();
    const updated = await saveNamedStateToIdb(stateNameInput, current);
    onSavedStatesChange(updated);
    setStateNameInput('');
  };

  const handleDeleteSaved = async (id: string) => {
    const updated = await deleteSavedStateFromIdb(id);
    onSavedStatesChange(updated);
  };

  return (
    <aside
      aria-label="State Sharing and Saved States Panel"
      style={{
        position: 'fixed',
        bottom: '108px',
        left: '340px',
        width: '320px',
        maxHeight: '260px',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.94)',
        border: '1px solid #10b981',
        borderRadius: '4px',
        padding: '10px 12px',
        zIndex: 16,
        fontFamily: 'monospace',
        fontSize: '11px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#34d399' }}>SHARE, SAVE & COMPARE (PHASE 9)</strong>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            color: '#38bdf8',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {collapsed ? '[Expand]' : '[Collapse]'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {urlLoadNotice && (
            <div
              data-testid="url-hydration-notice"
              style={{
                background: '#064e3b',
                border: '1px solid #10b981',
                color: '#a7f3d0',
                padding: '4px 6px',
                borderRadius: '3px',
                fontSize: '10px',
              }}
            >
              {urlLoadNotice}
            </div>
          )}

          {/* 1. Share URL & Quick Launch Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyShareUrl}
              data-testid="copy-share-url-button"
              style={{
                flex: 1,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '5px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
            >
              Share URL (#state=)
            </button>

            <button
              onClick={onOpenComparison}
              data-testid="open-comparison-button"
              style={{
                flex: 1,
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '5px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
            >
              Compare A/B
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onOpenAttributions}
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '10px',
              }}
            >
              Attributions & Licenses
            </button>
            <button
              onClick={onOpenPerformance}
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '10px',
              }}
            >
              GPU Benchmark Pass
            </button>
          </div>

          {shareStatus && (
            <div style={{ color: '#fde047', fontSize: '10px' }}>{shareStatus}</div>
          )}

          {/* 2. Save Current State to IndexedDB */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
            <input
              aria-label="Saved State Name"
              type="text"
              placeholder="Name current state (e.g., 66Ma K-Pg)..."
              value={stateNameInput}
              onChange={(e) => setStateNameInput(e.target.value)}
              style={{
                flex: 1,
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                padding: '4px 6px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '10px',
              }}
            />
            <button
              onClick={handleSaveCurrentState}
              data-testid="save-state-button"
              style={{
                background: '#1e293b',
                color: '#34d399',
                border: '1px solid #10b981',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              Save
            </button>
          </div>

          {/* 3. Saved States List */}
          <div
            style={{
              maxHeight: '90px',
              overflowY: 'auto',
              border: '1px solid #1e293b',
              borderRadius: '3px',
              background: '#05070d',
            }}
          >
            {savedStates.length === 0 ? (
              <div style={{ padding: '4px 6px', color: '#64748b', fontSize: '10px' }}>
                No saved states yet. Save a state above to persist across reloads.
              </div>
            ) : (
              savedStates.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 6px',
                    borderBottom: '1px solid #0f172a',
                    fontSize: '10px',
                  }}
                >
                  <span
                    onClick={() => hydrateFromValidatedState(st)}
                    style={{ cursor: 'pointer', color: '#e2e8f0', flex: 1 }}
                    title={`Load ${st.label} (${formatSimulatedTimestamp(
                      st.timestamp,
                      st.timeScale
                    )})`}
                  >
                    <strong>{st.label}</strong> [{st.scenario.type.toUpperCase()}]
                  </span>
                  <button
                    onClick={() => handleDeleteSaved(st.id)}
                    aria-label={`Delete ${st.label}`}
                    style={{
                      background: 'transparent',
                      color: '#f87171',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                    }}
                  >
                    [Del]
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
};