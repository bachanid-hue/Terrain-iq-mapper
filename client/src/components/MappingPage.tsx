import { useEffect, useMemo, useState } from 'react';
import type { Collection, MappingRow, SavedMapping } from '../../../shared/types';
import { fieldScore } from '../../../shared/matching';
import { api } from '../lib/api';
import { exportMappingToExcel } from '../lib/exportMapping';
import ConfirmDialog from './ConfirmDialog';
import { StatusPill } from './MappingBadges';
import SavedMappingModal from './SavedMappingModal';

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
  // Accepted checkbox per row — keyed by a stable id (row index for matched
  // rows, field name for the unmapped-target rows below them), storing only
  // overrides. Defaults to checked whenever a row's status is Matched.
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  // Which metric is currently filtering the grid — 'all' shows everything.
  const [statusFilter, setStatusFilter] = useState<'all' | 'Matched' | 'Unmatched' | 'Not In Scope'>('all');
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

  // Only Live collections are eligible for mapping — Draft (and anything
  // not explicitly Live, e.g. legacy collections from before Status existed)
  // are excluded from the Source/Target dropdowns entirely.
  const liveCollections = collections.filter((c) => c.status === 'Live');

  const source = liveCollections.find((c) => c.id === sourceId);
  const target = liveCollections.find((c) => c.id === targetId);
  const bothChosen = sourceId !== '' && targetId !== '';
  const sameCollection = bothChosen && sourceId === targetId;

  const notInScopeCount = rows ? rows.filter((r) => r.sourceField === 'Not In Scope').length : 0;
  // A row counts as Matched when it has a real source field assigned — the
  // destination side is always populated now (that's the whole point), so
  // it can no longer be what determines match status.
  const matchedCount = rows ? rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope').length : 0;
  // Every row is one Destination field, always — that's the guaranteed total.
  const totalFields = target ? target.fields.length : 0;
  const unmatchedCount = totalFields - matchedCount - notInScopeCount;
  const matchedPct = totalFields > 0 ? Math.round((matchedCount / totalFields) * 100) : 0;
  // Not In Scope's percentage isn't displayed anywhere, but we still need it
  // rounded here so Unmatched can be derived as "whatever's left" rather
  // than rounded independently — that's what guarantees Matched% + Unmatched%
  // always sum to exactly 100% (minus Not In Scope's own hidden share),
  // instead of each landing on its own rounded value and occasionally
  // overshooting 100% together (e.g. 87.5% and 12.5% both rounding up).
  const notInScopePctInternal = totalFields > 0 ? Math.round((notInScopeCount / totalFields) * 100) : 0;
  const unmatchedPct = totalFields > 0 ? Math.max(0, 100 - matchedPct - notInScopePctInternal) : 0;
  // "Completed" work is anything resolved one way or another — matched or
  // deliberately excluded — as opposed to Unmatched, which is still pending.
  const pctCompleted = totalFields > 0 ? Math.round(((matchedCount + notInScopeCount) / totalFields) * 100) : 0;
  const avgConf = useMemo(() => {
    if (!rows) return 0;
    const matched = rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope');
    if (!matched.length) return 0;
    return Math.round(matched.reduce((s, r) => s + (r.confidence || 0), 0) / matched.length);
  }, [rows]);

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

  if (liveCollections.length === 0) {
    return (
      <>
        <p className="page-eyebrow">AI Field Matching</p>
        <h1 className="page-title">Map Collections</h1>
        <p className="page-sub" style={{ color: 'var(--rose)', fontWeight: 600 }}>Currently no Live Collections exist. Only collections marked Live are available for mapping.</p>
        <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
      </>
    );
  }

  if (liveCollections.length < 2) {
    return (
      <>
        <p className="page-eyebrow">AI Field Matching</p>
        <h1 className="page-title">Map Collections</h1>
        <p className="page-sub">You need at least two Live collections before you can run a mapping. Create another collection, or mark an existing one Live, to continue.</p>
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
      setAccepted({});
      setStatusFilter('all');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run matching.');
    } finally {
      setRunning(false);
    }
  }

  // A row is "Matched" (per the Status pill) whenever it has any confidence
  // above 0 — same rule used there, so Accepted defaults to match it.
  function defaultAccepted(_confidence: number | null): boolean {
    return false;
  }
  function isAccepted(key: string, defaultVal: boolean): boolean {
    return key in accepted ? accepted[key] : defaultVal;
  }
  function toggleAccepted(key: string, defaultVal: boolean) {
    setAccepted((prev) => ({ ...prev, [key]: !isAccepted(key, defaultVal) }));
  }

  const acceptedKeys = rows ? rows.flatMap((r, i) => (r.sourceField ? [`row-${i}`] : [])) : [];
  const allAcceptedChecked = acceptedKeys.length > 0 && acceptedKeys.every((key) => isAccepted(key, false));
  const acceptedCount = acceptedKeys.filter((key) => isAccepted(key, false)).length;
  const acceptedPct = acceptedKeys.length > 0 ? Math.round((acceptedCount / acceptedKeys.length) * 100) : 0;

  function toggleAllAccepted() {
    const next = !allAcceptedChecked;
    setAccepted((prev) => {
      const updated = { ...prev };
      acceptedKeys.forEach((key) => {
        updated[key] = next;
      });
      return updated;
    });
  }

  // Mirrors exactly what the Status pill displays, so clicking a metric
  // filters to precisely the rows showing that pill. Destination is always
  // populated now, so match status is entirely about whether Source is set.
  function rowStatusLabel(r: MappingRow): 'Matched' | 'Unmatched' | 'Not In Scope' {
    if (r.sourceField === 'Not In Scope') return 'Not In Scope';
    if (r.sourceField) return 'Matched';
    return 'Unmatched';
  }

  function toggleStatusFilter(status: 'Matched' | 'Unmatched' | 'Not In Scope') {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
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

  function updateRowSource(idx: number, newSourceName: string) {
    if (!rows) return;
    const next = [...rows];
    const row = { ...next[idx] };
    if (!newSourceName) {
      row.sourceField = '';
      row.confidence = null;
      row.status = 'unmatched';
      row.reason = 'Cleared by you — no source field is currently selected.';
      setAccepted((prev) => ({ ...prev, [`row-${idx}`]: false }));
    } else if (newSourceName === 'Not In Scope') {
      row.sourceField = 'Not In Scope';
      row.confidence = null;
      row.status = 'unmatched';
      row.reason = 'Marked as Not In Scope by you.';
    } else {
      row.sourceField = newSourceName;
      if (row.targetField) {
        row.confidence = Math.round(fieldScore(newSourceName, row.targetField) * 100);
        row.status = 'manual';
        row.reason = 'Manually selected by you, overriding the suggested match.';
      }
    }
    next[idx] = row;
    setRows(next);
  }

  async function handleAskAI(idx: number) {
    if (!rows || !source) return;
    const row = rows[idx];
    setAskingIndex(idx);
    setError(null);
    try {
      // The destination is this row's fixed identity now, so we ask the
      // opposite direction from before: given this destination field name,
      // which source field is the best conceptual match? The endpoint
      // itself is just comparing two field-name lists, so it works the same
      // either way — only the result's meaning flips (a suggested source,
      // never a suggested destination).
      const result = await api.askAI(row.targetField, source.fields.map((f) => f.name));
      const next = [...rows];
      if (result.targetField) {
        next[idx] = {
          sourceField: result.targetField,
          targetField: row.targetField,
          confidence: result.confidence,
          status: 'ai',
          reason: result.reason,
        };
      } else {
        next[idx] = {
          sourceField: '',
          targetField: row.targetField,
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
        rows,
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
      <div className="row-between">
        <div>
          <h1 className="page-title">Map Collections</h1>
          <p className="page-sub">
            Select a source and target collection. Terrain IQ compares field names using synonym mapping, token
            overlap, and string similarity to suggest a match &mdash; then you can adjust any pairing by hand.
          </p>
        </div>
        <button className="btn btn-primary" disabled={!bothChosen || sameCollection || running} onClick={runMatch}>
          {running ? 'Mapping…' : 'New Mapping'}
        </button>
      </div>

      <div className="map-selectors">
        <div>
          <label className="field-label">Source Collection</label>
          <select
            value={sourceId}
            onChange={(e) => {
              const newSourceId = e.target.value;
              setSourceId(newSourceId);
              // If the newly picked source is what's currently sitting in
              // Target, that selection is no longer valid — Target's list
              // is about to exclude it, so clear it rather than leave a
              // stale, now-invisible selection.
              if (newSourceId && newSourceId === targetId) setTargetId('');
              setRows(null);
              setError(null);
              setSaveStatus(null);
            }}
          >
            <option value="">&mdash; Select a collection &mdash;</option>
            {liveCollections.map((c) => (
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
          <label className="field-label">Destination Collection</label>
          <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setRows(null); setError(null); setSaveStatus(null); }}>
            <option value="">&mdash; Select a collection &mdash;</option>
            {liveCollections.filter((c) => c.id !== sourceId).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {error && <p className="error-text">{error}</p>}
        {sameCollection && !error && (
          <p className="error-text">You cannot map the source collection to itself. Choose a different target collection.</p>
        )}
      </div>

      <div style={{ marginTop: 36 }}>
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
                  const matched = m.rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope').length;
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

      {rows && source && target && (
        <>
          <div className="stat-strip">
            <div
              className={`stat stat-link ${statusFilter === 'all' ? 'stat-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="s-num">{target.fields.length}</div><div className="s-lbl">Destination Fields</div>
            </div>
            <div
              className={`stat stat-link ${statusFilter === 'Matched' ? 'stat-active' : ''}`}
              onClick={() => toggleStatusFilter('Matched')}
            >
              <div className="s-num">{matchedCount} <span className="s-pct">({matchedPct}%)</span></div><div className="s-lbl">Matched</div>
            </div>
            <div
              className={`stat stat-link ${statusFilter === 'Unmatched' ? 'stat-active' : ''}`}
              onClick={() => toggleStatusFilter('Unmatched')}
            >
              <div className="s-num">{unmatchedCount} <span className="s-pct">({unmatchedPct}%)</span></div><div className="s-lbl">Unmatched</div>
            </div>
            <div
              className={`stat stat-link ${statusFilter === 'Not In Scope' ? 'stat-active' : ''}`}
              onClick={() => toggleStatusFilter('Not In Scope')}
            >
              <div className="s-num">{notInScopeCount}</div><div className="s-lbl">Not In Scope</div>
            </div>
            <div className="stat">
              <div className="s-num">{acceptedCount} <span className="s-pct">({acceptedPct}%)</span></div><div className="s-lbl">Accepted</div>
            </div>
            <div className="stat">
              <div className="s-num">{pctCompleted}%</div><div className="s-lbl">Completed</div>
            </div>
          </div>
          <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => exportMappingToExcel(source.name, target.name, rows)}>
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
                <tr>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={allAcceptedChecked}
                        onChange={toggleAllAccepted}
                        aria-label="Accept or unaccept all rows"
                      />
                      Accepted
                    </span>
                  </th>
                  <th><span style={{ fontWeight: 800 }}>(Source)</span> {source.name}</th><th><span style={{ fontWeight: 800 }}>(Destination)</span> {target.name}</th><th>Status</th><th>Why</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  if (statusFilter !== 'all' && rowStatusLabel(r) !== statusFilter) return null;
                  const isLowConfidence = r.sourceField !== 'Not In Scope' && r.status !== 'ai' && (r.status === 'unmatched' || (r.confidence !== null && r.confidence < 70));
                  const acceptedKey = `row-${i}`;
                  const acceptedDefault = defaultAccepted(r.confidence);
                  return (
                  <tr key={`${r.targetField}-${i}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isAccepted(acceptedKey, acceptedDefault)}
                        onChange={() => toggleAccepted(acceptedKey, acceptedDefault)}
                        disabled={!r.sourceField}
                        title={!r.sourceField ? 'Select a source field or mark Not In Scope before accepting' : undefined}
                        aria-label={`Accept mapping for ${r.sourceField || 'this row'}`}
                      />
                    </td>
                    <td>
                      <select
                        style={{ minWidth: 180 }}
                        value={r.sourceField}
                        onChange={(e) => updateRowSource(i, e.target.value)}
                      >
                        <option value="" disabled hidden>&mdash; No match &mdash;</option>
                        <option value="Not In Scope">&mdash; Not In Scope &mdash;</option>
                        {source.fields.map((sf) => (
                          <option key={sf.name} value={sf.name}>{sf.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="fname">{r.targetField.toUpperCase()}</td>
                    <td><StatusPill confidence={r.confidence} notInScope={r.sourceField === 'Not In Scope'} /></td>
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
                {statusFilter !== 'all' && !rows.some((r) => rowStatusLabel(r) === statusFilter) && (
                  <tr>
                    <td colSpan={5} className="fdim" style={{ textAlign: 'center', padding: '24px 16px' }}>
                      No fields match the "{statusFilter}" filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
