import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listCategories, findCategoryByName, insertCategory } from '../db.js';
import type { Category, NewCategoryInput } from '../../../shared/types.js';

export const categoriesRouter = Router();

// GET /api/categories — every category, shared across all users. Powers the
// Category dropdown on New Collection, loaded fresh each time the page opens.
categoriesRouter.get('/', (_req, res) => {
  res.json(listCategories());
});

// POST /api/categories — "Add New Category" from the dropdown. Persists it
// so it's immediately available to everyone else's dropdown too, not just
// the browser tab that created it.
categoriesRouter.post('/', (req, res) => {
  const body = req.body as Partial<NewCategoryInput>;
  const name = (body.name || '').trim();
  const createdBy = (body.createdBy || '').trim();

  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  if (findCategoryByName(name)) {
    return res.status(409).json({ error: `The category "${name}" already exists.` });
  }

  const category: Category = {
    id: nanoid(12),
    name,
    createdBy,
    createdAt: Date.now(),
  };
  insertCategory(category);
  res.status(201).json(category);
});
