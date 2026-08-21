import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listSourceSystems, findSourceSystemByName, insertSourceSystem } from '../db.js';
import type { SourceSystem, NewSourceSystemInput } from '../../../shared/types.js';

export const sourceSystemsRouter = Router();

// GET /api/source-systems — every source system, shared across all users.
// Powers the Source System dropdown on New Collection, loaded fresh each
// time the page opens.
sourceSystemsRouter.get('/', (_req, res) => {
  res.json(listSourceSystems());
});

// POST /api/source-systems — "Add New Source System" from the dropdown.
// Persists it so it's immediately available to everyone else's dropdown
// too, not just the browser tab that created it.
sourceSystemsRouter.post('/', (req, res) => {
  const body = req.body as Partial<NewSourceSystemInput>;
  const name = (body.name || '').trim();
  const createdBy = (body.createdBy || '').trim();

  if (!name) return res.status(400).json({ error: 'Source System name is required.' });
  if (findSourceSystemByName(name)) {
    return res.status(409).json({ error: `The source system "${name}" already exists.` });
  }

  const sourceSystem: SourceSystem = {
    id: nanoid(12),
    name,
    createdBy,
    createdAt: Date.now(),
  };
  insertSourceSystem(sourceSystem);
  res.status(201).json(sourceSystem);
});
