import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type { UserStory, UserStoryDTO } from '../types'

type UserStoryRow = UserStory
type AuthRequest = FastifyRequest & { userId: number }

const createStorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  storyPoints: z.number().int().min(0).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  projectId: z.number().int().positive(),
  sprintId: z.number().int().positive().optional().nullable(),
})

const updateStorySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  storyPoints: z.number().int().min(0).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  sprintId: z.number().int().positive().optional().nullable(),
})

const moveToSprintSchema = z.object({
  sprintId: z.number().int().positive(),
})

function toDTO(row: UserStoryRow): UserStoryDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    acceptanceCriteria: row.acceptance_criteria,
    storyPoints: row.story_points,
    priority: row.priority,
    status: row.status,
    sprintId: row.sprint_id,
    projectId: row.project_id,
  }
}

/**
 * Verify that a story belongs to a project owned by the given user.
 */
async function findStoryForUser(
  storyId: string | number,
  userId: number,
): Promise<UserStoryRow | null> {
  const result = await pool.query<UserStoryRow>(
    `SELECT us.* FROM user_stories us
     JOIN projects p ON p.id = us.project_id
     WHERE us.id = $1 AND p.user_id = $2`,
    [storyId, userId],
  )
  return result.rows[0] ?? null
}

export default async function storyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /stories?projectId=X   → backlog (stories with no sprint)
   * GET /stories?sprintId=X    → sprint stories
   */
  app.get('/stories', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const { projectId, sprintId } = request.query as {
      projectId?: string
      sprintId?: string
    }

    if (sprintId) {
      // Verify sprint ownership
      const sprintResult = await pool.query(
        `SELECT s.id FROM sprints s
         JOIN projects p ON p.id = s.project_id
         WHERE s.id = $1 AND p.user_id = $2`,
        [sprintId, userId],
      )
      if ((sprintResult.rowCount ?? 0) === 0) {
        return reply.status(404).send({ message: 'Sprint not found' })
      }

      const result = await pool.query<UserStoryRow>(
        'SELECT * FROM user_stories WHERE sprint_id = $1 ORDER BY created_at ASC',
        [sprintId],
      )
      return reply.send(result.rows.map(toDTO))
    }

    if (projectId) {
      // Verify project ownership
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId],
      )
      if ((projectResult.rowCount ?? 0) === 0) {
        return reply.status(404).send({ message: 'Project not found' })
      }

      // Backlog = stories with no sprint assigned
      const result = await pool.query<UserStoryRow>(
        `SELECT * FROM user_stories
         WHERE project_id = $1 AND sprint_id IS NULL
         ORDER BY created_at ASC`,
        [projectId],
      )
      return reply.send(result.rows.map(toDTO))
    }

    return reply.status(400).send({ message: 'projectId or sprintId query parameter is required' })
  })

  /**
   * POST /stories
   * Body: { title, description?, acceptanceCriteria?, storyPoints?, priority?, projectId, sprintId? }
   */
  app.post('/stories', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const parsed = createStorySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { title, description, acceptanceCriteria, storyPoints, priority, projectId, sprintId } =
      parsed.data

    // Verify project ownership and get format
    const projectResult = await pool.query<{ id: number; format: string }>(
      'SELECT id, format FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId],
    )
    if ((projectResult.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    // KANBAN projects start stories in TODO; SCRUM projects start in BACKLOG
    const initialStatus = projectResult.rows[0].format === 'KANBAN' ? 'TODO' : 'BACKLOG'

    const result = await pool.query<UserStoryRow>(
      `INSERT INTO user_stories
         (title, description, acceptance_criteria, story_points, priority, status, sprint_id, project_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        title,
        description ?? null,
        acceptanceCriteria ?? null,
        storyPoints ?? null,
        priority,
        initialStatus,
        sprintId ?? null,
        projectId,
      ],
    )

    return reply.status(200).send(toDTO(result.rows[0]))
  })

  /**
   * GET /stories/:id
   */
  app.get('/stories/:id', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const { id } = request.params as { id: string }

    const story = await findStoryForUser(id, userId)
    if (!story) {
      return reply.status(404).send({ message: 'User story not found' })
    }

    return reply.send(toDTO(story))
  })

  /**
   * PUT /stories/:id
   * Body: { title?, description?, acceptanceCriteria?, storyPoints?, priority?, status?, sprintId? }
   */
  app.put('/stories/:id', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const { id } = request.params as { id: string }

    const parsed = updateStorySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }

    const story = await findStoryForUser(id, userId)
    if (!story) {
      return reply.status(404).send({ message: 'User story not found' })
    }

    const { title, description, acceptanceCriteria, storyPoints, priority, status, sprintId } =
      parsed.data

    // If assigning to a sprint, verify the sprint belongs to the same project
    if (sprintId !== undefined && sprintId !== null) {
      const sprintResult = await pool.query<{ project_id: number }>(
        `SELECT s.project_id FROM sprints s
         JOIN projects p ON p.id = s.project_id
         WHERE s.id = $1 AND p.user_id = $2`,
        [sprintId, userId],
      )
      if ((sprintResult.rowCount ?? 0) === 0) {
        return reply.status(404).send({ message: 'Sprint not found' })
      }
      if (sprintResult.rows[0].project_id !== story.project_id) {
        return reply.status(400).send({ message: 'Story and sprint must belong to the same project' })
      }
    }

    const newTitle = (title && title.trim()) ? title : story.title
    const newDescription = description !== undefined ? description : story.description
    const newAC = acceptanceCriteria !== undefined ? acceptanceCriteria : story.acceptance_criteria
    const newPoints = storyPoints !== undefined ? storyPoints : story.story_points
    const newPriority = priority ?? story.priority
    const newStatus = status ?? story.status
    const newSprintId = sprintId !== undefined ? sprintId : story.sprint_id

    const result = await pool.query<UserStoryRow>(
      `UPDATE user_stories
       SET title = $1, description = $2, acceptance_criteria = $3, story_points = $4,
           priority = $5, status = $6, sprint_id = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [newTitle, newDescription, newAC, newPoints, newPriority, newStatus, newSprintId, id],
    )

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * POST /stories/:id/move-to-sprint
   * Body: { sprintId }
   * Moves a backlog story into a sprint and sets status to TODO.
   */
  app.post('/stories/:id/move-to-sprint', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const { id } = request.params as { id: string }

    const parsed = moveToSprintSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { sprintId } = parsed.data

    const story = await findStoryForUser(id, userId)
    if (!story) {
      return reply.status(404).send({ message: 'User story not found' })
    }

    // Verify project format is SCRUM
    const projectResult = await pool.query<{ format: string }>(
      'SELECT format FROM projects WHERE id = $1',
      [story.project_id],
    )
    if (projectResult.rows[0]?.format !== 'SCRUM') {
      return reply.status(400).send({ message: 'Only SCRUM projects can move stories to a sprint' })
    }

    // Verify sprint ownership and same project
    const sprintResult = await pool.query<{ project_id: number }>(
      `SELECT s.project_id FROM sprints s
       JOIN projects p ON p.id = s.project_id
       WHERE s.id = $1 AND p.user_id = $2`,
      [sprintId, userId],
    )
    if ((sprintResult.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }
    if (sprintResult.rows[0].project_id !== story.project_id) {
      return reply.status(400).send({ message: 'Story and sprint must belong to the same project' })
    }

    const result = await pool.query<UserStoryRow>(
      `UPDATE user_stories
       SET sprint_id = $1, status = 'TODO', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [sprintId, id],
    )

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * DELETE /stories/:id
   */
  app.delete('/stories/:id', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request as AuthRequest
    const { id } = request.params as { id: string }

    const story = await findStoryForUser(id, userId)
    if (!story) {
      return reply.status(404).send({ message: 'User story not found' })
    }

    await pool.query('DELETE FROM user_stories WHERE id = $1', [id])
    return reply.status(204).send()
  })
}
