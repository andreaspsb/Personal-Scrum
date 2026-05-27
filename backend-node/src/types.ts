// ─── Enum types ────────────────────────────────────────────────────────────────

export type ProjectType = 'PERSONAL' | 'PROFESSIONAL'
export type ProjectFormat = 'SCRUM' | 'KANBAN'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED'
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type StoryStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

// ─── Domain entities (as returned from DB rows) ────────────────────────────────

export interface UserRow {
  id: number
  name: string
  email: string
  password: string
  role: string
  created_at: Date
  updated_at: Date
}

export interface ProjectRow {
  id: number
  name: string
  description: string | null
  type: ProjectType
  format: ProjectFormat
  status: ProjectStatus
  user_id: number
  created_at: Date
  updated_at: Date
}

export interface SprintRow {
  id: number
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: SprintStatus
  project_id: number
  velocity: number | null
  created_at: Date
  updated_at: Date
}

export interface UserStoryRow {
  id: number
  title: string
  description: string | null
  acceptance_criteria: string | null
  story_points: number | null
  priority: Priority
  status: StoryStatus
  sprint_id: number | null
  project_id: number
  created_at: Date
  updated_at: Date
}

export interface ImpedimentRow {
  id: number
  title: string
  description: string | null
  resolved: boolean
  sprint_id: number
  created_at: Date
  updated_at: Date
}

// ─── API response shapes (mirrors Spring DTOs) ────────────────────────────────

export interface UserDTO {
  id: number
  name: string
  email: string
  role: string
}

export interface ProjectDTO {
  id: number
  name: string
  description: string | null
  type: ProjectType
  format: ProjectFormat
  status: ProjectStatus
  createdAt: string
}

export interface SprintDTO {
  id: number
  name: string
  goal: string | null
  startDate: string | null
  endDate: string | null
  status: SprintStatus
  projectId: number
  velocity: number | null
  storyCount: number
  completedStoryCount: number
}

export interface UserStoryDTO {
  id: number
  title: string
  description: string | null
  acceptanceCriteria: string | null
  storyPoints: number | null
  priority: Priority
  status: StoryStatus
  sprintId: number | null
  projectId: number
}

export interface ImpedimentDTO {
  id: number
  title: string
  description: string | null
  resolved: boolean
  sprintId: number
}

export interface ScrumInsightDTO {
  type: string
  message: string
  severity: InsightSeverity
  sprintId: number | null
  projectId: number | null
}

export interface DashboardDTO {
  activeProjects: ProjectDTO[]
  activeSprints: SprintDTO[]
  insights: ScrumInsightDTO[]
  totalProjects: number
  totalSprints: number
  completedStories: number
}

export interface AuthResponseDTO {
  token: string
  refreshToken: null
  user: UserDTO
}

// ─── JWT payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string   // user email (matches Spring's UserDetails.getUsername())
  iat: number
  exp: number
}

// ─── Fastify request augmentation ─────────────────────────────────────────────

export interface AuthenticatedUser {
  id: number
  email: string
  role: string
}
