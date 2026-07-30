import { useMemo, useState } from 'react';
import type { Collection, MappingRow } from '../../../shared/types';
import { fieldScore } from '../../../shared/matching';
import { api } from '../lib/api';
import { exportMappingToExcel } from '../lib/exportMapping';

function ConfidenceBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="badge-none">&mdash;</span>;
  const tier = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';
  const color = tier === 'high' ? 'var(--teal)' : tier === 'mid' ? 'var(--brass-bright)' : 'var(--rose)';
  const activeRings = tier === 'high' ? 3 : tier === 'mid' ? 2 : 1;
  const circles = [0, 1, 2].map((i) => {
    const r = 13 - i * 4;
    const active = i < activeRings;
    return (
      <circle
        key={i}
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={active ? color : '#3a4451'}
        strokeWidth="1.6"
        strokeDasharray={active ? '' : '2,2'}
        opacity={active ? 1 : 0.6}
      />
    );
  });
  return (
    <span className="confidence-badge">
      <svg width="26" height="26" viewBox="0 0 32 32">{circles}</svg>
      <span className="conf-num" style={{ color }}>{pct}%</span>
    </span>
  );
}

function StatusPill({ status }: { status: MappingRow['status'] }) {
  if (status === 'auto') return <span className="status-pill auto">Auto-matched</span>;
  if (status === 'manual') return <span className="status-pill manual">Manual</span>;
  return <span className="status-pill unmatched">Unmatched</span>;
}

function FieldColumn({ collection, roleLabel }: { collection: Collection | undefined; roleLabel: string }) {
  if (!collection) {
    return (
      <div className="field-preview-col">
        <div className="fp-head fp-head-empty"><span className="fp-role">{roleLabel}</span></div>
        <div className="fp-empty">No collection selected yet</div>
      </div>
    );
  }
  return (
    <div className="field-preview-col">
      <div className="fp-head">
        <div>
          <span className="fp-role">{roleLabel}</span>
          <span className="fp-title">{collection.name}</span>
        </div>
        <span className="fp-count">{collection.fields.length} fields</span>
      </div>
      <div className="fp-list">
        {collection.fields.length ? (
          collection.fields.map((f, i) => (
            <div className="fp-item" key={`${f.name}-${i}`}>
              <span className="fp-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="fp-name">{f.name}</span>
            </div>
          ))
        ) : (
          <div className="fp-empty">No fields in this collection.</div>
        )}
      </div>
    </div>
  );
}

export default function MappingPage({
  collections,
  onNewCollection,
}: {
  collections: Collection[];
  onNewCollection: () => void;
}) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [rows, setRows] = useState<MappingRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = collections.find((c) => c.id === sourceId);
  const target = collections.find((c) => c.id === targetId);
  const bothChosen = sourceId !== '' && targetId !== '';
  const sameCollection = bothChosen && sourceId === targetId;

  const matchedCount = rows ? rows.filter((r) => r.targetField).length : 0;
  const avgConf = useMemo(() => {
    if (!rows) return 0;
    const matched = rows.filter((r) => r.targetField);
    if (!matched.length) return 0;
    return Math.round(matched.reduce((s, r) => s + (r.confidence || 0), 0) / matched.length);
  }, [rows]);
  const unmappedTargets = useMemo(() => {
    if (!rows || !target) return [];
    return target.fields.filter((tf) => !rows.some((r) => r.targetField === tf.name)).map((tf) => tf.name);
  }, [rows, target]);

  if (collections.length < 2) {
    return (
      <>
        <p className="page-eyebrow">AI Field Matching</p>
        <h1 className="page-title">Map Collections</h1>
        <p className="page-sub">You need at least two collections before you can run a mapping. Create another collection to continue.</p>
        <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
      </>
    );
  }

  async function runMatch() {
    setError(null);
    if (!bothChosen) {
      setError('Please select both a source and target collection.');
      return;
    }
    if (sameCollection) {
      setError('You cannot map the source collection to itself. Choose a different target collection.');
      return;
    }
    setRunning(true);
    try {
      const result = await api.runMapping(sourceId, targetId);
      setRows(result.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run matching.');
    } finally {
      setRunning(false);
    }
  }

  function updateRowTarget(idx: number, newTargetName: string) {
    if (!rows) return;
    const next = [...rows];
    const row = { ...next[idx] };
    if (!newTargetName) {
      row.targetField = '';
      row.confidence = null;
      row.status = 'unmatched';
    } else {
      row.targetField = newTargetName;
      row.confidence = Math.round(fieldScore(row.sourceField, newTargetName) * 100);
      row.status = 'manual';
    }
    next[idx] = row;
    setRows(next);
  }

  return (
    <>
      <p className="page-eyebrow">AI Field Matching</p>
      <h1 className="page-title">Map Collections</h1>
      <p className="page-sub">
        Select a source and target collection. Terrain IQ compares field names using synonym mapping, token
        overlap, and string similarity to suggest a match &mdash; then you can adjust any pairing by hand.
      </p>

      <div className="map-selectors">
        <div>
          <label className="field-label">Source Collection</label>
          <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setRows(null); setError(null); }}>
            <option value="">&mdash; Select a collection &mdash;</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </select>
        </div>
        <div className="map-arrow">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 10h16M12 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <label className="field-label">Target Collection</label>
          <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setRows(null); setError(null); }}>
            <option value="">&mdash; Select a collection &mdash;</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="map-cta">
        <button className="btn btn-primary" disabled={!bothChosen || sameCollection || running} onClick={runMatch}>
          {running ? 'Matching…' : 'Run AI Matching'}
        </button>
      </div>
      <div style={{ textAlign: 'right' }}>
        {error && <p className="error-text">{error}</p>}
        {sameCollection && !error && (
          <p className="error-text">You cannot map the source collection to itself. Choose a different target collection.</p>
        )}
      </div>

      {(sourceId || targetId) && (
        <>
          <p className="page-eyebrow" style={{ marginTop: 4 }}>Field Listings</p>
          <div className="field-preview-panels">
            <FieldColumn collection={source} roleLabel="Source" />
            <FieldColumn collection={target} roleLabel="Target" />
          </div>
        </>
      )}

      {rows && source && target && (
        <>
          <div className="stat-strip">
            <div className="stat"><div className="s-num">{source.fields.length}</div><div className="s-lbl">Source Fields</div></div>
            <div className="stat"><div className="s-num">{matchedCount}</div><div className="s-lbl">Matched</div></div>
            <div className="stat"><div className="s-num">{source.fields.length - matchedCount}</div><div className="s-lbl">Unmatched</div></div>
            <div className="stat"><div className="s-num">{avgConf}%</div><div className="s-lbl">Avg. Confidence</div></div>
          </div>
          <div className="toolbar">
            <p className="page-eyebrow" style={{ margin: 0 }}>{source.name} &rarr; {target.name}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => exportMappingToExcel(source, target, rows)}>
              Export Mapping (.xlsx)
            </button>
          </div>
          <div className="mapping-table">
            <table>
              <thead>
                <tr><th>Source Field</th><th>Mapped To</th><th>Confidence</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.sourceField}-${i}`}>
                    <td className="fname">{r.sourceField}</td>
                    <td>
                      <select
                        style={{ minWidth: 180 }}
                        value={r.targetField}
                        onChange={(e) => updateRowTarget(i, e.target.value)}
                      >
                        <option value="">&mdash; No match &mdash;</option>
                        {target.fields.map((tf) => (
                          <option key={tf.name} value={tf.name}>{tf.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><ConfidenceBadge pct={r.confidence} /></td>
                    <td><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {unmappedTargets.length > 0 && (
            <div className="unmapped-box">
              <h4>Unmapped fields in {target.name}</h4>
              <div className="chip-row">
                {unmappedTargets.map((n) => <span className="chip" key={n}>{n}</span>)}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
