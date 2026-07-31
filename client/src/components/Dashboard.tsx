import { useMemo, useState } from 'react';
import type { Collection } from '../../../shared/types';
import ConfirmDialog from './ConfirmDialog';

const TYPE_META: Record<string, { cls: string; short: string }> = {
  'Security Data': { cls: 't-security', short: 'Security' },
  'Positions Data': { cls: 't-positions', short: 'Positions' },
  'Holdings Data': { cls: 't-holdings', short: 'Holdings' },
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => {
      const haystack = [c.name, c.type, c.createdBy, formatDate(c.createdAt), c.fileName]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [collections, query]);

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

      {collections.length > 0 && (
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search collections by name, type, creator, date, or file..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <span className="search-box-clear" onClick={() => setQuery('')} title="Clear search">&times;</span>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No collections match "{query}"</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Try a different name, type, creator, date, or file name.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((c) => {
            const meta = TYPE_META[c.type] || { cls: '', short: c.type };
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
                  {c.createdBy && <span>by {c.createdBy}</span>}
                  <span>created {formatDate(c.createdAt)}</span>
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
