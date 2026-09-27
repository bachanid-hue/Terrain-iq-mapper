export default function SchedulesPage() {
  return (
    <>
      <h1 className="page-title">Schedules</h1>
      <p className="page-sub">Automate recurring collections and mappings &mdash; set them to run on a schedule instead of by hand.</p>

      <div className="empty-state">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="19" stroke="var(--text-faint)" strokeWidth="1.3" />
          <path d="M22 12v10l7 4" stroke="var(--text-faint)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="em-title">Coming soon</div>
        <p style={{ maxWidth: 340, margin: '0 auto', fontSize: 13 }}>
          Scheduling isn&rsquo;t built yet. This will let you run collections and mappings automatically on a
          recurring basis.
        </p>
      </div>
    </>
  );
}
