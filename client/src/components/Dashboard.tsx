import { useEffect, useMemo, useState } from 'react';
import type { Collection } from '../../../shared/types';
import ConfirmDialog from './ConfirmDialog';
import { CollectionStatusPill } from './MappingBadges';

function formatDate(ts: number): string {
  // M/D/YYYY
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
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
  onRefresh,
  onDeleteCollection,
}: {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  onOpenCollection: (id: string) => void;
  onEditCollection: (id: string) => void;
  onNewCollection: () => void;
  onRefresh: () => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
}) {
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);
  const [editNotice, setEditNotice] = useState(false);
  const [helpNotice, setHelpNotice] = useState(false);

  // "Edit" is a work-in-progress feature for now — clicking it should never
  // navigate anywhere or open another screen, just surface a brief notice.
  useEffect(() => {
    if (!editNotice) return;
    const t = setTimeout(() => setEditNotice(false), 3000);
    return () => clearTimeout(t);
  }, [editNotice]);

  useEffect(() => {
    if (!helpNotice) return;
    const t = setTimeout(() => setHelpNotice(false), 3000);
    return () => clearTimeout(t);
  }, [helpNotice]);
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
    <div className="collections-page">
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Collections</h1>
        </div>

        {(
          <div className="collections-top-bar">
            <div className="search-box" style={{ flex: '0 1 560px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search Collections"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <span className="search-box-clear" onClick={() => setQuery('')} title="Clear search">&times;</span>
            )}
          </div>
          <button className="btn btn-primary" onClick={onNewCollection}>+ New Collection</button>
          <button className="btn btn-primary btn-refresh" onClick={() => onRefresh()} disabled={loading} title="Refresh">
            <svg className={loading ? 'spin' : undefined} width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13.8 2.2v3.1h-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
          </div>
        )}
      </div>

      {error && <p className="error-text" style={{ marginBottom: 20 }}>{error}</p>}

      {loading && collections.length === 0 ? (
        <p className="page-sub">Loading collections&hellip;</p>
      ) : collections.length > 0 && filtered.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No collections match "{query}"</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Try a different status, name, version, category, source system, source type, date, or creator.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <>
          <div className="grid-box">
          <div className="grid-box-sticky">
            <div className="grid-box-header">
              <div className="grid-box-title">
                <span className="cdb-accent" />
                <h2>All Collections</h2>
              </div>
              <span className="grid-box-right">
                <span className="grid-box-count">
                  {filtered.length} {filtered.length === 1 ? 'Collection' : 'Collections'}
                </span>
                <a
                  href="#"
                  className="cd-help-link"
                  title="Help"
                  aria-label="Help"
                  onClick={(e) => { e.preventDefault(); setHelpNotice(true); }}
                >
                  ?
                </a>
              </span>
            </div>
            <div className="grid-box-divider" />
          </div>
          <div className="field-table">
            <table>
              <thead>
                <tr>
                  <th>Actions</th>
                  <th>Status</th>
                  <th className="col-left">Name</th>
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
                    <tr key={c.id}>
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
                          <CollectionStatusPill status={c.status} />
                        ) : (
                          <span className="fdim">&mdash;</span>
                        )}
                      </td>
                      <td className="fname col-left">{c.name}</td>
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

      {helpNotice && (
        <div className="toast-notice" role="status">
          <span aria-hidden="true" style={{ marginRight: 8, fontSize: 16, verticalAlign: '-2px' }}>&#128522;</span>
          Help is on its way
        </div>
      )}

      {editNotice && (
        <div className="toast-notice" role="status">
          Edit feature is work in progress.
        </div>
      )}
    </div>
  );
}
