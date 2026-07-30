import { Router } from 'express';
import { getCollection } from '../db.js';
import { runMatching } from '../../../shared/matching.js';
import type { MappingResult } from '../../../shared/types.js';

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
