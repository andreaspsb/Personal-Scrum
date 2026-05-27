import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type { AuthenticatedUser, SprintRow, UserStoryRow, SprintDTO } from '../types'

type AuthRequest = FastifyRequest & { user: AuthenticatedUser }

const createSprintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  goal: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  projectId: z.number().int().positive(),
})

const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
})

async function buildSprintDTO(sprint: SprintRow): Promise<SprintDTO> {
  const storiesResult = await pool.query<UserStoryRow>(
    'SELECT id, status FROM user_stories WHERE sprint_id = $1',
    [sprint.id],
  )
  const stories = storiesResult.rows
  const completedCount = stories.filter((s) => s.status === 'DONE').length

  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal,
    startDate: sprint.start_date,
    endDate: sprint.end_date,
    status: sprint.status,
    projectId: sprint.project_id,
    velocity: sprint.velocity,
    storyCount: stories.length,
    completedStoryCount: completedCount,
  }
}

/**
 * Verify that a sprint belongs to a project owned by the given user.
 * Returns the sprint row or null if not found / not authorized.
 */
async function findSprintForUser(
  sprintId: string | number,
  userId: number,
): Promise<SprintRow | null> {
  const result = await pool.query<SprintRow>(
    `SELECT s.* FROM sprints s
     JOIN projects p ON p.id = s.project_id
     WHERE s.id = $1 AND p.user_id = $2`,
    [sprintId, userId],
  )
  return result.rows[0] ?? null
}

export default async function sprintRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /sprints?projectId=X
   * Returns all sprints for a project owned by the authenticated user.
   */
  app.get('/sprints', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { projectId } = request.query as { projectId?: string }

    if (!projectId) {
      return reply.status(400).send({ message: 'projectId query parameter is required' })
    }

    // Verify project ownership
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, user.id],
    )
    if ((projectResult.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    const result = await pool.query<SprintRow>(
      'SELECT * FROM sprints WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId],
    )

    const dtos = await Promise.all(result.rows.map(buildSprintDTO))
    return reply.send(dtos)
  })

  /**
   * POST /sprints
   * Body: { name, goal?, startDate?, endDate?, projectId }
   */
  app.post('/sprints', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const parsed = createSprintSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { name, goal, startDate, endDate, projectId } = parsed.data

    // Verify project ownership and format
    const projectResult = await pool.query<{ id: number; format: string }>(
      'SELECT id, format FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, user.id],
    )
    if ((projectResult.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }
    if (projectResult.rows[0].format !== 'SCRUM') {
      return reply.status(400).send({ message: 'Sprints are only available for SCRUM projects' })
    }

    const result = await pool.query<SprintRow>(
      `INSERT INTO sprints (name, goal, start_date, end_date, status, project_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PLANNED', $5, NOW(), NOW())
       RETURNING *`,
      [name, goal ?? null, startDate ?? null, endDate ?? null, projectId],
    )

    return reply.status(200).send(await buildSprintDTO(result.rows[0]))
  })

  /**
   * GET /sprints/:id
   */
  app.get('/sprints/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const sprint = await findSprintForUser(id, user.id)
    if (!sprint) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }

    return reply.send(await buildSprintDTO(sprint))
  })

  /**
   * PUT /sprints/:id
   * Body: { name?, goal?, startDate?, endDate?, status? }
   */
  app.put('/sprints/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const parsed = updateSprintSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }

    const sprint = await findSprintForUser(id, user.id)
    if (!sprint) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }

    const { name, goal, startDate, endDate, status } = parsed.data

    const newName = (name && name.trim()) ? name : sprint.name
    const newGoal = goal !== undefined ? goal : sprint.goal
    const newStartDate = startDate !== undefined ? startDate : sprint.start_date
    const newEndDate = endDate !== undefined ? endDate : sprint.end_date
    const newStatus = status ?? sprint.status

    const result = await pool.query<SprintRow>(
      `UPDATE sprints
       SET name = $1, goal = $2, start_date = $3, end_date = $4, status = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newName, newGoal, newStartDate, newEndDate, newStatus, id],
    )

    return reply.send(await buildSprintDTO(result.rows[0]))
  })

  /**
   * DELETE /sprints/:id
   */
  app.delete('/sprints/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const sprint = await findSprintForUser(id, user.id)
    if (!sprint) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }

    await pool.query('DELETE FROM sprints WHERE id = $1', [id])
    return reply.status(204).send()
  })

  /**
   * POST /sprints/:id/start
   * Transitions a PLANNED sprint to ACTIVE.
   */
  app.post('/sprints/:id/start', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const sprint = await findSprintForUser(id, user.id)
    if (!sprint) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }
    if (sprint.status !== 'PLANNED') {
      return reply.status(400).send({ message: 'Only PLANNED sprints can be started' })
    }

    // Set startDate to today if not already set
    const startDate = sprint.start_date ?? new Date().toISOString().split('T')[0]

    const result = await pool.query<SprintRow>(
      `UPDATE sprints
       SET status = 'ACTIVE', start_date = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [startDate, id],
    )

    return reply.send(await buildSprintDTO(result.rows[0]))
  })

  /**
   * POST /sprints/:id/complete
   * Transitions an ACTIVE sprint to COMPLETED and calculates velocity.
   */
  app.post('/sprints/:id/complete', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const sprint = await findSprintForUser(id, user.id)
    if (!sprint) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }
    if (sprint.status !== 'ACTIVE') {
      return reply.status(400).send({ message: 'Only ACTIVE sprints can be completed' })
    }

    // Calculate velocity: sum of story points for DONE stories
    const velocityResult = await pool.query<{ velocity: string }>(
      `SELECT COALESCE(SUM(story_points), 0) AS velocity
       FROM user_stories
       WHERE sprint_id = $1 AND status = 'DONE'`,
      [id],
    )
    const velocity = parseInt(velocityResult.rows[0].velocity, 10)
    const endDate = sprint.end_date ?? new Date().toISOString().split('T')[0]

    const result = await pool.query<SprintRow>(
      `UPDATE sprints
       SET status = 'COMPLETED', velocity = $1, end_date = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [velocity, endDate, id],
    )

    return reply.send(await buildSprintDTO(result.rows[0]))
  })
}
