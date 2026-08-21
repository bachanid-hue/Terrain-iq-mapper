import type { FieldDataType } from '../../../shared/types';

const DATE_HINTS = [
  'date', 'dt', 'day', 'maturity', 'expiration', 'expiry', 'settlement', 'settle',
  'trade', 'effective', 'asof', 'as_of', 'reportdate', 'valuedate',
];

const NUMBER_HINTS = [
  'amount', 'amt', 'qty', 'quantity', 'price', 'px', 'rate', 'value', 'val',
  'balance', 'bal', 'percent', 'pct', 'count', 'num', 'number', 'notional',
  'principal', 'par', 'coupon', 'yield', 'spread', 'duration', 'weight', 'wt',
  'shares', 'units', 'cost', 'nav', 'aum', 'delta', 'multiplier', 'basis',
  'strike', 'convexity',
];

function normalize(fieldName: string): string {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-/.]+/g, ' ')
    .toLowerCase();
}

// Best-effort guess only — the field is always editable afterward, this
// just saves the user from manually setting the obvious cases.
export function inferDataType(fieldName: string): FieldDataType {
  const normalized = normalize(fieldName);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.some((t) => DATE_HINTS.includes(t))) return 'Date';
  if (tokens.some((t) => NUMBER_HINTS.includes(t))) return 'Number';
  return 'Text';
}
