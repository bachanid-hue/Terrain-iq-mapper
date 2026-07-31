import { Router } from 'express';
import { nanoid } from 'nanoid';
import {
  listCollections,
  getCollection,
  insertCollection,
  deleteCollection,
  findCollectionByName,
  renameCollection,
} from '../db.js';
import type { Collection, NewCollectionInput } from '../../../shared/types.js';

const VALID_TYPES = new Set(['Security Data', 'Positions Data', 'Holdings Data']);

export const collectionsRouter = Router();

// GET /api/collections — list every collection (used by the dashboard and
// by the Map Collections dropdowns, so every visitor sees the same shared set).
collectionsRouter.get('/', (_req, res) => {
  res.json(listCollections());
});

// GET /api/collections/:id — a single collection with its full field list.
collectionsRouter.get('/:id', (req, res) => {
  const c = getCollection(req.params.id);
  if (!c) return res.status(404).json({ error: 'Collection not found' });
  res.json(c);
});

// POST /api/collections — create a new collection. The client has already
// parsed Row 1 of the uploaded Excel file into a field list; we just persist it.
collectionsRouter.post('/', (req, res) => {
  const body = req.body as Partial<NewCollectionInput>;
  const name = (body.name || '').trim();
  const type = body.type;
  const fileName = (body.fileName || '').trim();
  const fields = Array.isArray(body.fields) ? body.fields : [];
  const createdBy = (body.createdBy || '').trim();

  if (!name) return res.status(400).json({ error: 'Collection name is required.' });
  if (!type || !VALID_TYPES.has(type)) {
    return res.status(400).json({ error: 'Collection type must be Security, Positions, or Holdings Data.' });
  }
  if (!fields.length) {
    return res.status(400).json({ error: 'At least one field is required.' });
  }
  if (!createdBy) {
    return res.status(400).json({ error: 'Created By is required.' });
  }
  if (findCollectionByName(name)) {
    return res.status(409).json({ error: `A collection named "${name}" already exists. Choose a different name.` });
  }

  const collection: Collection = {
    id: nanoid(12),
    name,
    type,
    fileName: fileName || 'upload.xlsx',
    createdBy,
    fields: fields.map((f) => ({ name: String(f.name || '').trim() })).filter((f) => f.name),
    createdAt: Date.now(),
  };

  insertCollection(collection);
  res.status(201).json(collection);
});

// PATCH /api/collections/:id — rename a collection. Enforces the same
// unique-name rule as creation, excluding the collection being renamed.
collectionsRouter.patch('/:id', (req, res) => {
  const id = req.params.id;
  const existing = getCollection(id);
  if (!existing) return res.status(404).json({ error: 'Collection not found' });

  const body = req.body as { name?: string };
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Collection name is required.' });
  if (findCollectionByName(name, id)) {
    return res.status(409).json({ error: `A collection named "${name}" already exists. Choose a different name.` });
  }

  const updated = renameCollection(id, name);
  res.json(updated);
});

// DELETE /api/collections/:id — removes the collection and its field listing.
// There is no separate stored Excel file to clean up: only the parsed field
// list and file name are ever persisted, so deleting the row removes everything.
collectionsRouter.delete('/:id', (req, res) => {
  const removed = deleteCollection(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Collection not found' });
  res.status(204).send();
});
