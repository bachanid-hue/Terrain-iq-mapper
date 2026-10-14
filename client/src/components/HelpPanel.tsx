import { useEffect, useMemo, useState } from 'react';

type HelpEntry = { term: string; text: string };
type HelpSection = { title: string; entries: HelpEntry[] };

// Help documentation shown in the slide-out panel. Add more sections here
// as other screens get documented.
const SECTIONS: HelpSection[] = [
  {
    title: 'Collection Details',
    entries: [
      { term: 'Collection Name', text: 'Enter Collection Name' },
      { term: 'Category', text: 'Categorize collections for better organization.' },
      { term: 'Source System', text: 'Track the system where the collection is sourced from.' },
      { term: 'Source Type', text: 'Identify type of source for a collection.' },
      { term: 'Status', text: 'Differentiate between finished collections and work in progress.' },
    ],
  },
];

export default function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      entries: s.entries.filter((e) => `${s.title} ${e.term} ${e.text}`.toLowerCase().includes(q)),
    })).filter((s) => s.entries.length > 0);
  }, [query]);

  return (
    <>
      <div className={`help-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside
        className={`help-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Help"
        aria-hidden={!open}
      >
        <div className="help-head">
          <h2 className="help-title">Help</h2>
          <button className="help-close" onClick={onClose} aria-label="Close help" title="Close">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="help-search">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search Help"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="help-body">
          {sections.length === 0 && <p className="help-empty">No help topics match "{query}".</p>}
          {sections.map((s) => (
            <section key={s.title}>
              <div className="cdb-header" style={{ marginBottom: 12 }}>
                <span className="cdb-accent" />
                <h3 className="cdb-title" style={{ fontSize: 16 }}>{s.title}</h3>
              </div>
              <div className="cdb-divider" style={{ marginBottom: 18 }} />
              {s.entries.map((e) => (
                <div className="help-entry" key={e.term}>
                  <div className="help-term">{e.term}</div>
                  <div className="help-text">{e.text}</div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
