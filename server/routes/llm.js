import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const LLM_MODEL = 'gemini-3.5-flash';
const EMBED_MODEL = 'gemini-embedding-001';

// POST /api/complete — LLM Chat Completion (Gemini generateContent)
router.post('/complete', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env' });

  const { messages, temperature = 0.3, max_tokens = 1000 } = req.body;

  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const body = {
      contents,
      generationConfig: { temperature, maxOutputTokens: max_tokens }
    };
    if (systemParts) {
      body.systemInstruction = { parts: [{ text: systemParts }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0]) throw new Error('No response from Gemini');

    const text = data.candidates[0].content.parts[0].text;
    res.json({ content: text });
  } catch (err) {
    console.error('LLM completion error:', err);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/embed — Embedding (Gemini embedContent)
router.post('/embed', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env' });

  const { input } = req.body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: input }] }
      })
    });
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.embedding) throw new Error('No embedding returned from Gemini');

    res.json({ embedding: data.embedding.values });
  } catch (err) {
    console.error('Embedding error:', err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
