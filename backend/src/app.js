import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requireAuth } from './middleware/require-auth.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/index.js';
import { sendSuccess } from './utils/response.js';

const app = express();

const corsConfig =
  env.corsOrigin === '*'
    ? { origin: true }
    : { origin: env.corsOrigin.split(',').map((item) => item.trim()) };

app.use(cors(corsConfig));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (request, response) => {
  sendSuccess(response, {
    name: 'Money Manager API',
    version: '1.0.0',
    docs: '/health, /api/auth/*, and protected /api/*',
  });
});

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
