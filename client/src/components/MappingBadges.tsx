import type { MappingRow } from '../../../shared/types';

export function ConfidenceBadge({ pct }: { pct: number | null }) {
  const value = pct ?? 0;
  const tier = value >= 80 ? 'high' : value >= 50 ? 'mid' : 'low';
  const color = tier === 'high' ? 'var(--teal)' : tier === 'mid' ? 'var(--brass-bright)' : 'var(--rose)';
  const activeRings = tier === 'high' ? 3 : tier === 'mid' ? 2 : 1;
  const circles = [0, 1, 2].map((i) => {
    const r = 13 - i * 4;
    const active = i < activeRings;
    return (
      <circle
        key={i}
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={active ? color : '#3a4451'}
        strokeWidth="1.6"
        strokeDasharray={active ? '' : '2,2'}
        opacity={active ? 1 : 0.6}
      />
    );
  });
  return (
    <span className="confidence-badge">
      <svg width="26" height="26" viewBox="0 0 32 32">{circles}</svg>
      <span className="conf-num" style={{ color }}>{value}%</span>
    </span>
  );
}

export function StatusPill({ status }: { status: MappingRow['status'] }) {
  if (status === 'auto') return <span className="status-pill auto">Auto-matched</span>;
  if (status === 'manual') return <span className="status-pill manual">Manual</span>;
  return <span className="status-pill unmatched">Unmatched</span>;
}
