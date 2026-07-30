// AI-assisted field matching: synonym normalization + token overlap + string
// similarity. Deterministic and dependency-free so it can run anywhere
// (currently used server-side only, one source of truth for both server and
// any future client-side preview).

import type { Field, MappingRow } from './types';

const SYN_GROUPS: string[][] = [
  ['id', 'identifier', 'code', 'key'],
  ['sec', 'security'],
  ['cusip', 'cusipid', 'cusipnumber'],
  ['isin', 'isincode'],
  ['ticker', 'symbol', 'sym'],
  ['qty', 'quantity', 'units', 'shares', 'sharesqty'],
  ['px', 'price', 'prc'],
  ['amt', 'amount', 'value', 'val'],
  ['mkt', 'market'],
  ['mv', 'marketvalue', 'mktval', 'mktvalue'],
  ['pct', 'percent', 'percentage'],
  ['desc', 'description', 'descr'],
  ['dt', 'date'],
  ['acct', 'account', 'acc'],
  ['curr', 'currency', 'ccy'],
  ['nm', 'name'],
  ['cls', 'class', 'classification'],
  ['pos', 'position'],
  ['hold', 'holding', 'holdings'],
  ['bal', 'balance'],
  ['avg', 'average'],
  ['cost', 'costbasis'],
  ['coupon', 'cpn'],
  ['maturity', 'mat', 'maturitydate'],
  ['yield', 'yld'],
  ['exp', 'expense', 'expiry', 'expiration'],
  ['nav', 'netassetvalue'],
  ['aum', 'assetsundermanagement'],
  ['wt', 'weight', 'weighting'],
  ['dur', 'duration'],
  ['fund', 'portfolio', 'pf'],
  ['mgr', 'manager'],
  ['bmk', 'benchmark'],
  ['sec_type', 'sectype', 'securitytype', 'assettype', 'asset_type'],
  ['par', 'parvalue', 'facevalue', 'face'],
  ['acc_int', 'accruedinterest', 'accint'],
];

const SYN_MAP: Record<string, string> = {};
SYN_GROUPS.forEach((group) => {
  const canon = group[0];
  group.forEach((w) => {
    SYN_MAP[w] = canon;
  });
});

function tokenize(str: string): string[] {
  const spaced = String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-/.]+/g, ' ')
    .replace(/[^a-zA-Z0-9%\s]/g, ' ')
    .toLowerCase()
    .trim();
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SYN_MAP[t] || t);
}

function normKey(str: string): string {
  return tokenize(str).join('');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function levRatio(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

export function fieldScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const na = normKey(a);
  const nb = normKey(b);
  if (na && na === nb) return 1;
  const setA = new Set(ta);
  const setB = new Set(tb);
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  const jaccard = inter / union;
  const lr = levRatio(a.toLowerCase().replace(/\s+/g, ''), b.toLowerCase().replace(/\s+/g, ''));
  const score = 0.55 * jaccard + 0.35 * lr + 0.1 * (inter > 0 ? 1 : 0);
  return Math.min(score, 0.99);
}

export function runMatching(sourceFields: Field[], targetFields: Field[]): MappingRow[] {
  return sourceFields.map((sf) => {
    let best: Field | null = null;
    let bestScore = -1;
    targetFields.forEach((tf) => {
      const sc = fieldScore(sf.name, tf.name);
      if (sc > bestScore) {
        bestScore = sc;
        best = tf;
      }
    });
    const confidence = Math.round(bestScore * 100);
    const matched = confidence >= 32 && best !== null;
    return {
      sourceField: sf.name,
      targetField: matched && best ? (best as Field).name : '',
      confidence: matched ? confidence : null,
      status: matched ? 'auto' : 'unmatched',
    } as MappingRow;
  });
}
