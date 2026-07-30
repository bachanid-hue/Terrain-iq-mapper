import { useState } from 'react';
import type { Collection } from '../../../shared/types';
import ConfirmDialog from './ConfirmDialog';

const TYPE_META: Record<string, { cls: string; short: string }> = {
  'Security Data': { cls: 't-security', short: 'Security' },
  'Positions Data': { cls: 't-positions', short: 'Positions' },
  'Holdings Data': { cls: 't-holdings', short: 'Holdings' },
};

export default function CollectionDetail({
  collection,
  collections,
  onBack,
  onDelete,
  onRename,
}: {
  collection: Collection | null;
  collections: Collection[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  if (!collection) {
    return <p className="page-sub">Collection not found.</p>;
  }

  const meta = TYPE_META[collection.type] || { cls: '', short: collection.type };

  const trimmedEditValue = editValue.trim();
  const isDuplicateName =
    trimmedEditValue.length > 0 &&
    trimmedEditValue.toLowerCase() !== collection.name.toLowerCase() &&
    collections.some((c) => c.id !== collection.id && c.name.toLowerCase() === trimmedEditValue.toLowerCase());

  function startEditing() {
    setEditValue(collection!.name);
    setRenameError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setRenameError(null);
  }

  async function saveEditing() {
    if (!trimmedEditValue || isDuplicateName || trimmedEditValue === collection!.name) {
      if (trimmedEditValue === collection!.name) setEditing(false);
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      await onRename(collection!.id, trimmedEditValue);
      setEditing(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : 'Failed to rename collection.');
    } finally {
      setRenaming(false);
    }
  }

  return (
    <>
      <div className="back-link" onClick={onBack}>&larr; All collections</div>
      <div className="detail-head">
        <div style={{ flex: 1, minWidth: 260 }}>
          <span className={`type-tag ${meta.cls}`}>{meta.short}</span>

          {editing ? (
            <div style={{ marginTop: 10, maxWidth: 480 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button className="btn btn-primary btn-sm" disabled={!trimmedEditValue || isDuplicateName || renaming} onClick={saveEditing}>
                  {renaming ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>Cancel</button>
              </div>
              {isDuplicateName && (
                <p className="error-text">A collection named "{trimmedEditValue}" already exists. Choose a different name.</p>
              )}
              {renameError && <p className="error-text">{renameError}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>{collection.name}</h1>
              <button className="btn btn-ghost btn-sm" title="Edit collection name" onClick={startEditing}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                  <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Edit name
              </button>
            </div>
          )}

          <p className="page-sub" style={{ marginBottom: 0, marginTop: 8 }}>
            {collection.fields.length} fields read from Row 1 of{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{collection.fileName}</span>
          </p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>Delete collection</button>
      </div>
      <div className="field-grid">
        {collection.fields.map((f, i) => (
          <div className="field-grid-item" key={`${f.name}-${i}`}>
            <span className="fi-idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="fi-name">{f.name}</span>
          </div>
        ))}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete collection?"
          message={`This permanently removes "${collection.name}" along with the field listing parsed from ${collection.fileName} (${collection.fields.length} fields), for everyone using this site. This can't be undone.`}
          confirmLabel="Delete Collection"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            setConfirming(false);
            await onDelete(collection.id);
          }}
        />
      )}
    </>
  );
}
