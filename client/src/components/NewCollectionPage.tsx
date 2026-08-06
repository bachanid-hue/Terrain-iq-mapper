import { useRef, useState } from 'react';
import type { Collection, CollectionType, CollectionSource, ClientOrVendorType, Field, FieldDataType, FieldKind } from '../../../shared/types';
import { parseFieldsFromFile } from '../lib/parseExcel';

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
    clientType: ClientOrVendorType;
    fileName: string;
    fields: Field[];
    createdBy: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollectionType | ''>('');
  const [source, setSource] = useState<CollectionSource | ''>('');
  // clientType only matters when source is anything other than Corebridge —
  // when source is Corebridge, Type is forced to "Client" below (see
  // effectiveClientType) and the field is disabled.
  const [clientType, setClientType] = useState<ClientOrVendorType | ''>('');
  const [fields, setFields] = useState<Field[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const isDuplicateName =
    trimmedName.length > 0 && collections.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());

  // Type is forced to "Client" and disabled when Source is Corebridge.
  // For any other source (or no source chosen yet), Type is user-editable.
  const typeIsEditable = source !== 'Corebridge';
  const effectiveClientType: ClientOrVendorType | '' = typeIsEditable ? clientType : 'Client';

  function handleSourceChange(newSource: CollectionSource) {
    setSource(newSource);
    setClientType(''); // reset either way — effectiveClientType forces 'Client' when Corebridge regardless
  }

  const detailsComplete = trimmedName.length > 0 && !!type && !!source && !!effectiveClientType;

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseFieldsFromFile(file);
      if (!parsed.length) {
        setError('No fields could be read from Row 1 of this file. Check that its first row contains field names.');
        return;
      }
      setFields(parsed);
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

  const canSave =
    trimmedName.length > 0 &&
    !isDuplicateName &&
    !!type &&
    !!source &&
    !!effectiveClientType &&
    !!fields &&
    fields.length > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave || !fields || !fileName || !type || !source || !effectiveClientType) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        type,
        source,
        clientType: effectiveClientType,
        fileName,
        fields,
        createdBy: '',
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
    setFields(null);
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
      <p className="page-sub">Define a data dictionary by name, category, and source, then upload its field listing.</p>

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
            <select value={type} onChange={(e) => setType(e.target.value as CollectionType)}>
              <option value="" disabled hidden>&mdash; Select a category &mdash;</option>
              <option value="Security Master">Security Master</option>
              <option value="Transactions">Transactions</option>
              <option value="Sync Schedule">Sync Schedule</option>
              <option value="Amortization Schedule">Amortization Schedule</option>
              <option value="Cancel Schedule">Cancel Schedule</option>
            </select>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Source</label>
            <select value={source} onChange={(e) => handleSourceChange(e.target.value as CollectionSource)}>
              <option value="" disabled hidden>&mdash; Select a source &mdash;</option>
              <option value="Corebridge">Corebridge</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Type</label>
            <select
              value={effectiveClientType}
              disabled={!typeIsEditable}
              onChange={(e) => setClientType(e.target.value as ClientOrVendorType)}
            >
              {!typeIsEditable ? (
                <option value="Client">Client</option>
              ) : (
                <>
                  <option value="" disabled hidden>&mdash; Select a type &mdash;</option>
                  <option value="Client">Client</option>
                  <option value="Vendor">Vendor</option>
                </>
              )}
            </select>
            {!typeIsEditable && (
              <p className="field-hint">Automatically set to Client when Source is Corebridge.</p>
            )}
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
            <>
              <div className="file-chip">
                <span className="fc-name">{fileName}</span>
                <span className="fc-count">{fields.length} fields found in Row 1</span>
                <span
                  className="fc-clear"
                  title="Remove file"
                  onClick={() => { setFields(null); setFileName(null); setError(null); }}
                >
                  &times;
                </span>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto', marginTop: 12 }} className="field-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th>Field Name</th>
                      <th style={{ width: 130 }}>Data Type</th>
                      <th style={{ width: 110 }}>Field Type</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, i) => (
                      <tr key={`${f.name}-${i}`}>
                        <td className="fdim" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="fname">{f.name.toUpperCase()}</td>
                        <td>
                          <select
                            value={f.dataType || 'String'}
                            onChange={(e) => updateFieldMeta(i, { dataType: e.target.value as FieldDataType })}
                          >
                            <option value="String">String</option>
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
            </>
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
