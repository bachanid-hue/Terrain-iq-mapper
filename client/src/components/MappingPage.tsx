import { useEffect, useMemo, useState } from 'react';
import type { SavedMapping } from '../../../shared/types';
import { api } from '../lib/api';
import { exportMappingToExcel } from '../lib/exportMapping';
import ConfirmDialog from './ConfirmDialog';
import SavedMappingModal from './SavedMappingModal';

export default function MappingPage({ onNewMapping }: { onNewMapping: () => void }) {
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [mappingQuery, setMappingQuery] = useState('');
  const [pendingDeleteSaved, setPendingDeleteSaved] = useState<SavedMapping | null>(null);
  const [viewingSaved, setViewingSaved] = useState<SavedMapping | null>(null);
  const [editNotice, setEditNotice] = useState(false);

  // "Edit" is a work-in-progress feature for now — clicking it should never
  // navigate anywhere or open another screen, just surface a brief notice,
  // matching the same action on the Collections grid.
  useEffect(() => {
    if (!editNotice) return;
    const t = setTimeout(() => setEditNotice(false), 3000);
    return () => clearTimeout(t);
  }, [editNotice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listSavedMappings();
        if (!cancelled) setSavedMappings(data);
      } catch {
        /* saved-mappings list is supplementary; a failure here shouldn't block the page */
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSavedMappings = useMemo(() => {
    const q = mappingQuery.trim().toLowerCase();
    if (!q) return savedMappings;
    return savedMappings.filter((m) => {
      const savedOn = new Date(m.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      const haystack = [m.sourceName, m.targetName, m.savedBy, savedOn].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [savedMappings, mappingQuery]);

  async function handleDeleteSavedMapping(id: string) {
    await api.deleteSavedMapping(id);
    setSavedMappings((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <>
      <div className="collections-header-group">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Mappings</h1>
          {savedMappings.length > 0 && (
            <span className="fdim" style={{ fontSize: 13 }}>({savedMappings.length})</span>
          )}
        </div>

        {savedMappings.length > 0 && (
          <div className="collections-top-bar">
            <div className="search-box" style={{ flex: '0 1 560px', margin: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search mappings by name, creator, or date..."
                value={mappingQuery}
                onChange={(e) => setMappingQuery(e.target.value)}
              />
              {mappingQuery && (
                <span className="search-box-clear" onClick={() => setMappingQuery('')} title="Clear search">&times;</span>
              )}
            </div>
            <button className="btn btn-primary" onClick={onNewMapping}>+ New Mapping</button>
          </div>
        )}
      </div>

      <p className="page-eyebrow" style={{ marginBottom: 10 }}>Saved Mappings</p>
      {loadingSaved ? (
        <p className="page-sub">Loading saved mappings&hellip;</p>
      ) : savedMappings.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No Saved Mappings</div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onNewMapping}>+ New Mapping</button>
        </div>
      ) : filteredSavedMappings.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No mappings match "{mappingQuery}"</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Try a different name, creator, or date.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => setMappingQuery('')}>Clear search</button>
        </div>
      ) : (
        <div className="field-table">
          <table>
            <thead>
              <tr><th>Actions</th><th>Mapping</th><th>Saved By</th><th>Saved On</th><th>Fields</th><th></th></tr>
            </thead>
            <tbody>
              {filteredSavedMappings.map((m) => {
                const matched = m.rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope').length;
                const savedOn = new Date(m.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                });
                return (
                  <tr key={m.id} className="clickable-row" onClick={() => setViewingSaved(m)}>
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                      <span className="row-actions">
                        <button
                          className="icon-btn"
                          title="View"
                          aria-label="View"
                          style={{ color: 'var(--brass-bright)' }}
                          onClick={() => setViewingSaved(m)}
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
                          onClick={() => setPendingDeleteSaved(m)}
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
                    <td className="fname">{m.sourceName} &rarr; {m.targetName}</td>
                    <td className="fdim">{m.savedBy}</td>
                    <td className="fdim">{savedOn}</td>
                    <td className="fdim">{matched}/{m.rows.length} matched</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); exportMappingToExcel(m.sourceName, m.targetName, m.rows); }}
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pendingDeleteSaved && (
        <ConfirmDialog
          title="Delete saved mapping?"
          message={`This removes the saved mapping "${pendingDeleteSaved.sourceName} \u2192 ${pendingDeleteSaved.targetName}" saved by ${pendingDeleteSaved.savedBy}. This can't be undone.`}
          confirmLabel="Delete Mapping"
          onCancel={() => setPendingDeleteSaved(null)}
          onConfirm={async () => {
            const id = pendingDeleteSaved.id;
            setPendingDeleteSaved(null);
            await handleDeleteSavedMapping(id);
          }}
        />
      )}

      {viewingSaved && (
        <SavedMappingModal mapping={viewingSaved} onClose={() => setViewingSaved(null)} />
      )}

      {editNotice && (
        <div className="toast-notice" role="status">
          Edit feature is work in progress.
        </div>
      )}
    </>
  );
}
