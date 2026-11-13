import React, { useMemo, useState } from 'react';
import rawAttributionsMarkdown from '../../docs/attributions.md?raw';

export interface ParsedAttributionRow {
  sourceId: string;
  title: string;
  category: string;
  epistemicClass: string;
  license: string;
  citation: string;
}

/**
 * Parses the Markdown registry table directly from `docs/attributions.md`.
 */
export function parseAttributionsMarkdownTable(markdown: string): ParsedAttributionRow[] {
  const lines = markdown.split('\n').map((l) => l.trim());
  const rows: ParsedAttributionRow[] = [];

  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---') || line.includes('Source ID')) {
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim().replace(/^`|`$/g, ''));
    
    // Validate we have the 6 required columns
    if (cells.length >= 6) {
      rows.push({
        sourceId: cells[0],
        title: cells[1],
        category: cells[2],
        epistemicClass: cells[3],
        license: cells[4],
        citation: cells[5],
      });
    }
  }
  return rows;
}

export const AttributionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const rows = useMemo(
    () => parseAttributionsMarkdownTable(rawAttributionsMarkdown),
    []
  );

  if (!isOpen) return null;

  const filtered = rows.filter(
    (r) =>
      r.sourceId.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.epistemicClass.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.license.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-label="Dataset and Texture Attributions"
      data-testid="attributions-modal"
      style={{
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(960px, 95vw)',
        maxHeight: '82vh',
        overflowY: 'auto',
        background: 'rgba(10, 15, 29, 0.98)',
        border: '1px solid #10b981',
        borderRadius: '6px',
        padding: '16px',
        zIndex: 35,
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e2e8f0',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#34d399', fontSize: '14px' }}>
            ATTRIBUTIONS & DATASET LICENSE REGISTRY (GENERATED FROM docs/attributions.md)
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
            Chronoterra source code is MIT-licensed. Every scientific dataset, ephemeris, and
            texture retains its original upstream license tracked below.
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

      <div style={{ marginTop: '10px' }}>
        <input
          aria-label="Filter Attributions"
          type="text"
          placeholder="Filter by source ID, dataset title, epistemic class, or license..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #334155',
            padding: '6px 10px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        />
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
          fontSize: '11px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#34d399' }}>
            <th style={{ padding: '6px' }}>Source ID</th>
            <th style={{ padding: '6px' }}>Dataset / Asset</th>
            <th style={{ padding: '6px' }}>Epistemic Class</th>
            <th style={{ padding: '6px' }}>Upstream License</th>
            <th style={{ padding: '6px' }}>Citation / Attribution</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.sourceId} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '6px', color: '#38bdf8' }}>
                <code>{row.sourceId}</code>
              </td>
              <td style={{ padding: '6px', fontWeight: 'bold' }}>{row.title}</td>
              <td style={{ padding: '6px', color: '#fde047' }}>{row.epistemicClass}</td>
              <td style={{ padding: '6px', color: '#cbd5e1' }}>{row.license}</td>
              <td style={{ padding: '6px', color: '#94a3b8' }}>{row.citation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};