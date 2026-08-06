import { useEffect, useMemo, useState } from 'react';
import type { Collection, MappingRow, SavedMapping } from '../../../shared/types';
import { fieldScore } from '../../../shared/matching';
import { api } from '../lib/api';
import { exportMappingToExcel } from '../lib/exportMapping';
import ConfirmDialog from './ConfirmDialog';
import { ConfidenceBadge, StatusPill } from './MappingBadges';
import SavedMappingModal from './SavedMappingModal';

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
              <span className="fp-name">{f.name.toUpperCase()}</span>
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
  const [askingIndex, setAskingIndex] = useState<number | null>(null);

  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingOpen, setSavingOpen] = useState(false);
  const [savedByInput, setSavedByInput] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingDeleteSaved, setPendingDeleteSaved] = useState<SavedMapping | null>(null);
  const [viewingSaved, setViewingSaved] = useState<SavedMapping | null>(null);

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

  // Full snapshot used for export and save — includes target fields that
  // never got matched by any source field, not just the editable source rows.
  const fullRows = useMemo(() => {
    if (!rows) return [];
    const extra: MappingRow[] = unmappedTargets.map((n) => ({
      sourceField: '',
      targetField: n,
      confidence: null,
      status: 'unmatched',
      reason: 'No source field scored high enough confidence to suggest a match to this field.',
    }));
    return [...rows, ...extra];
  }, [rows, unmappedTargets]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listSavedMappings();
        if (!cancelled) setSavedMappings(data);
      } catch {
        /* saved-mappings list is supplementary; a failure here shouldn't block the page */
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setSaveStatus(null);
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
      row.reason = 'Cleared by you — no target field is currently selected.';
    } else {
      row.targetField = newTargetName;
      row.confidence = Math.round(fieldScore(row.sourceField, newTargetName) * 100);
      row.status = 'manual';
      row.reason = 'Manually selected by you, overriding the suggested match.';
    }
    next[idx] = row;
    setRows(next);
  }

  async function handleAskAI(idx: number) {
    if (!rows || !target) return;
    const row = rows[idx];
    setAskingIndex(idx);
    setError(null);
    try {
      const result = await api.askAI(row.sourceField, target.fields.map((f) => f.name));
      const next = [...rows];
      if (result.targetField) {
        next[idx] = {
          sourceField: row.sourceField,
          targetField: result.targetField,
          confidence: result.confidence,
          status: 'ai',
          reason: result.reason,
        };
      } else {
        next[idx] = {
          sourceField: row.sourceField,
          targetField: '',
          confidence: null,
          status: 'unmatched',
          reason: result.reason,
        };
      }
      setRows(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get an AI suggestion.');
    } finally {
      setAskingIndex(null);
    }
  }

  async function handleSaveMapping() {
    if (!source || !target || !rows) return;
    const trimmed = savedByInput.trim();
    if (!trimmed) return;
    setSaveBusy(true);
    setSaveStatus(null);
    try {
      const saved = await api.saveMapping({
        sourceId: source.id,
        targetId: target.id,
        sourceName: source.name,
        targetName: target.name,
        rows: fullRows,
        savedBy: trimmed,
      });
      setSavedMappings((prev) => [saved, ...prev]);
      setSaveStatus({ type: 'success', message: `Mapping saved by ${trimmed}.` });
      setSavingOpen(false);
      setSavedByInput('');
    } catch (e) {
      setSaveStatus({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save mapping.' });
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleDeleteSavedMapping(id: string) {
    await api.deleteSavedMapping(id);
    setSavedMappings((prev) => prev.filter((m) => m.id !== id));
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
          <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setRows(null); setError(null); setSaveStatus(null); }}>
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
          <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setRows(null); setError(null); setSaveStatus(null); }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => exportMappingToExcel(source.name, target.name, fullRows)}>
                Export Mapping (.xlsx)
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setSavingOpen(true); setSaveStatus(null); }}>
                Save Mapping
              </button>
            </div>
          </div>

          {savingOpen && (
            <div className="save-mapping-form">
              <input
                type="text"
                placeholder="Your name"
                value={savedByInput}
                autoFocus
                onChange={(e) => setSavedByInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMapping(); if (e.key === 'Escape') setSavingOpen(false); }}
              />
              <button className="btn btn-primary btn-sm" disabled={!savedByInput.trim() || saveBusy} onClick={handleSaveMapping}>
                {saveBusy ? 'Saving…' : 'Confirm Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSavingOpen(false); setSavedByInput(''); }}>Cancel</button>
            </div>
          )}
          {saveStatus && (
            <p className={saveStatus.type === 'error' ? 'error-text' : 'success-text'} style={{ textAlign: 'right' }}>
              {saveStatus.message}
            </p>
          )}

          <div className="mapping-table">
            <table>
              <thead>
                <tr><th>Source Field</th><th>Mapped To</th><th>Confidence</th><th>Status</th><th>Why</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isLowConfidence = r.status !== 'ai' && (r.status === 'unmatched' || (r.confidence !== null && r.confidence < 70));
                  return (
                  <tr key={`${r.sourceField}-${i}`}>
                    <td className="fname">{r.sourceField.toUpperCase()}</td>
                    <td>
                      <select
                        style={{ minWidth: 180 }}
                        value={r.targetField}
                        onChange={(e) => updateRowTarget(i, e.target.value)}
                      >
                        <option value="">&mdash; No match &mdash;</option>
                        {target.fields.map((tf) => (
                          <option key={tf.name} value={tf.name}>{tf.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td><ConfidenceBadge pct={r.confidence} /></td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="match-reason">
                      {r.reason}
                      {isLowConfidence && (
                        <div>
                          <button
                            className="ask-ai-btn"
                            disabled={askingIndex === i}
                            onClick={() => handleAskAI(i)}
                          >
                            {askingIndex === i ? 'Asking AI…' : '✨ Ask AI'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {unmappedTargets.map((n) => (
                  <tr key={`unmapped-${n}`}>
                    <td className="fdim">&mdash; No source field &mdash;</td>
                    <td className="fname">{n.toUpperCase()}</td>
                    <td><ConfidenceBadge pct={null} /></td>
                    <td><StatusPill status="unmatched" /></td>
                    <td className="match-reason">No source field scored high enough confidence to suggest a match to this field.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ marginTop: 56 }}>
        <div className="toolbar">
          <p className="page-eyebrow" style={{ margin: 0 }}>Saved Mappings</p>
        </div>
        {loadingSaved ? (
          <p className="page-sub">Loading saved mappings&hellip;</p>
        ) : savedMappings.length === 0 ? (
          <p className="page-sub">
            No mappings have been saved yet. Run a mapping above, then click &ldquo;Save Mapping&rdquo; to keep a
            shared record of it.
          </p>
        ) : (
          <div className="field-table">
            <table>
              <thead>
                <tr><th>Mapping</th><th>Saved By</th><th>Saved On</th><th>Fields</th><th></th></tr>
              </thead>
              <tbody>
                {savedMappings.map((m) => {
                  const matched = m.rows.filter((r) => r.targetField).length;
                  const savedOn = new Date(m.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  });
                  return (
                    <tr key={m.id} className="clickable-row" onClick={() => setViewingSaved(m)}>
                      <td className="fname">{m.sourceName} &rarr; {m.targetName}</td>
                      <td className="fdim">{m.savedBy}</td>
                      <td className="fdim">{savedOn}</td>
                      <td className="fdim">{matched}/{m.rows.length} matched</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); exportMappingToExcel(m.sourceName, m.targetName, m.rows); }}
                        >
                          Export
                        </button>{' '}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--rose)' }}
                          onClick={(e) => { e.stopPropagation(); setPendingDeleteSaved(m); }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingDeleteSaved && (
        <ConfirmDialog
          title="Delete saved mapping?"
          message={`This removes the saved mapping "${pendingDeleteSaved.sourceName} \u2192 ${pendingDeleteSaved.targetName}" saved by ${pendingDeleteSaved.savedBy}. This can't be undone.`}
          confirmLabel="Delete Mapping"
          onCancel={() => setPendingDeleteSaved(null)}
          onConfirm={async () => {
            const id = pendingDeleteSaved.id;
            setPendingDeleteSaved(null);
            await handleDeleteSavedMapping(id);
          }}
        />
      )}

      {viewingSaved && (
        <SavedMappingModal mapping={viewingSaved} onClose={() => setViewingSaved(null)} />
      )}
    </>
  );
}
