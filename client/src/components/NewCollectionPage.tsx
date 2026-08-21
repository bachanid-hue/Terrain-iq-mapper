import { useEffect, useRef, useState } from 'react';
import type {
  Collection,
  CollectionType,
  CollectionSource,
  InternalOrExternalType,
  CollectionStatus,
  Field,
  FieldDataType,
  FieldKind,
  Category,
  SourceSystem,
} from '../../../shared/types';
import { parseFieldsFromFile } from '../lib/parseExcel';
import { api } from '../lib/api';

const ADD_NEW_CATEGORY = '__add_new_category__';
const ADD_NEW_SOURCE_SYSTEM = '__add_new_source_system__';

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
    clientType: InternalOrExternalType;
    status: CollectionStatus;
    fileName: string;
    fields: Field[];
    createdBy: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollectionType | ''>('');
  const [source, setSource] = useState<CollectionSource | ''>('');
  const [clientType, setClientType] = useState<InternalOrExternalType | ''>('');
  const [status, setStatus] = useState<CollectionStatus | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [sourceSystems, setSourceSystems] = useState<SourceSystem[]>([]);
  const [loadingSourceSystems, setLoadingSourceSystems] = useState(true);
  const [addingSourceSystem, setAddingSourceSystem] = useState(false);
  const [newSourceSystemName, setNewSourceSystemName] = useState('');
  const [sourceSystemError, setSourceSystemError] = useState<string | null>(null);
  const [sourceSystemSaving, setSourceSystemSaving] = useState(false);
  const [fields, setFields] = useState<Field[] | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
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

  function handleCategorySelect(value: string) {
    if (value === ADD_NEW_CATEGORY) {
      setAddingCategory(true);
      setNewCategoryName('');
      setCategoryError(null);
      return;
    }
    setType(value as CollectionType);
  }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategorySaving(true);
    setCategoryError(null);
    try {
      const created = await api.createCategory({ name: trimmed, createdBy: 'Test User' });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setType(created.name);
      setAddingCategory(false);
      setNewCategoryName('');
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'Failed to add category.');
    } finally {
      setCategorySaving(false);
    }
  }

  function handleSourceSystemSelect(value: string) {
    if (value === ADD_NEW_SOURCE_SYSTEM) {
      setAddingSourceSystem(true);
      setNewSourceSystemName('');
      setSourceSystemError(null);
      return;
    }
    setSource(value as CollectionSource);
  }

  async function handleAddSourceSystem() {
    const trimmed = newSourceSystemName.trim();
    if (!trimmed) return;
    setSourceSystemSaving(true);
    setSourceSystemError(null);
    try {
      const created = await api.createSourceSystem({ name: trimmed, createdBy: 'Test User' });
      setSourceSystems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSource(created.name);
      setAddingSourceSystem(false);
      setNewSourceSystemName('');
    } catch (e) {
      setSourceSystemError(e instanceof Error ? e.message : 'Failed to add source system.');
    } finally {
      setSourceSystemSaving(false);
    }
  }

  const detailsComplete = trimmedName.length > 0 && !!type && !!source && !!clientType && !!status;

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
    !!type &&
    !!source &&
    !!clientType &&
    !!status &&
    !!fields &&
    selectedCount > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave || !fields || !fileName || !type || !source || !clientType || !status) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        type,
        source,
        clientType,
        status,
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
    setClientType('');
    setStatus('');
    setAddingCategory(false);
    setNewCategoryName('');
    setCategoryError(null);
    setAddingSourceSystem(false);
    setNewSourceSystemName('');
    setSourceSystemError(null);
    setFields(null);
    setSelected([]);
    setFileName(null);
    setError(null);
    setDragOver(false);
    setSaving(false);
  }

  return (
    <>
      <div className="back-link" onClick={onCancel}>&larr; All collections</div>
      <p className="page-eyebrow">Data Dictionaries</p>
      <h1 className="page-title">New Collection</h1>
      <p className="page-sub">Define a data dictionary by name, category, and source system, then upload its field listing.</p>

      <div className="details-box">
        <h2 className="details-box-title">Collection Details</h2>

        <div className="details-grid">
          <div className="field-group">
            <label className="field-label">Name</label>
            <input
              type="text"
              placeholder="e.g. Corebridge SMF"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {isDuplicateName && (
              <p className="error-text">
                A collection named "{trimmedName}" already exists. Choose a different name.
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Category</label>
            {!addingCategory ? (
              <select
                value={type}
                disabled={loadingCategories}
                onChange={(e) => handleCategorySelect(e.target.value)}
              >
                <option value="" disabled hidden>
                  {loadingCategories ? 'Loading categories\u2026' : '\u2014 Select a category \u2014'}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value={ADD_NEW_CATEGORY}>+ Add New Category</option>
              </select>
            ) : (
              <div className="add-category-form">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCategoryName}
                  autoFocus
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                    if (e.key === 'Escape') { setAddingCategory(false); setCategoryError(null); }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!newCategoryName.trim() || categorySaving}
                  onClick={handleAddCategory}
                >
                  {categorySaving ? 'Adding\u2026' : 'Add'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setAddingCategory(false); setCategoryError(null); }}
                >
                  Cancel
                </button>
              </div>
            )}
            {categoryError && <p className="error-text">{categoryError}</p>}
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Source System</label>
            {!addingSourceSystem ? (
              <select
                value={source}
                disabled={loadingSourceSystems}
                onChange={(e) => handleSourceSystemSelect(e.target.value)}
              >
                <option value="" disabled hidden>
                  {loadingSourceSystems ? 'Loading source systems\u2026' : '\u2014 Select Source System \u2014'}
                </option>
                {sourceSystems.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                <option value={ADD_NEW_SOURCE_SYSTEM}>+ Add New Source System</option>
              </select>
            ) : (
              <div className="add-category-form">
                <input
                  type="text"
                  placeholder="New source system name"
                  value={newSourceSystemName}
                  autoFocus
                  onChange={(e) => setNewSourceSystemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddSourceSystem(); }
                    if (e.key === 'Escape') { setAddingSourceSystem(false); setSourceSystemError(null); }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!newSourceSystemName.trim() || sourceSystemSaving}
                  onClick={handleAddSourceSystem}
                >
                  {sourceSystemSaving ? 'Adding\u2026' : 'Add'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setAddingSourceSystem(false); setSourceSystemError(null); }}
                >
                  Cancel
                </button>
              </div>
            )}
            {sourceSystemError && <p className="error-text">{sourceSystemError}</p>}
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Type</label>
            <select value={clientType} onChange={(e) => setClientType(e.target.value as InternalOrExternalType)}>
              <option value="" disabled hidden>&mdash; Select a type &mdash;</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
            </select>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CollectionStatus)}>
              <option value="" disabled hidden>&mdash; Select a status &mdash;</option>
              <option value="Draft">Draft</option>
              <option value="Live">Live</option>
            </select>
          </div>
        </div>
      </div>

      {detailsComplete && (
        <div className="details-box">
          <h2 className="details-box-title">Upload Collection</h2>

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
              <span className="fc-count">{fields.length} fields found in Row 1</span>
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
        <div className="details-box">
          <div className="toolbar" style={{ marginBottom: 8, alignItems: 'baseline' }}>
            <h2 className="details-box-title" style={{ margin: 0 }}>Collection Fields</h2>
            <span className="fdim" style={{ fontSize: 12 }}>{selectedCount} of {fields.length} selected</span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto' }} className="field-table">
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
                        <option value="Text">Text</option>
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

      <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Collection'}
        </button>
        <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
      </div>
    </>
  );
}
