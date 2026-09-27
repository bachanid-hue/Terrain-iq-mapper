import { useMemo, useState } from 'react';
import type { Collection } from '../../../shared/types';
import ConfirmDialog from './ConfirmDialog';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function dash(v: string | undefined | null): string {
  return v && v.trim() ? v : '\u2014';
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
      const haystack = [c.name, c.type, c.status, c.createdBy, formatDate(c.createdAt), c.fileName]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [collections, query]);

  return (
    <>
      <h1 className="page-title">Collections</h1>

      {collections.length > 0 && (
        <div className="collections-top-bar">
          <div className="search-box" style={{ flex: 1, margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search collections by name, type, status, creator, date, or file..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <span className="search-box-clear" onClick={() => setQuery('')} title="Clear search">&times;</span>
            )}
          </div>
          <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
        </div>
      )}

      {error && <p className="error-text" style={{ marginBottom: 20 }}>{error}</p>}

      {loading ? (
        <p className="page-sub">Loading collections&hellip;</p>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="19" stroke="var(--text-faint)" strokeWidth="1.3" />
            <circle cx="22" cy="22" r="12" stroke="var(--text-faint)" strokeWidth="1.3" />
            <circle cx="22" cy="22" r="5" stroke="var(--text-faint)" strokeWidth="1.3" />
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
            Try a different name, type, status, creator, date, or file name.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <>
          <p className="page-eyebrow" style={{ marginBottom: 10 }}>Collections</p>
          <div className="field-table">
            <table>
              <thead>
                <tr>
                  <th>Collection Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Fields</th>
                  <th>Created By</th>
                  <th>Created On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const statusKey = (c.status || '').toLowerCase();
                  return (
                    <tr key={c.id} className="clickable-row" onClick={() => onOpenCollection(c.id)}>
                      <td className="fname">{c.name}</td>
                      <td className="fdim">{dash(c.type)}</td>
                      <td>
                        {c.status ? (
                          <span className={`cc-status cc-status-${statusKey}`}>{c.status.toUpperCase()}</span>
                        ) : (
                          <span className="fdim">&mdash;</span>
                        )}
                      </td>
                      <td className="fdim">{c.fields.length}</td>
                      <td className="fdim">{dash(c.createdBy)}</td>
                      <td className="fdim">{formatDate(c.createdAt)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--rose)' }}
                          onClick={(e) => { e.stopPropagation(); setPendingDelete(c); }}
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
        </>
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
