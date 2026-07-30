import type { View } from '../App';

export default function Sidebar({
  view,
  collectionCount,
  onNavigate,
}: {
  view: View;
  collectionCount: number;
  onNavigate: (v: View) => void;
}) {
  const collectionsActive = view === 'dashboard' || view === 'newCollection' || view === 'collectionDetail';

  return (
    <aside className="sidebar">
      <div className="brand">
        <svg className="brand-mark" width="30" height="30" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#C9A15C" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="9.5" fill="none" stroke="#C9A15C" strokeWidth="1.6" opacity="0.75" />
          <circle cx="16" cy="16" r="5" fill="none" stroke="#C9A15C" strokeWidth="1.6" opacity="0.55" />
          <circle cx="16" cy="16" r="1.6" fill="#E0BA79" />
        </svg>
        <div className="brand-name">
          Terrain IQ
          <em>Mapper</em>
        </div>
      </div>
      <div className="sidebar-divider" />
      <nav className="nav">
        <div
          className={`nav-item ${collectionsActive ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Collections
          <span className="nav-count">{collectionCount}</span>
        </div>
        <div className={`nav-item ${view === 'mapping' ? 'active' : ''}`} onClick={() => onNavigate('mapping')}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 8c2-4 4 4 6 0s4-4 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="2" cy="8" r="1.3" fill="currentColor" />
            <circle cx="14" cy="8" r="1.3" fill="currentColor" />
          </svg>
          Map Collections
        </div>
      </nav>
      <div className="sidebar-foot">
        <strong>Terrain IQ Mapper</strong>
        <br />
        Shared data-dictionary reconciliation for asset management collections. Collections are stored centrally
        and visible to everyone using this site.
      </div>
    </aside>
  );
}
