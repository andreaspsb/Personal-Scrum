// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProjectType = 'PERSONAL' | 'PROFESSIONAL';
export type ProjectFormat = 'SCRUM' | 'KANBAN';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type StoryStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ─── Domain Entities ──────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  type: ProjectType;
  format: ProjectFormat;
  status: ProjectStatus;
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Sprint {
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  project_id: number;
  velocity: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserStory {
  id: number;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  story_points: number | null;
  priority: Priority;
  status: StoryStatus;
  sprint_id: number | null;
  project_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Impediment {
  id: number;
  title: string;
  description: string | null;
  resolved: boolean;
  sprint_id: number;
  created_at: Date;
  updated_at: Date;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ProjectDTO {
  id: number;
  name: string;
  description: string | null;
  type: ProjectType;
  format: ProjectFormat;
  status: ProjectStatus;
  createdAt: Date;
}

export interface SprintDTO {
  id: number;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  projectId: number;
  velocity: number | null;
  storyCount: number;
  completedStoryCount: number;
}

export interface UserStoryDTO {
  id: number;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  storyPoints: number | null;
  priority: Priority;
  status: StoryStatus;
  sprintId: number | null;
  projectId: number;
}

export interface ImpedimentDTO {
  id: number;
  title: string;
  description: string | null;
  resolved: boolean;
  sprintId: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: null;
  user: UserDTO;
}

export interface ScrumInsightDTO {
  type: string;
  message: string;
  severity: string;
  sprintId: number | null;
  projectId: number | null;
}

export interface DashboardDTO {
  activeProjects: ProjectDTO[];
  activeSprints: SprintDTO[];
  insights: ScrumInsightDTO[];
  totalProjects: number;
  totalSprints: number;
  completedStories: number;
}

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  type: ProjectType;
  format?: ProjectFormat;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId: number;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
}

export interface CreateUserStoryRequest {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: Priority;
  projectId: number;
}

export interface UpdateUserStoryRequest {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: Priority;
  status?: StoryStatus;
  sprintId?: number;
}

export interface CreateImpedimentRequest {
  title: string;
  description?: string;
  sprintId: number;
}

export interface MoveToSprintRequest {
  sprintId: number;
}

export interface UpdateUserRoleRequest {
  role: string;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}
