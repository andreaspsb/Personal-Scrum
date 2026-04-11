export type ProjectType = 'PERSONAL' | 'PROFESSIONAL'
export type ProjectFormat = 'SCRUM' | 'KANBAN'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED'
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type StoryStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface User {
  id: number
  name: string
  email: string
  role?: string
}

export interface Project {
  id: number
  name: string
  description: string
  type: ProjectType
  format: ProjectFormat
  status: ProjectStatus
  createdAt: string
}

export interface Sprint {
  id: number
  name: string
  goal: string
  startDate: string
  endDate: string
  status: SprintStatus
  projectId: number
  velocity: number | null
  storyCount: number
  completedStoryCount: number
}

export interface UserStory {
  id: number
  title: string
  description: string
  acceptanceCriteria: string
  storyPoints: number | null
  priority: Priority
  status: StoryStatus
  sprintId: number | null
  projectId: number
}

export interface Impediment {
  id: number
  title: string
  description: string
  resolved: boolean
  sprintId: number
}

export interface ScrumInsight {
  type: string
  message: string
  severity: InsightSeverity
  sprintId?: number
  projectId?: number
}

export interface Dashboard {
  activeProjects: Project[]
  activeSprints: Sprint[]
  insights: ScrumInsight[]
  totalProjects: number
  totalSprints: number
  completedStories: number
}

export interface AuthResponse {
  token: string
  user: User
}
