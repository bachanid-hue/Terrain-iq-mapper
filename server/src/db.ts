import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Collection, CollectionType, Field } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Data directory is configurable via env so hosts with a persistent disk can
// point it somewhere durable. Defaults to server/data/terrain.db.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'terrain.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

interface CollectionRow {
  id: string;
  name: string;
  type: string;
  file_name: string;
  fields: string;
  created_at: number;
}

function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CollectionType,
    fileName: row.file_name,
    fields: JSON.parse(row.fields) as Field[],
    createdAt: row.created_at,
  };
}

export function listCollections(): Collection[] {
  const rows = db
    .prepare('SELECT * FROM collections ORDER BY created_at DESC')
    .all() as CollectionRow[];
  return rows.map(rowToCollection);
}

export function getCollection(id: string): Collection | undefined {
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as
    | CollectionRow
    | undefined;
  return row ? rowToCollection(row) : undefined;
}

// Case-insensitive name lookup, used to enforce unique collection names.
// Pass excludeId when renaming so a collection doesn't collide with itself.
export function findCollectionByName(name: string, excludeId?: string): Collection | undefined {
  const row = excludeId
    ? (db
        .prepare('SELECT * FROM collections WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get(name, excludeId) as CollectionRow | undefined)
    : (db.prepare('SELECT * FROM collections WHERE LOWER(name) = LOWER(?)').get(name) as
        | CollectionRow
        | undefined);
  return row ? rowToCollection(row) : undefined;
}

export function renameCollection(id: string, name: string): Collection | undefined {
  db.prepare('UPDATE collections SET name = ? WHERE id = ?').run(name, id);
  return getCollection(id);
}

export function insertCollection(c: Collection): void {
  db.prepare(
    `INSERT INTO collections (id, name, type, file_name, fields, created_at)
     VALUES (@id, @name, @type, @fileName, @fields, @createdAt)`
  ).run({
    id: c.id,
    name: c.name,
    type: c.type,
    fileName: c.fileName,
    fields: JSON.stringify(c.fields),
    createdAt: c.createdAt,
  });
}

export function deleteCollection(id: string): boolean {
  const result = db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  return result.changes > 0;
}
