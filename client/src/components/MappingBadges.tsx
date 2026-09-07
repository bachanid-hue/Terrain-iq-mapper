function Rings({ activeCount, color, size = 26 }: { activeCount: number; color: string; size?: number }) {
  const circles = [0, 1, 2].map((i) => {
    const r = 13 - i * 4;
    const active = i < activeCount;
    return (
      <circle
        key={i}
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={active ? color : 'var(--line)'}
        strokeWidth="1.6"
        strokeDasharray={active ? '' : '2,2'}
        opacity={active ? 1 : 0.6}
      />
    );
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {circles}
    </svg>
  );
}

export function ConfidenceBadge({ pct }: { pct: number | null }) {
  const value = pct ?? 0;
  const tier = value >= 80 ? 'high' : value >= 50 ? 'mid' : 'low';
  const color = tier === 'high' ? 'var(--teal)' : tier === 'mid' ? 'var(--brass-bright)' : 'var(--rose)';
  return <span className="conf-num" style={{ color }}>{value}%</span>;
}

// Driven purely by confidence, not the raw auto/manual/ai/unmatched status —
// 100% = Matched (green, 3 rings), any partial match = Matched (yellow, 2
// rings), no match = Unmatched (red, 1 ring), same ring pattern the
// Confidence badge uses for its low tier.
export function StatusPill({ confidence }: { confidence: number | null }) {
  const value = confidence ?? 0;

  let label: string;
  let color: string;
  let bg: string;
  let border: string;
  let ringCount: number;

  if (value === 100) {
    label = 'Matched';
    color = 'var(--green)';
    bg = '#E3F7EA';
    border = '#BEE8CC';
    ringCount = 3;
  } else if (value > 0) {
    label = 'Matched';
    color = '#8A5F0F';
    bg = '#FBF0DC';
    border = '#EAD9B0';
    ringCount = 2;
  } else {
    label = 'Unmatched';
    color = 'var(--rose)';
    bg = '#FBEAE7';
    border = '#F0C4BB';
    ringCount = 1;
  }

  return (
    <span className="status-pill2" style={{ background: bg, borderColor: border, color }}>
      <Rings activeCount={ringCount} color={color} size={20} />
      {label}
    </span>
  );
}
