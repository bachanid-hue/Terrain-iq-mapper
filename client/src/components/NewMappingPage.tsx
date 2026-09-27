import { useState } from 'react';
import type { Collection, MappingRow, SavedMapping } from '../../../shared/types';
import { fieldScore } from '../../../shared/matching';
import { api } from '../lib/api';
import { StatusPill } from './MappingBadges';

export default function NewMappingPage({
  collections,
  onCancel,
  onNewCollection,
}: {
  collections: Collection[];
  onCancel: () => void;
  onNewCollection: () => void;
}) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [rows, setRows] = useState<MappingRow[] | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askingIndex, setAskingIndex] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedMapping, setSavedMapping] = useState<SavedMapping | null>(null);

  const liveCollections = collections.filter((c) => c.status === 'Live');

  const source = liveCollections.find((c) => c.id === sourceId);
  const target = liveCollections.find((c) => c.id === targetId);
  const bothChosen = sourceId !== '' && targetId !== '';
  const sameCollection = bothChosen && sourceId === targetId;

  if (liveCollections.length === 0) {
    return (
      <>
        <div className="back-link" onClick={onCancel}>&larr; All mappings</div>
        <h1 className="page-title">New Mapping</h1>
        <p className="page-sub" style={{ color: 'var(--rose)', fontWeight: 600 }}>Currently no Live Collections exist. Only collections marked Live are available for mapping.</p>
        <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
      </>
    );
  }

  if (liveCollections.length < 2) {
    return (
      <>
        <div className="back-link" onClick={onCancel}>&larr; All mappings</div>
        <h1 className="page-title">New Mapping</h1>
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run matching.');
    } finally {
      setRunning(false);
    }
  }

  function resetForm() {
    setSourceId('');
    setTargetId('');
    setRows(null);
    setAccepted({});
    setError(null);
    setSaveStatus(null);
    setSavedMapping(null);
  }

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

  // No login system exists yet — every saved mapping is attributed to a
  // placeholder user until real auth is built, same as Collections does.
  async function handleSaveMapping() {
    if (!source || !target || !rows) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const saved = await api.saveMapping({
        sourceId: source.id,
        targetId: target.id,
        sourceName: source.name,
        targetName: target.name,
        rows,
        savedBy: 'Test User',
      });
      setSavedMapping(saved);
      setSaveStatus({ type: 'success', message: 'Mapping saved.' });
    } catch (e) {
      setSaveStatus({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save mapping.' });
    } finally {
      setSaving(false);
    }
  }

  const showResults = rows && source && target;

  return (
    <>
      <div className="back-link" onClick={onCancel}>&larr; All mappings</div>
      <h1 className="page-title">New Mapping</h1>

      <div className="map-selectors">
        <div>
          <label className="field-label">Source Collection</label>
          <select
            value={sourceId}
            onChange={(e) => {
              const newSourceId = e.target.value;
              setSourceId(newSourceId);
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

      {!showResults && (
        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={!bothChosen || sameCollection || running} onClick={runMatch}>
            {running ? 'Mapping…' : 'Map Collections'}
          </button>
          <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
        </div>
      )}

      {(error || (sameCollection && !error)) && (
        <div style={{ marginTop: -10, marginBottom: 20 }}>
          {error && <p className="error-text">{error}</p>}
          {sameCollection && !error && (
            <p className="error-text">You cannot map the source collection to itself. Choose a different target collection.</p>
          )}
        </div>
      )}

      {showResults && (
        <>
          <div className="mapping-table" style={{ marginTop: 24 }}>
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
              </tbody>
            </table>
          </div>

          {saveStatus && (
            <p className={saveStatus.type === 'error' ? 'error-text' : 'success-text'} style={{ marginTop: 16 }}>
              {saveStatus.message}
              {savedMapping && saveStatus.type === 'success' && (
                <> &mdash; <span className="clickable-row" style={{ display: 'inline', textDecoration: 'underline' }} onClick={onCancel}>view it in Mappings</span></>
              )}
            </p>
          )}

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-primary" disabled={saving} onClick={handleSaveMapping}>
              {saving ? 'Saving…' : 'Save Mapping'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </>
      )}
    </>
  );
}
