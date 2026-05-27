import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { sprintRoutes } from './routes/sprints';
import { userStoryRoutes } from './routes/userStories';
import { impedimentRoutes } from './routes/impediments';
import { dashboardRoutes } from './routes/dashboard';
import { userRoutes } from './routes/users';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173'
  ).split(',').map((o) => o.trim());

  await fastify.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'],
    credentials: true,
  });

  // ─── JWT ───────────────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  await fastify.register(jwt, {
    secret: jwtSecret,
  });

  // ─── Global error handler ──────────────────────────────────────────────────
  fastify.setErrorHandler(errorHandler);

  // ─── Health check ──────────────────────────────────────────────────────────
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'UP', timestamp: new Date().toISOString() });
  });

  // ─── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(authRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(sprintRoutes);
  await fastify.register(userStoryRoutes);
  await fastify.register(impedimentRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(userRoutes);

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
