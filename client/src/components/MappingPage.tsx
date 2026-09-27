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
      <h1 className="page-title">Mappings</h1>

      <div className="collections-top-bar">
        <div className="search-box" style={{ flex: 1, margin: 0 }}>
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

      <p className="page-eyebrow" style={{ marginBottom: 10 }}>Saved Mappings</p>
      {loadingSaved ? (
        <p className="page-sub">Loading saved mappings&hellip;</p>
      ) : savedMappings.length === 0 ? (
        <div className="empty-state">
          <div className="em-title">No mappings yet</div>
          <p style={{ maxWidth: 340, margin: '0 auto 18px', fontSize: 13 }}>
            Click &ldquo;New Mapping&rdquo; to compare two collections and save the result here.
          </p>
          <button className="btn btn-primary" onClick={onNewMapping}>+ New Mapping</button>
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
              <tr><th>Mapping</th><th>Saved By</th><th>Saved On</th><th>Fields</th><th></th></tr>
            </thead>
            <tbody>
              {filteredSavedMappings.map((m) => {
                const matched = m.rows.filter((r) => r.sourceField && r.sourceField !== 'Not In Scope').length;
                const savedOn = new Date(m.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                });
                return (
                  <tr key={m.id} className="clickable-row" onClick={() => setViewingSaved(m)}>
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
                      </button>{' '}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--rose)' }}
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteSaved(m); }}
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
    </>
  );
}
