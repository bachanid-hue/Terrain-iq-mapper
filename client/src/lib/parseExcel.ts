import * as XLSX from 'xlsx';
import type { Field } from '../../../shared/types';
import { inferDataType } from './inferFieldMeta';

// Field names always live in Row 1 (the header row) of the uploaded sheet.
export async function parseFieldsFromFile(file: File): Promise<Field[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) as unknown[][];
  if (!rows.length) return [];

  const headerRow = rows[0] || [];
  const fields: Field[] = [];
  const seen = new Set<string>();
  headerRow.forEach((cell) => {
    const name = String(cell ?? '').trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    fields.push({ name, dataType: inferDataType(name), fieldType: 'Text', description: '' });
  });
  return fields;
}
