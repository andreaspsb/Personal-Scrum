import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

const projectTypeEnum = z.enum(['PERSONAL', 'PROFESSIONAL']);
const projectFormatEnum = z.enum(['SCRUM', 'KANBAN']);
const projectStatusEnum = z.enum(['ACTIVE', 'COMPLETED', 'PAUSED']);

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: projectTypeEnum,
  format: projectFormatEnum.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: projectStatusEnum.optional(),
});

// ─── Sprints ──────────────────────────────────────────────────────────────────

const sprintStatusEnum = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

export const createSprintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  goal: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  projectId: z.number().int().positive('projectId is required'),
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: sprintStatusEnum.optional(),
});

// ─── User Stories ─────────────────────────────────────────────────────────────

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const storyStatusEnum = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);

export const createUserStorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  storyPoints: z.number().int().positive().optional().nullable(),
  priority: priorityEnum.optional(),
  projectId: z.number().int().positive('projectId is required'),
});

export const updateUserStorySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  storyPoints: z.number().int().positive().optional().nullable(),
  priority: priorityEnum.optional(),
  status: storyStatusEnum.optional(),
  sprintId: z.number().int().positive().optional().nullable(),
});

export const moveToSprintSchema = z.object({
  sprintId: z.number().int().positive('sprintId is required'),
});

// ─── Impediments ──────────────────────────────────────────────────────────────

export const createImpedimentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  sprintId: z.number().int().positive('sprintId is required'),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const updateUserRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});
