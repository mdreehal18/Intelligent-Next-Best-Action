import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const LLM_MODEL = 'gemini-3.5-flash';

// POST /api/draft — Generate email/message draft based on NBA and context
router.post('/', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env' });

  const { context, category, nba } = req.body;

  const prompt = `You are a professional Customer Success Manager. Generate a highly personalized email draft or meeting agenda for the customer based on this context:
- Account Name: ${context.accountName || 'Unknown'}
- Primary Contact: ${context.primaryContact || 'Unknown'}
- Issue Category: ${category}
- Next Best Action Title: ${nba.title}
- Next Best Action Details: ${nba.details}
- Next Best Action Impact: ${nba.impact}

The draft should be professional, empathetic, and action-oriented. Address the primary contact if known. Do not include placeholders like "[Your Name]" at the end; sign off as "Aegis CS Team".
Output ONLY the draft text. No markdown formatting, no conversational intro or outro.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 600 }
      })
    });
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0]) throw new Error('No response from Gemini');

    const text = data.candidates[0].content.parts[0].text.trim();
    res.json({ draft: text });
  } catch (err) {
    console.error('Draft generation error:', err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
