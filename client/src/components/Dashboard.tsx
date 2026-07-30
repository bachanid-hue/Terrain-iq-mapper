import { useState } from 'react';
import type { Collection } from '../../../shared/types';
import ConfirmDialog from './ConfirmDialog';

const TYPE_META: Record<string, { cls: string; short: string }> = {
  'Security Data': { cls: 't-security', short: 'Security' },
  'Positions Data': { cls: 't-positions', short: 'Positions' },
  'Holdings Data': { cls: 't-holdings', short: 'Holdings' },
};

export default function Dashboard({
  collections,
  loading,
  error,
  onOpenCollection,
  onNewCollection,
  onDeleteCollection,
}: {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  onOpenCollection: (id: string) => void;
  onNewCollection: () => void;
  onDeleteCollection: (id: string) => Promise<void>;
}) {
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);

  return (
    <>
      <p className="page-eyebrow">Data Dictionaries</p>
      <div className="row-between">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-sub">
            Every data source starts as a collection: a name, a type, and the field listing that defines it.
            Collections are stored centrally, so everyone using this site sees the same set. Map any two to
            chart the terrain between them.
          </p>
        </div>
        {collections.length > 0 && (
          <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
        )}
      </div>

      {error && <p className="error-text" style={{ marginBottom: 20 }}>{error}</p>}

      {loading ? (
        <p className="page-sub">Loading collections&hellip;</p>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="19" stroke="#98A2AF" strokeWidth="1.3" />
            <circle cx="22" cy="22" r="12" stroke="#98A2AF" strokeWidth="1.3" />
            <circle cx="22" cy="22" r="5" stroke="#98A2AF" strokeWidth="1.3" />
          </svg>
          <div className="em-title">No collections yet</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Create a collection for each data dictionary &mdash; security master, positions, or holdings &mdash;
            and upload its field listing to get started.
          </p>
          <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
        </div>
      ) : (
        <div className="grid">
          {collections.map((c) => {
            const meta = TYPE_META[c.type] || { cls: '', short: c.type };
            const created = new Date(c.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <div className="card" key={c.id} onClick={() => onOpenCollection(c.id)}>
                <div
                  className="card-del"
                  title="Delete collection"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(c);
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M6 4V2.5A1 1 0 017 1.5h2a1 1 0 011 1V4M12.5 4l-.6 9a1 1 0 01-1 .9H5.1a1 1 0 01-1-.9L3.5 4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className={`type-tag ${meta.cls}`}>{meta.short}</span>
                <h3 className="card-name">{c.name}</h3>
                <div className="card-meta">
                  <span><b>{c.fields.length}</b> fields</span>
                  <span>from {c.fileName}</span>
                  <span>created {created}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete collection?"
          message={`This permanently removes "${pendingDelete.name}" along with the field listing parsed from ${pendingDelete.fileName} (${pendingDelete.fields.length} fields), for everyone using this site. This can't be undone.`}
          confirmLabel="Delete Collection"
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            const id = pendingDelete.id;
            setPendingDelete(null);
            await onDeleteCollection(id);
          }}
        />
      )}
    </>
  );
}
