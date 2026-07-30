import { useRef, useState } from 'react';
import type { Collection, CollectionType, Field } from '../../../shared/types';
import { parseFieldsFromFile } from '../lib/parseExcel';

export default function NewCollectionPage({
  collections,
  onCancel,
  onSave,
}: {
  collections: Collection[];
  onCancel: () => void;
  onSave: (input: { name: string; type: CollectionType; fileName: string; fields: Field[] }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollectionType>('Security Data');
  const [fields, setFields] = useState<Field[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const isDuplicateName =
    trimmedName.length > 0 && collections.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());

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

  const canSave = trimmedName.length > 0 && !isDuplicateName && !!fields && fields.length > 0 && !saving;

  async function handleSave() {
    if (!canSave || !fields || !fileName) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmedName, type, fileName, fields });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save collection.');
      setSaving(false);
    }
  }

  return (
    <>
      <div className="back-link" onClick={onCancel}>&larr; All collections</div>
      <p className="page-eyebrow">Data Dictionaries</p>
      <h1 className="page-title">New Collection</h1>
      <p className="page-sub">Define a data dictionary by name, type, and its field listing.</p>

      <div style={{ maxWidth: 640 }}>
        <div className="field-group">
          <label className="field-label">Collection Name</label>
          <input
            type="text"
            placeholder="e.g. Bloomberg Security Master"
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
          <label className="field-label">Collection Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as CollectionType)}>
            <option value="Security Data">Security Data</option>
            <option value="Positions Data">Positions Data</option>
            <option value="Holdings Data">Holdings Data</option>
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Field Listing (Excel)</label>
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
                <path d="M14 4v13M14 4l-4.5 4.5M14 4l4.5 4.5" stroke="#98A2AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20v2.5A1.5 1.5 0 005.5 24h17a1.5 1.5 0 001.5-1.5V20" stroke="#98A2AF" strokeWidth="1.4" strokeLinecap="round" />
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
                onClick={() => { setFields(null); setFileName(null); setError(null); }}
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

        {error && <p className="error-text">{error}</p>}
      </div>

      {fields && fields.length > 0 && (
        <div className="preview-section">
          <div className="toolbar">
            <p className="page-eyebrow" style={{ margin: 0 }}>{fields.length} Fields Detected</p>
          </div>
          <div className="field-grid">
            {fields.map((f, i) => (
              <div className="field-grid-item" key={`${f.name}-${i}`}>
                <span className="fi-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="fi-name">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="modal-actions" style={{ justifyContent: 'flex-start', maxWidth: 640, marginTop: 10 }}>
        <button className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Collection'}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
