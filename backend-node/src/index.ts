import Fastify from 'fastify'
import cors from '@fastify/cors'
import pool from './db'
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import sprintRoutes from './routes/sprints'
import storyRoutes from './routes/stories'
import impedimentRoutes from './routes/impediments'
import dashboardRoutes from './routes/dashboard'
import userRoutes from './routes/users'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function start(): Promise<void> {
  // ── CORS ──────────────────────────────────────────────────────────────────────
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173'
  ).split(',').map((o) => o.trim())

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'],
    credentials: true,
  })

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/health', async (_request, reply) => {
    try {
      await pool.query('SELECT 1')
      return reply.send({ status: 'UP', db: 'UP' })
    } catch {
      return reply.status(503).send({ status: 'DOWN', db: 'DOWN' })
    }
  })

  // ── Routes — all mounted under /api to match the Spring backend ───────────────
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(projectRoutes, { prefix: '/api' })
  await app.register(sprintRoutes, { prefix: '/api' })
  await app.register(storyRoutes, { prefix: '/api' })
  await app.register(impedimentRoutes, { prefix: '/api' })
  await app.register(dashboardRoutes, { prefix: '/api' })
  await app.register(userRoutes, { prefix: '/api' })

  // ── Global error handler ──────────────────────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    const statusCode = error.statusCode ?? 500
    return reply.status(statusCode).send({
      message: error.message ?? 'Internal server error',
    })
  })

  // ── Start ─────────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? '3000', 10)
  const host = '0.0.0.0'

  try {
    await app.listen({ port, host })
    app.log.info(`Personal Scrum Node.js backend listening on ${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received — shutting down gracefully')
  await app.close()
  await pool.end()
  process.exit(0)
})

process.on('SIGINT', async () => {
  app.log.info('SIGINT received — shutting down gracefully')
  await app.close()
  await pool.end()
  process.exit(0)
})

void start()
