import { useEffect, useMemo, useState } from 'react';
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
  onEditCollection: (id: string) => void;
  onNewCollection: () => void;
  onDeleteCollection: (id: string) => Promise<void>;
}) {
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [editNotice, setEditNotice] = useState(false);

  // "Edit" is a work-in-progress feature for now — clicking it should never
  // navigate anywhere or open another screen, just surface a brief notice.
  useEffect(() => {
    if (!editNotice) return;
    const t = setTimeout(() => setEditNotice(false), 3000);
    return () => clearTimeout(t);
  }, [editNotice]);
  const [query, setQuery] = useState('');

  // Search matches every column shown in the grid below: Status, Name,
  // Version, Category, Source System, Source Type, Created On, Created By.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => {
      const haystack = [
        c.status,
        c.name,
        c.version,
        c.type,
        c.source,
        c.sourceType,
        formatDate(c.createdAt),
        c.createdBy,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [collections, query]);

  return (
    <>
      <div className="collections-header-group">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>All Collections</h1>
          {collections.length > 0 && (
            <span className="fdim" style={{ fontSize: 13 }}>({collections.length})</span>
          )}
        </div>

        {collections.length > 0 && (
          <div className="collections-top-bar">
            <div className="search-box" style={{ flex: '0 1 560px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by status, name, version, category, source system, source type, date, or creator..."
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
      </div>

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
          <div className="em-title">No Saved Collections</div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onNewCollection}>+ New Collection</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No collections match "{query}"</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Try a different status, name, version, category, source system, source type, date, or creator.
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
                  <th>Actions</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Version</th>
                  <th>Category</th>
                  <th>Source System</th>
                  <th>Source Type</th>
                  <th>Created On</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const statusKey = (c.status || '').toLowerCase();
                  return (
                    <tr key={c.id} className="clickable-row" onClick={() => onOpenCollection(c.id)}>
                      <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                        <span className="row-actions">
                          <button
                            className="icon-btn"
                            title="View"
                            aria-label="View"
                            style={{ color: 'var(--brass-bright)' }}
                            onClick={() => onOpenCollection(c.id)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                              <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn"
                            title="Edit"
                            aria-label="Edit"
                            style={{ color: 'var(--yellow)' }}
                            onClick={() => setEditNotice(true)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn"
                            title="Delete"
                            aria-label="Delete"
                            style={{ color: 'var(--rose)' }}
                            onClick={() => setPendingDelete(c)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M2.5 4.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              <path d="M6.2 4.5V3.2a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M3.6 4.5h8.8l-.7 8.3a1.3 1.3 0 0 1-1.3 1.2H5.6a1.3 1.3 0 0 1-1.3-1.2l-.7-8.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                              <path d="M6.4 7v4M8 7v4M9.6 7v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      </td>
                      <td>
                        {c.status ? (
                          <span className={`cc-status cc-status-${statusKey}`}>{c.status.toUpperCase()}</span>
                        ) : (
                          <span className="fdim">&mdash;</span>
                        )}
                      </td>
                      <td className="fname">{c.name}</td>
                      <td className="fdim">{dash(c.version)}</td>
                      <td className="fdim">{dash(c.type)}</td>
                      <td className="fdim">{dash(c.source)}</td>
                      <td className="fdim">{dash(c.sourceType)}</td>
                      <td className="fdim">{formatDate(c.createdAt)}</td>
                      <td className="fdim">{dash(c.createdBy)}</td>
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

      {editNotice && (
        <div className="toast-notice" role="status">
          Edit feature is work in progress.
        </div>
      )}
    </>
  );
}
