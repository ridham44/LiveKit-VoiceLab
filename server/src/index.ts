import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { agentsRouter } from './routes/agents.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { callsRouter } from './routes/calls.routes.js';
import { knowledgeRouter } from './routes/knowledge.routes.js';
import { sessionsRouter } from './routes/sessions.routes.js';
import { toolsRouter } from './routes/tools.routes.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, env: env.NODE_ENV }));

app.use('/api/agents', agentsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/analytics', analyticsRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] listening on http://localhost:${env.PORT}`);
});
