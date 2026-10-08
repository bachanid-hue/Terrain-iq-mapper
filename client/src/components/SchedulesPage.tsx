import { useEffect, useState } from 'react';

// Placeholder columns (copied from the Collections grid). These will be
// replaced with real schedule columns once the data model exists.
const COLUMNS = ['Actions', 'Status', 'Name', 'Version', 'Category', 'Source System', 'Source Type', 'Created On', 'Created By'];

export default function SchedulesPage() {
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(false), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // No schedule data model yet, so the grid has no rows.
  const rows: never[] = [];

  return (
    <div className="collections-page">
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Schedules</h1>
        </div>

        <div className="collections-top-bar">
          <div className="search-box" style={{ flex: '0 1 560px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search Schedules"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <span className="search-box-clear" onClick={() => setQuery('')} title="Clear search">&times;</span>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setNotice(true)}>+ New Schedule</button>
        </div>
      </div>

      <div className="grid-box">
        <div className="grid-box-header">
          <div className="grid-box-title">
            <span className="cdb-accent" />
            <h2>All Schedules</h2>
          </div>
          <span className="grid-box-count">
            {rows.length} {rows.length === 1 ? 'Schedule' : 'Schedules'}
          </span>
        </div>
        <div className="grid-box-divider" />
        <div className="field-table">
          <table>
            <thead>
              <tr>{COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>

      {notice && (
        <div className="toast-notice" role="status">
          New Schedule feature is work in progress.
        </div>
      )}
    </div>
  );
}
