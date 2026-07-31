import { useMemo, useState } from 'react';
import type { SavedMapping } from '../../../shared/types';
import { ConfidenceBadge, StatusPill } from './MappingBadges';
import { exportMappingToExcel } from '../lib/exportMapping';

const STATUS_LABEL: Record<string, string> = {
  auto: 'Auto-matched',
  manual: 'Manual',
  unmatched: 'Unmatched',
};

export default function SavedMappingModal({
  mapping,
  onClose,
}: {
  mapping: SavedMapping;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const matched = mapping.rows.filter((r) => r.targetField).length;
  const avgConf = matched
    ? Math.round(
        mapping.rows.filter((r) => r.targetField).reduce((s, r) => s + (r.confidence || 0), 0) / matched
      )
    : 0;
  const savedOn = new Date(mapping.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mapping.rows;
    return mapping.rows.filter((r) => {
      const haystack = [r.sourceField, r.targetField, STATUS_LABEL[r.status] || r.status, r.reason]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [mapping.rows, query]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 960 }}>
        <h2>{mapping.sourceName} &rarr; {mapping.targetName}</h2>
        <p className="modal-sub" style={{ marginBottom: 22 }}>
          Saved by {mapping.savedBy} on {savedOn}
        </p>

        <div className="stat-strip" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="s-num">{mapping.rows.length}</div><div className="s-lbl">Total Rows</div></div>
          <div className="stat"><div className="s-num">{matched}</div><div className="s-lbl">Matched</div></div>
          <div className="stat"><div className="s-num">{mapping.rows.length - matched}</div><div className="s-lbl">Unmatched</div></div>
          <div className="stat"><div className="s-num">{avgConf}%</div><div className="s-lbl">Avg. Confidence</div></div>
        </div>

        <div className="search-box" style={{ maxWidth: 'none', margin: '0 0 16px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search fields by name, match status, or why..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <span className="search-box-clear" onClick={() => setQuery('')} title="Clear search">&times;</span>
          )}
        </div>

        <div className="mapping-table" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr><th>Source Field</th><th>Mapped To</th><th>Confidence</th><th>Status</th><th>Why</th></tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="fdim" style={{ textAlign: 'center', padding: '28px 16px' }}>
                    No fields match &ldquo;{query}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={`${r.sourceField}-${r.targetField}-${i}`}>
                    <td className={r.sourceField ? 'fname' : 'fdim'}>
                      {r.sourceField ? r.sourceField.toUpperCase() : '\u2014 No source field \u2014'}
                    </td>
                    <td className={r.targetField ? 'fname' : 'fdim'}>
                      {r.targetField ? r.targetField.toUpperCase() : '\u2014 No match \u2014'}
                    </td>
                    <td><ConfidenceBadge pct={r.confidence} /></td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="match-reason">{r.reason || '\u2014'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-ghost"
            onClick={() => exportMappingToExcel(mapping.sourceName, mapping.targetName, mapping.rows)}
          >
            Export Mapping (.xlsx)
          </button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
