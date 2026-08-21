import { Router } from 'express';
import { resetAllData } from '../db.js';

export const adminRouter = Router();

// POST /api/admin/reset — wipes every collection, saved mapping, category,
// and source system. Guarded by an ADMIN_RESET_KEY the operator sets
// themselves (same pattern as ANTHROPIC_API_KEY for Ask AI) — without it
// set, this endpoint refuses to run at all, so it's never a live "wipe the
// site" button sitting open on the internet by default.
adminRouter.post('/reset', (req, res) => {
  const configuredKey = process.env.ADMIN_RESET_KEY;
  if (!configuredKey) {
    return res.status(503).json({
      error: 'Reset isn\u2019t enabled. Set ADMIN_RESET_KEY on the server, then send it back as the x-admin-key header to use this.',
    });
  }

  const providedKey = req.header('x-admin-key');
  if (providedKey !== configuredKey) {
    return res.status(401).json({ error: 'Invalid or missing x-admin-key header.' });
  }

  const result = resetAllData();
  res.json({ message: 'All data cleared.', deleted: result });
});
