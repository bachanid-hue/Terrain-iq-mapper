import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
  const [helpNotice, setHelpNotice] = useState(false);

  // Pinned stack: title/buttons (top 0) -> Mapping Details card -> Field Mapping
  // header + metrics. Each layer sticks just below the one above it, so their
  // offsets are measured from the real rendered heights.
  const navRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [navH, setNavH] = useState(147);
  const fmRef = useRef<HTMLDivElement>(null);
  const [detailsH, setDetailsH] = useState(0);
  const [fmH, setFmH] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (navRef.current) setNavH(navRef.current.offsetHeight);
      if (detailsRef.current) setDetailsH(detailsRef.current.offsetHeight);
      if (fmRef.current) setFmH(fmRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    if (detailsRef.current) ro.observe(detailsRef.current);
    if (fmRef.current) ro.observe(fmRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  });

  useEffect(() => {
    if (!helpNotice) return;
    const t = setTimeout(() => setHelpNotice(false), 3000);
    return () => clearTimeout(t);
  }, [helpNotice]);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedMapping, setSavedMapping] = useState<SavedMapping | null>(null);

  const liveCollections = collections.filter((c) => c.status === 'Live');

  const source = liveCollections.find((c) => c.id === sourceId);
  const target = liveCollections.find((c) => c.id === targetId);
  const bothChosen = sourceId !== '' && targetId !== '';
  const sameCollection = bothChosen && sourceId === targetId;

  // As soon as both collections are chosen, run the field mapping automatically.
  useEffect(() => {
    if (!sourceId || !targetId || sourceId === targetId) {
      setRunning(false);
      return;
    }
    let cancelled = false;
    setRunning(true);
    setError(null);
    setSaveStatus(null);
    setSavedMapping(null);
    (async () => {
      try {
        const result = await api.runMapping(sourceId, targetId);
        if (cancelled) return;
        setRows(result.rows);
        setAccepted({});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to run matching.');
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, targetId]);

  if (liveCollections.length === 0) {
    return (
      <>
        <h1 className="page-title">New Mapping</h1>
        <p className="page-sub" style={{ color: 'var(--rose)', fontWeight: 600 }}>Currently no Live Collections exist. Only collections marked Live are available for mapping.</p>
        <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
      </>
    );
  }

  if (liveCollections.length < 2) {
    return (
      <>
        <h1 className="page-title">New Mapping</h1>
        <p className="page-sub">You need at least two Live collections before you can run a mapping. Create another collection, or mark an existing one Live, to continue.</p>
        <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
      </>
    );
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

  // Summary metrics for the Field Mapping bar. Matched / Unmatched / Not In
  // Scope partition the destination fields; Accepted counts ticked rows.
  const totalFields = rows ? rows.length : 0;
  const matchedCount = rows ? rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope').length : 0;
  const notInScopeCount = rows ? rows.filter((r) => r.sourceField === 'Not In Scope').length : 0;
  const unmatchedCount = totalFields - matchedCount - notInScopeCount;
  const acceptedCount = rows ? rows.filter((r, i) => !!r.sourceField && isAccepted(`row-${i}`, false)).length : 0;
  const pct = (n: number) => (totalFields ? Math.round((n / totalFields) * 100) : 0);
  const metrics = [
    { label: 'Destination Fields', count: totalFields, pct: totalFields ? 100 : 0 },
    { label: 'Matched', count: matchedCount, pct: pct(matchedCount) },
    { label: 'Unmatched', count: unmatchedCount, pct: pct(unmatchedCount) },
    { label: 'Not In Scope', count: notInScopeCount, pct: pct(notInScopeCount) },
    { label: 'Accepted', count: acceptedCount, pct: pct(acceptedCount) },
  ];

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
      <div className="nc-header" ref={navRef}>
        <h1 className="page-title" style={{ margin: 0 }}>New Mapping</h1>
        <div className="nc-actions">
          <button className="btn btn-primary" disabled={!showResults || saving || !!savedMapping} onClick={handleSaveMapping}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 2.5h8l2.5 2.5v8a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M5 2.5v3.5h5V2.5M5 13.5V9h6v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={resetForm}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13.8 2.2v3.1h-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reset
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Cancel
          </button>
        </div>
      </div>

      <div className="details-box cd-box md-sticky" ref={detailsRef} style={{ top: navH }}>
        <div className="cdb-header cdb-header-split">
          <div className="cdb-header-left">
            <span className="cdb-accent" />
            <h2 className="cdb-title">Mapping Details</h2>
          </div>
          <a
            href="#"
            className="cd-help-link"
            title="Help"
            aria-label="Help"
            onClick={(e) => { e.preventDefault(); setHelpNotice(true); }}
          >
            ?
          </a>
        </div>
        <div className="cdb-divider" />

        <div className="map-selectors map-selectors-flat">
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
                <option key={c.id} value={c.id}>{c.source} - {c.name}</option>
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
                <option key={c.id} value={c.id}>{c.source} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {running && <p className="page-sub" style={{ marginTop: 20 }}>Mapping fields&hellip;</p>}

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
          <div className="details-box cd-box" style={{ marginTop: 24 }}>
            <div className="fm-sticky" ref={fmRef} style={{ top: navH + detailsH }}>
              <div className="cdb-header cdb-header-split">
                <div className="cdb-header-left">
                  <span className="cdb-accent" />
                  <h2 className="cdb-title">Field Mapping</h2>
                </div>
                <a
                  href="#"
                  className="cd-help-link"
                  title="Help"
                  aria-label="Help"
                  onClick={(e) => { e.preventDefault(); setHelpNotice(true); }}
                >
                  ?
                </a>
              </div>
              <div className="cdb-divider" style={{ marginBottom: 18 }} />

              <div className="metric-bar">
                {metrics.map((m) => (
                  <div className="metric" key={m.label}>
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value">
                      {m.count} <span className="metric-pct">({m.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mapping-table" style={{ '--th-top': `${navH + detailsH + fmH}px` } as CSSProperties}>
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
          </div>

          {saveStatus && (
            <p className={saveStatus.type === 'error' ? 'error-text' : 'success-text'} style={{ marginTop: 16 }}>
              {saveStatus.message}
              {savedMapping && saveStatus.type === 'success' && (
                <> &mdash; <span className="clickable-row" style={{ display: 'inline', textDecoration: 'underline' }} onClick={onCancel}>view it in Mappings</span></>
              )}
            </p>
          )}

        </>
      )}

      {helpNotice && (
        <div className="toast-notice" role="status">
          <span aria-hidden="true" style={{ marginRight: 8, fontSize: 16, verticalAlign: '-2px' }}>&#128522;</span>
          Help is on its way
        </div>
      )}
    </>
  );
}
