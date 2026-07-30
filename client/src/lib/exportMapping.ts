import * as XLSX from 'xlsx';
import type { Collection, MappingRow } from '../../../shared/types';

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}

export function exportMappingToExcel(source: Collection, target: Collection, rows: MappingRow[]) {
  const data = rows.map((r) => ({
    'Source Field': r.sourceField,
    'Mapped Field': r.targetField || '(unmatched)',
    'Confidence %': r.targetField ? r.confidence : '',
    Status: r.targetField ? (r.status === 'auto' ? 'Auto-matched' : 'Manual') : 'Unmatched',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 32 }, { wch: 32 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Field Mapping');
  const fname = `TerrainIQ_${sanitizeFilename(source.name)}_to_${sanitizeFilename(target.name)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
