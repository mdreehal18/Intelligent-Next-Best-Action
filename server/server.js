import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env first, then override/merge with server .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

import authRoutes from './routes/auth.js';
import llmRoutes from './routes/llm.js';
import draftRoutes from './routes/draft.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Public routes — no auth required
app.use('/api/auth', authRoutes);

// Protected routes — JWT required
app.use('/api/draft', authMiddleware, draftRoutes);
app.use('/api', authMiddleware, llmRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`INBA server running on http://localhost:${PORT}`));
