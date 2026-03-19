import axios from 'axios'
import type {
  Project,
  ProjectType,
  Sprint,
  UserStory,
  Impediment,
  Dashboard,
  ScrumInsight,
  AuthResponse,
} from '../types'
import { getToken, clearToken } from './auth'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Auth
export const login = (data: { email: string; password: string }) =>
  api.post<AuthResponse>('/auth/login', data)

export const register = (data: { name: string; email: string; password: string }) =>
  api.post<AuthResponse>('/auth/register', data)

// Projects
export const getProjects = (type?: ProjectType) =>
  api.get<Project[]>('/projects', { params: type ? { type } : {} })

export const createProject = (data: {
  name: string
  description: string
  type: ProjectType
}) => api.post<Project>('/projects', data)

export const updateProject = (
  id: number,
  data: Partial<{ name: string; description: string; type: ProjectType; status: string }>,
) => api.put<Project>(`/projects/${id}`, data)

export const deleteProject = (id: number) => api.delete(`/projects/${id}`)

// Sprints
export const getSprints = (projectId: number) =>
  api.get<Sprint[]>('/sprints', { params: { projectId } })

export const createSprint = (data: {
  name: string
  goal: string
  startDate: string
  endDate: string
  projectId: number
}) => api.post<Sprint>('/sprints', data)

export const updateSprint = (
  id: number,
  data: Partial<{ name: string; goal: string; startDate: string; endDate: string }>,
) => api.put<Sprint>(`/sprints/${id}`, data)

export const startSprint = (id: number) => api.post<Sprint>(`/sprints/${id}/start`)

export const completeSprint = (id: number) => api.post<Sprint>(`/sprints/${id}/complete`)

// Stories
export const getBacklog = (projectId: number) =>
  api.get<UserStory[]>('/stories', { params: { projectId } })

export const getSprintStories = (sprintId: number) =>
  api.get<UserStory[]>('/stories', { params: { sprintId } })

export const createStory = (data: {
  title: string
  description: string
  acceptanceCriteria: string
  storyPoints?: number
  priority: string
  projectId: number
  sprintId?: number
}) => api.post<UserStory>('/stories', data)

export const updateStory = (
  id: number,
  data: Partial<{
    title: string
    description: string
    acceptanceCriteria: string
    storyPoints: number
    priority: string
    status: string
  }>,
) => api.put<UserStory>(`/stories/${id}`, data)

export const moveToSprint = (storyId: number, sprintId: number) =>
  api.post(`/stories/${storyId}/move-to-sprint`, { sprintId })

export const deleteStory = (id: number) => api.delete(`/stories/${id}`)

// Impediments
export const getImpediments = (sprintId: number) =>
  api.get<Impediment[]>('/impediments', { params: { sprintId } })

export const createImpediment = (data: {
  title: string
  description: string
  sprintId: number
}) => api.post<Impediment>('/impediments', data)

export const resolveImpediment = (id: number) =>
  api.post<Impediment>(`/impediments/${id}/resolve`)

// Dashboard
export const getDashboard = () => api.get<Dashboard>('/dashboard')
export const getInsights = () => api.get<ScrumInsight[]>('/dashboard/insights')
