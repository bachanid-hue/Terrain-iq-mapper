import { useEffect, useRef, useState } from 'react';
import type {
  Collection,
  CollectionType,
  CollectionSource,
  CollectionStatus,
  SourceType,
  Field,
  FieldDataType,
  FieldKind,
  Category,
  SourceSystem,
} from '../../../shared/types';
import { parseFieldsFromFile } from '../lib/parseExcel';
import { api } from '../lib/api';
import HelpPanel from './HelpPanel';


export default function NewCollectionPage({
  collections,
  onCancel,
  onSave,
}: {
  collections: Collection[];
  onCancel: () => void;
  onSave: (input: {
    name: string;
    type: CollectionType;
    source: CollectionSource;
    status: CollectionStatus;
    sourceType: SourceType;
    fileName: string;
    fields: Field[];
    createdBy: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollectionType | ''>('');
  const [source, setSource] = useState<CollectionSource | ''>('');
  const [status, setStatus] = useState<CollectionStatus | ''>('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [sourceSystems, setSourceSystems] = useState<SourceSystem[]>([]);
  const [loadingSourceSystems, setLoadingSourceSystems] = useState(true);
  const [fields, setFields] = useState<Field[] | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const trimmedType = type.trim();
  const trimmedSource = source.trim();
  const isDuplicateName =
    trimmedName.length > 0 && collections.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listCategories();
        if (!cancelled) setCategories(data);
      } catch {
        /* category list is supplementary to the core form; a failure here shouldn't block the page */
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listSourceSystems();
        if (!cancelled) setSourceSystems(data);
      } catch {
        /* source system list is supplementary to the core form; a failure here shouldn't block the page */
      } finally {
        if (!cancelled) setLoadingSourceSystems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const detailsComplete = trimmedName.length > 0 && !!trimmedType && !!trimmedSource && !!status && !!sourceType;

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseFieldsFromFile(file);
      if (!parsed.length) {
        setError('No fields could be read from Row 1 of this file. Check that its first row contains field names.');
        return;
      }
      setFields(parsed);
      setSelected(new Array(parsed.length).fill(true));
      setFileName(file.name);
    } catch {
      setError("Couldn't read that file. Please upload a valid .xlsx or .xls file.");
    }
  }

  function updateFieldMeta(idx: number, patch: Partial<Field>) {
    if (!fields) return;
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    setFields(next);
  }

  function toggleSelected(idx: number) {
    setSelected((prev) => prev.map((s, i) => (i === idx ? !s : s)));
  }

  function selectAll() {
    if (!fields) return;
    setSelected(new Array(fields.length).fill(true));
  }

  function clearAll() {
    if (!fields) return;
    setSelected(new Array(fields.length).fill(false));
  }

  const selectedFields = fields ? fields.filter((_, i) => selected[i]) : [];
  const selectedCount = selectedFields.length;
  const allSelected = fields !== null && fields.length > 0 && selected.every(Boolean);

  function toggleAll() {
    if (allSelected) {
      clearAll();
    } else {
      selectAll();
    }
  }

  const canSave =
    trimmedName.length > 0 &&
    !isDuplicateName &&
    !!trimmedType &&
    !!trimmedSource &&
    !!status &&
    !!sourceType &&
    !!fields &&
    selectedCount > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave || !fields || !fileName || !trimmedType || !trimmedSource || !status || !sourceType) return;
    setSaving(true);
    setError(null);
    try {
      // A category typed in that doesn't exist yet is created now, as part of
      // saving — it is never written to the database before Save is clicked.
      let categoryName = trimmedType;
      const existing = categories.find((c) => c.name.toLowerCase() === trimmedType.toLowerCase());
      if (existing) {
        categoryName = existing.name;
      } else {
        const created = await api.createCategory({ name: trimmedType, createdBy: 'Test User' });
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        categoryName = created.name;
      }
      let sourceName = trimmedSource;
      const existingSource = sourceSystems.find((x) => x.name.toLowerCase() === trimmedSource.toLowerCase());
      if (existingSource) {
        sourceName = existingSource.name;
      } else {
        const createdSource = await api.createSourceSystem({ name: trimmedSource, createdBy: 'Test User' });
        setSourceSystems((prev) => [...prev, createdSource].sort((a, b) => a.name.localeCompare(b.name)));
        sourceName = createdSource.name;
      }
      await onSave({
        name: trimmedName,
        type: categoryName,
        source: sourceName,
        status,
        sourceType,
        fileName,
        fields: selectedFields,
        // No login system exists yet — every collection is attributed to a
        // placeholder user until real auth is built. Swap this out then.
        createdBy: 'Test User',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save collection.');
      setSaving(false);
    }
  }

  function resetForm() {
    setName('');
    setType('');
    setSource('');
    setStatus('');
    setSourceType('');
    setFields(null);
    setSelected([]);
    setFileName(null);
    setError(null);
    setDragOver(false);
    setSaving(false);
  }

  return (
    <>
      <div className="nc-header">
        <h1 className="page-title" style={{ margin: 0 }}>New Collection</h1>
        <div className="nc-actions">
          <button className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
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

      <div className="details-box cd-box">
        <div className="cdb-header cdb-header-split">
          <div className="cdb-header-left">
            <span className="cdb-accent" />
            <h2 className="cdb-title">Collection Details</h2>
          </div>
          <span className="grid-box-right">
            <span className="cdb-note">Populate all required fields</span>
            <a
              href="#"
              className="cd-help-link"
              title="Help"
              aria-label="Help"
              onClick={(e) => { e.preventDefault(); setHelpOpen(true); }}
            >
              ?
            </a>
          </span>
        </div>
        <div className="cdb-divider" />

        <div className="details-grid">
          <div className="field-group">
            <label className="field-label">Collection Name</label>
            <div className="req-wrap">
              {!trimmedName && <span className="req-flag" data-tip="Required" title="Required" aria-label="Required" />}
              <input
                type="text"
                placeholder="Enter Collection Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {isDuplicateName && (
              <p className="error-text">
                A collection named "{trimmedName}" already exists. Choose a different name.
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Category</label>
            <div className="req-wrap">
              {!trimmedType && <span className="req-flag" data-tip="Required" title="Required" aria-label="Required" />}
              <input
                type="text"
                list="category-options"
                placeholder={loadingCategories ? 'Loading categories\u2026' : 'Select or type a category'}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Source System</label>
            <div className="req-wrap">
              {!trimmedSource && <span className="req-flag" data-tip="Required" title="Required" aria-label="Required" />}
              <input
                type="text"
                list="source-system-options"
                placeholder={loadingSourceSystems ? 'Loading source systems\u2026' : 'Select or type a source system'}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <datalist id="source-system-options">
                {sourceSystems.map((x) => (
                  <option key={x.id} value={x.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Source Type</label>
            <div className="req-wrap">
              {!sourceType && <span className="req-flag" data-tip="Required" title="Required" aria-label="Required" />}
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
                <option value="" disabled hidden>&mdash; Select a source type &mdash;</option>
                <option value="File">File</option>
                <option value="Database">Database</option>
              </select>
            </div>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Status</label>
            <div className="req-wrap">
              {!status && <span className="req-flag" data-tip="Required" title="Required" aria-label="Required" />}
              <select value={status} onChange={(e) => setStatus(e.target.value as CollectionStatus)}>
                <option value="" disabled hidden>&mdash; Select a status &mdash;</option>
                <option value="Draft">Draft</option>
                <option value="Live">Live</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {detailsComplete && (
        <div className="details-box cd-box">
          <div className="cdb-header cdb-header-split">
            <div className="cdb-header-left">
              <span className="cdb-accent" />
              <h2 className="cdb-title">Upload Collection</h2>
            </div>
            <a
              href="#"
              className="cd-help-link"
              title="Help"
              aria-label="Help"
              onClick={(e) => { e.preventDefault(); setHelpOpen(true); }}
            >
              ?
            </a>
          </div>
          <div className="cdb-divider" />

          {!fields ? (
            <div
              className={`dropzone ${dragOver ? 'drag' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 4v13M14 4l-4.5 4.5M14 4l4.5 4.5" stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20v2.5A1.5 1.5 0 005.5 24h17a1.5 1.5 0 001.5-1.5V20" stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div className="dz-main">Drop an .xlsx file, or click to browse</div>
              <div className="dz-sub">Field names should be in Row 1 &mdash; each header cell becomes a field</div>
            </div>
          ) : (
            <div className="file-chip">
              <span className="fc-name">{fileName}</span>
              <span
                className="fc-clear"
                title="Remove file"
                onClick={() => { setFields(null); setSelected([]); setFileName(null); setError(null); }}
              >
                &times;
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {detailsComplete && fields && (
        <div className="details-box cd-box">
          <div className="toolbar" style={{ marginBottom: 16, alignItems: 'center' }}>
            <div className="cdb-header" style={{ marginBottom: 0 }}>
              <span className="cdb-accent" />
              <h2 className="cdb-title">Collection Fields</h2>
            </div>
            <span className="grid-box-right">
              <span className="fdim" style={{ fontSize: 12 }}>{selectedCount} of {fields.length} selected</span>
              <a
              href="#"
              className="cd-help-link"
              title="Help"
              aria-label="Help"
              onClick={(e) => { e.preventDefault(); setHelpOpen(true); }}
            >
              ?
            </a>
            </span>
          </div>
          <div className="cdb-divider" />
          <div className="field-table fields-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Include or exclude all fields"
                      title={allSelected ? 'Exclude all' : 'Include all'}
                    />
                  </th>
                  <th>Field Name</th>
                  <th style={{ width: 130 }}>Data Type</th>
                  <th style={{ width: 110 }}>Value Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={`${f.name}-${i}`} style={{ opacity: selected[i] ? 1 : 0.45 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[i]}
                        onChange={() => toggleSelected(i)}
                        aria-label={`Include ${f.name}`}
                      />
                    </td>
                    <td className="fname">{f.name.toUpperCase()}</td>
                    <td>
                      <select
                        value={f.dataType || 'Text'}
                        onChange={(e) => updateFieldMeta(i, { dataType: e.target.value as FieldDataType })}
                      >
                        <option value="Text">Free Text</option>
                        <option value="Number">Number</option>
                        <option value="Date">Date</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={f.fieldType || 'Text'}
                        onChange={(e) => updateFieldMeta(i, { fieldType: e.target.value as FieldKind })}
                      >
                        <option value="Text">Text</option>
                        <option value="List">List</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Add Description"
                        value={f.description || ''}
                        onChange={(e) => updateFieldMeta(i, { description: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}


      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
