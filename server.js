import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COMPLETION_URL = 'https://api.openai.com/v1/chat/completions';
const EMBED_URL = 'https://api.openai.com/v1/embeddings';
const LLM_MODEL = 'gpt-4o';          // or 'gpt-3.5-turbo'
const EMBED_MODEL = 'text-embedding-3-small';

// LLM Completion
app.post('/api/complete', async (req, res) => {
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  const { messages, temperature = 0.3, max_tokens = 1000 } = req.body;
  try {
    const response = await fetch(COMPLETION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: LLM_MODEL, messages, temperature, max_tokens })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ content: data.choices[0].message.content });
  } catch (err) {
    console.error('LLM completion error:', err);
    res.status(502).json({ error: err.message });
  }
});

// Embedding
app.post('/api/embed', async (req, res) => {
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  const { input } = req.body;
  try {
    const response = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: EMBED_MODEL, input })
    });
    const data = await response.json();
    res.json({ embedding: data.data[0].embedding });
  } catch (err) {
    console.error('Embedding error:', err);
    res.status(502).json({ error: err.message });
  }
});

// Serve static files from the project root
app.use(express.static('.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NBA platform server running on http://localhost:${PORT}`));