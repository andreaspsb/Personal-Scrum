# Personal Scrum Backend — Node.js / Fastify

A lightweight Node.js rewrite of the Spring Boot backend, using **Fastify** and **TypeScript**. Targets ~150–200 MB memory footprint vs ~1 GB for the JVM-based service.

## Stack

| Concern | Library |
|---|---|
| HTTP framework | [Fastify 4](https://fastify.dev) |
| Authentication | [@fastify/jwt](https://github.com/fastify/fastify-jwt) (HS256) |
| CORS | [@fastify/cors](https://github.com/fastify/fastify-cors) |
| Database | [pg](https://node-postgres.com) (PostgreSQL connection pool) |
| Password hashing | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| Validation | [Zod](https://zod.dev) |
| TypeScript runner | [tsx](https://github.com/privatenumber/tsx) |

## Prerequisites

- Node.js 20+
- PostgreSQL database (same schema as the Spring Boot service — run the existing Flyway migrations)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=info
```

> **Important:** `JWT_SECRET` must be the same value used by the Spring Boot service if you want existing tokens to remain valid during a migration window.

## Development

```bash
npm install
npm run dev        # tsx watch — hot reload
```

## Production

```bash
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

## Docker

```bash
docker build -t personal-scrum-backend-node .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  personal-scrum-backend-node
```

## API Compatibility

All endpoints are **100% compatible** with the Spring Boot API:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login and receive JWT |
| GET | `/api/projects` | ✓ | List projects (optional `?type=`) |
| POST | `/api/projects` | ✓ | Create project |
| GET | `/api/projects/:id` | ✓ | Get project |
| PUT | `/api/projects/:id` | ✓ | Update project |
| DELETE | `/api/projects/:id` | ✓ | Delete project |
| GET | `/api/sprints?projectId=` | ✓ | List sprints for project |
| POST | `/api/sprints` | ✓ | Create sprint |
| GET | `/api/sprints/:id` | ✓ | Get sprint |
| PUT | `/api/sprints/:id` | ✓ | Update sprint |
| POST | `/api/sprints/:id/start` | ✓ | Start sprint |
| POST | `/api/sprints/:id/complete` | ✓ | Complete sprint |
| GET | `/api/stories?projectId=` | ✓ | Get backlog |
| GET | `/api/stories?sprintId=` | ✓ | Get sprint stories |
| POST | `/api/stories` | ✓ | Create user story |
| PUT | `/api/stories/:id` | ✓ | Update user story |
| POST | `/api/stories/:id/move-to-sprint` | ✓ | Move story to sprint |
| DELETE | `/api/stories/:id` | ✓ | Delete user story |
| GET | `/api/impediments?sprintId=` | ✓ | List impediments |
| POST | `/api/impediments` | ✓ | Create impediment |
| POST | `/api/impediments/:id/resolve` | ✓ | Resolve impediment |
| GET | `/api/dashboard` | ✓ | Dashboard summary |
| GET | `/api/dashboard/insights` | ✓ | Scrum insights |
| GET | `/api/users` | ✓ Admin | List all users |
| PUT | `/api/users/:id/role` | ✓ Admin | Update user role |
| DELETE | `/api/users/:id` | ✓ Admin | Delete user |
| GET | `/health` | — | Health check |

## Health Check

```
GET /health
→ { "status": "UP", "timestamp": "..." }
```
