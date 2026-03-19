# Personal Scrum 🚀

A proactive Personal Scrum Management System that acts as your digital Scrum Master — keeping you on track, surfacing blockers, and providing actionable insights for both personal and professional projects.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2, Spring Security 6 |
| Database | PostgreSQL 16 + Flyway migrations |
| Authentication | JWT (HS256) |
| Frontend | React 18, TypeScript, Vite 5 |
| Containerization | Docker + Docker Compose |
| Deployment | Railway |

## Architecture

The backend follows **Clean Architecture** principles:

```
backend/src/main/java/com/personalscrum/
├── domain/           # Entities, repository interfaces, domain services
│   ├── entity/       # User, Project, Sprint, UserStory, Impediment
│   ├── repository/   # Repository interfaces
│   └── service/      # SprintHealthService (pure domain logic)
├── application/      # Use cases & DTOs
│   ├── dto/          # Request/Response records
│   └── usecase/      # AuthUseCase, ProjectUseCase, SprintUseCase, etc.
├── infrastructure/   # Spring Security, JWT, JPA, config
│   ├── security/     # JwtService, JwtAuthenticationFilter, SecurityConfig
│   └── config/       # ApplicationConfig, JpaConfig
└── web/              # REST controllers, exception handler
    └── controller/   # AuthController, ProjectController, SprintController, etc.
```

## Features

### 🎯 Proactive Scrum Master
- **Sprint health alerts** — warns when sprint completion rate is too low
- **Deadline tracking** — alerts when sprint is ending soon or overdue
- **Impediment monitoring** — surfaces unresolved blockers
- **Backlog insights** — identifies stories without story points or orphaned backlog
- **No active sprint** — reminds you to start a new sprint for active projects

### 📋 Project Management
- Personal and Professional project types
- Project status tracking (Active, Paused, Completed)

### 🏃 Sprint Management
- Sprint planning with goal and date range
- Kanban board: TODO → IN_PROGRESS → IN_REVIEW → DONE
- Sprint velocity tracking
- One-click start and complete sprint

### 📝 User Stories & Backlog
- Story point estimation
- Priority levels (Low, Medium, High, Critical)
- Move stories between sprints
- Acceptance criteria tracking

### 🚧 Impediment Tracking
- Log blockers per sprint
- Mark impediments as resolved

## Getting Started (Local Development with Docker)

### Prerequisites
- Docker & Docker Compose
- (Optional) Java 17 + Maven for backend dev without Docker
- (Optional) Node.js 20+ for frontend dev without Docker

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/andreaspsb/Personal-Scrum.git
cd Personal-Scrum

# Start all services (PostgreSQL, Backend, Frontend)
docker compose up --build

# Access the app
open http://localhost:3000
```

### Run for Development (without Docker)

**Database:**
```bash
docker run -d \
  --name personalscrum-db \
  -e POSTGRES_DB=personalscrum \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

**Backend:**
```bash
cd backend
export JWT_SECRET=myLocalDevelopmentSecretKeyMustBe32Chars!
mvn spring-boot:run
# API available at http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

## Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/personalscrum` | PostgreSQL JDBC URL |
| `DATABASE_USER` | `postgres` | Database username |
| `DATABASE_PASSWORD` | `postgres` | Database password |
| `JWT_SECRET` | *(required in prod)* | HS256 signing secret (>=32 chars) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins |
| `PORT` | `8080` | Server port |

## API Documentation

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>` header.

### Auth
```
POST /api/auth/register   { name, email, password }
POST /api/auth/login      { email, password }
```

### Projects
```
GET    /api/projects?type=PERSONAL|PROFESSIONAL
POST   /api/projects       { name, description, type }
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Sprints
```
GET  /api/sprints?projectId=X
POST /api/sprints           { name, goal, startDate, endDate, projectId }
PUT  /api/sprints/:id
POST /api/sprints/:id/start
POST /api/sprints/:id/complete
```

### User Stories
```
GET    /api/stories?projectId=X   (backlog)
GET    /api/stories?sprintId=X    (sprint stories)
POST   /api/stories
PUT    /api/stories/:id
POST   /api/stories/:id/move-to-sprint  { sprintId }
DELETE /api/stories/:id
```

### Impediments
```
GET  /api/impediments?sprintId=X
POST /api/impediments           { title, description, sprintId }
POST /api/impediments/:id/resolve
```

### Dashboard
```
GET /api/dashboard
GET /api/dashboard/insights
```

## Deployment (Railway)

1. Create a Railway project
2. Add a PostgreSQL plugin
3. Deploy the backend service from the `backend/` directory
4. Set environment variables:
   - `DATABASE_URL` -> Railway PostgreSQL URL
   - `DATABASE_USER`, `DATABASE_PASSWORD`
   - `JWT_SECRET` -> a strong random secret
5. Deploy the frontend service from the `frontend/` directory

## Project Structure

```
Personal-Scrum/
├── backend/                  # Spring Boot API
│   ├── src/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                 # React/TypeScript/Vite app
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml        # Local development
├── railway.toml              # Railway deployment config
└── README.md
```
