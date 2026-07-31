import { useState } from 'react';
import type { View } from '../App';

export default function HomePage({ onEnter }: { onEnter: (v: View) => void }) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function sendContactMessage(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Terrain IQ Mapper — message from ${contactName || 'website visitor'}`);
    const body = encodeURIComponent(`${contactMessage}\n\n— ${contactName}\n${contactEmail}`);
    window.location.href = `mailto:bachani.d@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="home">
      <header className="home-nav">
        <div className="home-nav-brand" onClick={() => scrollTo('home')}>
          <img src="/logo-mark.png" alt="Terrain IQ Mapper" className="home-nav-logo" />
          <span>Terrain IQ Mapper</span>
        </div>
        <nav className="home-nav-links">
          <a onClick={() => scrollTo('home')}>Home</a>
          <a onClick={() => scrollTo('team')}>Team</a>
          <a onClick={() => scrollTo('contact')}>Contact</a>
          <a onClick={() => scrollTo('demo')}>Demo</a>
        </nav>
        <button className="btn btn-primary btn-sm" onClick={() => onEnter('dashboard')}>Launch App</button>
      </header>

      <section id="home" className="home-hero">
        <div className="home-contour-bg" aria-hidden="true">
          <svg viewBox="0 0 1200 500" preserveAspectRatio="none">
            <path d="M-50 380 Q 250 300 550 380 T 1250 360" fill="none" stroke="#C9A15C" strokeWidth="1" opacity="0.18" />
            <path d="M-50 420 Q 250 340 550 420 T 1250 400" fill="none" stroke="#C9A15C" strokeWidth="1" opacity="0.14" />
            <path d="M-50 460 Q 250 390 550 460 T 1250 440" fill="none" stroke="#4FA8A0" strokeWidth="1" opacity="0.14" />
            <path d="M-50 100 Q 250 40 550 100 T 1250 80" fill="none" stroke="#4FA8A0" strokeWidth="1" opacity="0.1" />
          </svg>
        </div>

        <img src="/logo-mark.png" alt="" className="home-hero-mark" />
        <p className="home-kicker">The Simplest No-Code ETL Platform</p>
        <h1 className="home-headline">Terrain IQ Mapper</h1>
        <p className="home-tagline">Map Once. Automate Forever.</p>
        <p className="home-hero-sub">
          Catalog every data dictionary as a collection, then let AI-assisted matching chart the terrain
          between them &mdash; synonym-aware field mapping for asset management data, shared across your team.
        </p>
        <div className="home-hero-cta">
          <button className="btn btn-primary" onClick={() => onEnter('dashboard')}>Go to Collections</button>
          <button className="btn btn-ghost" onClick={() => onEnter('mapping')}>Run a Mapping</button>
        </div>

        <div className="home-feature-grid">
          <div className="home-feature-card" onClick={() => onEnter('dashboard')}>
            <span className="type-tag t-security">Collections</span>
            <h3>Catalog your data dictionaries</h3>
            <p>Create a collection for Security, Positions, or Holdings data, upload its field listing, and keep every source in one shared place.</p>
            <span className="home-feature-link">Open Collections &rarr;</span>
          </div>
          <div className="home-feature-card" onClick={() => onEnter('mapping')}>
            <span className="type-tag t-positions">Mapping</span>
            <h3>Match fields automatically</h3>
            <p>Pick a source and target collection and let synonym-aware matching suggest field pairings &mdash; then adjust any of them by hand.</p>
            <span className="home-feature-link">Open Mapping &rarr;</span>
          </div>
        </div>
      </section>

      <section id="team" className="home-section">
        <p className="page-eyebrow">Team</p>
        <h2 className="home-section-title">Who's behind this</h2>
        <p className="home-section-sub">
          This space is set up for your team's roster &mdash; swap in real names, roles, and photos when you're ready.
        </p>
        <div className="home-team-grid">
          {['Product', 'Engineering', 'Data & Analytics', 'Operations'].map((role) => (
            <div className="home-team-card" key={role}>
              <div className="home-team-avatar">{role.charAt(0)}</div>
              <div className="home-team-role">{role}</div>
              <div className="home-team-placeholder">Add a name here</div>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="home-section home-section-alt">
        <p className="page-eyebrow">Demo</p>
        <h2 className="home-section-title">See it in action</h2>
        <p className="home-section-sub">
          The fastest way to see how Terrain IQ Mapper works is to use it directly &mdash; create two collections
          from sample field listings, then run AI matching between them.
        </p>
        <div className="home-demo-steps">
          <div className="home-demo-step"><span>01</span>Create a collection and upload a field listing</div>
          <div className="home-demo-step"><span>02</span>Create a second collection to compare it against</div>
          <div className="home-demo-step"><span>03</span>Open Map Collections and run AI matching</div>
        </div>
        <button className="btn btn-primary" onClick={() => onEnter('dashboard')}>Launch Interactive Demo</button>
      </section>

      <section id="contact" className="home-section">
        <p className="page-eyebrow">Contact</p>
        <h2 className="home-section-title">Get in touch</h2>
        <p className="home-section-sub">Questions, feedback, or a data dictionary you'd like help mapping &mdash; send a note.</p>
        <form className="home-contact-form" onSubmit={sendContactMessage}>
          <div className="field-group">
            <label className="field-label">Name</label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label">Message</label>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={4}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Send Message</button>
        </form>
      </section>

      <footer className="home-footer">
        <img src="/logo-mark.png" alt="" className="home-footer-logo" />
        <span>Terrain IQ Mapper &mdash; Map Once. Automate Forever.</span>
      </footer>
    </div>
  );
}
