import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getCollection, listSavedMappings, insertSavedMapping, deleteSavedMapping } from '../db.js';
import { runMatching } from '../../../shared/matching.js';
import type { MappingResult, SavedMapping, NewSavedMappingInput, MappingRow } from '../../../shared/types.js';

export const mappingRouter = Router();

// POST /api/mapping/run — { sourceId, targetId } -> field-by-field match result.
// Runs entirely on the server so every visitor gets the same matching logic
// against the same shared collections.
mappingRouter.post('/run', (req, res) => {
  const { sourceId, targetId } = req.body as { sourceId?: string; targetId?: string };

  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'sourceId and targetId are required.' });
  }
  if (sourceId === targetId) {
    return res.status(400).json({ error: 'You cannot map the source collection to itself.' });
  }

  const source = getCollection(sourceId);
  const target = getCollection(targetId);
  if (!source) return res.status(404).json({ error: 'Source collection not found.' });
  if (!target) return res.status(404).json({ error: 'Target collection not found.' });

  const rows = runMatching(source.fields, target.fields);
  const result: MappingResult = { sourceId, targetId, rows };
  res.json(result);
});

// GET /api/mapping/saved — list every saved mapping, most recent first.
mappingRouter.get('/saved', (_req, res) => {
  res.json(listSavedMappings());
});

// POST /api/mapping/saved — persist the current mapping (including any
// manual overrides) to the database so it's shared and durable, not just
// held in this browser tab's state.
mappingRouter.post('/saved', (req, res) => {
  const body = req.body as Partial<NewSavedMappingInput>;
  const sourceId = (body.sourceId || '').trim();
  const targetId = (body.targetId || '').trim();
  const sourceName = (body.sourceName || '').trim();
  const targetName = (body.targetName || '').trim();
  const savedBy = (body.savedBy || '').trim();
  const rows = Array.isArray(body.rows) ? (body.rows as MappingRow[]) : [];

  if (!sourceId || !targetId) return res.status(400).json({ error: 'sourceId and targetId are required.' });
  if (!sourceName || !targetName) return res.status(400).json({ error: 'sourceName and targetName are required.' });
  if (!rows.length) return res.status(400).json({ error: 'A mapping needs at least one row to save.' });
  if (!savedBy) return res.status(400).json({ error: 'Saved By is required.' });

  const mapping: SavedMapping = {
    id: nanoid(12),
    sourceId,
    targetId,
    sourceName,
    targetName,
    rows,
    savedBy,
    createdAt: Date.now(),
  };
  insertSavedMapping(mapping);
  res.status(201).json(mapping);
});

// DELETE /api/mapping/saved/:id — removes a saved mapping.
mappingRouter.delete('/saved/:id', (req, res) => {
  const removed = deleteSavedMapping(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Saved mapping not found' });
  res.status(204).send();
});
