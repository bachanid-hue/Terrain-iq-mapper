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

// POST /api/mapping/ask-ai — { sourceField, targetFields } -> a second opinion
// from Claude on a single low-confidence or unmatched field. Optional feature:
// requires ANTHROPIC_API_KEY to be set on the server. The deterministic
// algorithm above needs no API key at all and keeps working regardless.
mappingRouter.post('/ask-ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI-assisted matching isn\u2019t configured. Set ANTHROPIC_API_KEY on the server to enable "Ask AI".',
    });
  }

  const { sourceField, targetFields } = req.body as { sourceField?: string; targetFields?: string[] };
  if (!sourceField || !Array.isArray(targetFields) || !targetFields.length) {
    return res.status(400).json({ error: 'sourceField and a non-empty targetFields list are required.' });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const prompt = `You are matching a field from one data dictionary to the closest equivalent field in another, for an asset management data-mapping tool.

Source field: "${sourceField}"

Candidate target fields:
${targetFields.map((f) => `- ${f}`).join('\n')}

Pick the single best-matching candidate, if any genuinely represents the same underlying data concept (accounting for abbreviations, synonyms, and financial-industry terminology). If none of the candidates are a reasonable match, say so honestly rather than forcing a pick.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"targetField": "<one of the candidate strings exactly as given, or null>", "confidence": <integer 0-100>, "reason": "<one or two plain sentences explaining the decision>"}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error('Anthropic API error:', aiRes.status, errBody);
      return res.status(502).json({ error: 'The AI matching service returned an error. Check the server logs and API key.' });
    }

    const data = (await aiRes.json()) as { content?: Array<{ type: string; text?: string }> };
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const raw = textBlock?.text || '';
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(502).json({ error: 'Could not parse a response from the AI matching service.' });
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      targetField?: string | null;
      confidence?: number;
      reason?: string;
    };

    const targetField =
      typeof parsed.targetField === 'string' && targetFields.includes(parsed.targetField) ? parsed.targetField : null;
    const confidence = Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence as number)))
      : targetField
        ? 60
        : 0;
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'The AI did not provide a reason.';

    res.json({ targetField, confidence, reason });
  } catch (err) {
    console.error('Ask-AI error:', err);
    res.status(502).json({ error: 'Failed to reach the AI matching service.' });
  }
});
