import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collectionsRouter } from './routes/collections.js';
import { mappingRouter } from './routes/mapping.js';
import { categoriesRouter } from './routes/categories.js';
import { sourceSystemsRouter } from './routes/sourceSystems.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/collections', collectionsRouter);
app.use('/api/mapping', mappingRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/source-systems', sourceSystemsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// In production, serve the built React app (client/dist) from the same
// server and origin as the API, so one process = one URL, no CORS to manage.
//
// The compiled output nests as dist/server/src/index.js (tsc's rootDir spans
// both server/ and shared/), which sits at a different depth than the
// uncompiled server/src/index.js does in dev. Rather than hardcode one
// depth, try the layouts we actually produce and use whichever exists.
const clientDistCandidates = [
  path.join(__dirname, '..', '..', 'client', 'dist'), // dev: server/src -> project/client/dist
  path.join(__dirname, '..', '..', '..', '..', 'client', 'dist'), // prod: server/dist/server/src -> project/client/dist
];
const clientDist = clientDistCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn(
    'No built client found (client/dist) — running API-only. Run `npm run build` from the project root to serve the UI too.'
  );
}

app.listen(PORT, () => {
  console.log(`Terrain IQ Mapper API listening on http://localhost:${PORT}`);
});
