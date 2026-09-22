import * as XLSX from 'xlsx';
import type { MappingRow } from '../../../shared/types';

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}

export function exportMappingToExcel(sourceName: string, targetName: string, rows: MappingRow[]) {
  const data = rows.map((r) => {
    const isNotInScope = r.sourceField === 'Not In Scope';
    const isMatched = !!r.sourceField && !isNotInScope;
    let status: string;
    if (isNotInScope) status = 'Not In Scope';
    else if (!isMatched) status = 'Unmatched';
    else if (r.status === 'auto') status = 'Auto-matched';
    else if (r.status === 'ai') status = 'AI Suggested';
    else status = 'Manual';
    return {
      'Source Field': isNotInScope ? '(not in scope)' : r.sourceField || '(unmatched)',
      'Mapped Field': r.targetField,
      'Confidence %': isMatched ? r.confidence : '',
      Status: status,
      Notes: r.reason || '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 32 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Field Mapping');
  const fname = `TerrainIQ_${sanitizeFilename(sourceName)}_to_${sanitizeFilename(targetName)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
