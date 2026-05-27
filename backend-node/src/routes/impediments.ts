import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type { AuthenticatedUser, ImpedimentRow, ImpedimentDTO } from '../types'

type AuthRequest = FastifyRequest & { user: AuthenticatedUser }

const createImpedimentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  sprintId: z.number().int().positive(),
})

const updateImpedimentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  resolved: z.boolean().optional(),
})

function toDTO(row: ImpedimentRow): ImpedimentDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    resolved: row.resolved,
    sprintId: row.sprint_id,
  }
}

/**
 * Verify that a sprint belongs to a project owned by the given user.
 */
async function findSprintForUser(
  sprintId: string | number,
  userId: number,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT s.id FROM sprints s
     JOIN projects p ON p.id = s.project_id
     WHERE s.id = $1 AND p.user_id = $2`,
    [sprintId, userId],
  )
  return (result.rowCount ?? 0) > 0
}

export default async function impedimentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /impediments?sprintId=X
   */
  app.get('/impediments', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { sprintId } = request.query as { sprintId?: string }

    if (!sprintId) {
      return reply.status(400).send({ message: 'sprintId query parameter is required' })
    }

    const authorized = await findSprintForUser(sprintId, user.id)
    if (!authorized) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }

    const result = await pool.query<ImpedimentRow>(
      'SELECT * FROM impediments WHERE sprint_id = $1 ORDER BY created_at ASC',
      [sprintId],
    )

    return reply.send(result.rows.map(toDTO))
  })

  /**
   * POST /impediments
   * Body: { title, description?, sprintId }
   */
  app.post('/impediments', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const parsed = createImpedimentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { title, description, sprintId } = parsed.data

    const authorized = await findSprintForUser(sprintId, user.id)
    if (!authorized) {
      return reply.status(404).send({ message: 'Sprint not found' })
    }

    const result = await pool.query<ImpedimentRow>(
      `INSERT INTO impediments (title, description, resolved, sprint_id, created_at, updated_at)
       VALUES ($1, $2, FALSE, $3, NOW(), NOW())
       RETURNING *`,
      [title, description ?? null, sprintId],
    )

    return reply.status(200).send(toDTO(result.rows[0]))
  })

  /**
   * PUT /impediments/:id
   * Body: { title?, description?, resolved? }
   */
  app.put('/impediments/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const parsed = updateImpedimentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }

    // Verify impediment exists and belongs to user's sprint
    const existing = await pool.query<ImpedimentRow>(
      `SELECT i.* FROM impediments i
       JOIN sprints s ON s.id = i.sprint_id
       JOIN projects p ON p.id = s.project_id
       WHERE i.id = $1 AND p.user_id = $2`,
      [id, user.id],
    )
    if ((existing.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Impediment not found' })
    }

    const imp = existing.rows[0]
    const { title, description, resolved } = parsed.data

    const newTitle = (title && title.trim()) ? title : imp.title
    const newDescription = description !== undefined ? description : imp.description
    const newResolved = resolved !== undefined ? resolved : imp.resolved

    const result = await pool.query<ImpedimentRow>(
      `UPDATE impediments
       SET title = $1, description = $2, resolved = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newTitle, newDescription, newResolved, id],
    )

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * DELETE /impediments/:id
   */
  app.delete('/impediments/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const existing = await pool.query(
      `SELECT i.id FROM impediments i
       JOIN sprints s ON s.id = i.sprint_id
       JOIN projects p ON p.id = s.project_id
       WHERE i.id = $1 AND p.user_id = $2`,
      [id, user.id],
    )
    if ((existing.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Impediment not found' })
    }

    await pool.query('DELETE FROM impediments WHERE id = $1', [id])
    return reply.status(204).send()
  })

  /**
   * POST /impediments/:id/resolve
   * Marks an impediment as resolved.
   */
  app.post('/impediments/:id/resolve', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const existing = await pool.query<ImpedimentRow>(
      `SELECT i.* FROM impediments i
       JOIN sprints s ON s.id = i.sprint_id
       JOIN projects p ON p.id = s.project_id
       WHERE i.id = $1 AND p.user_id = $2`,
      [id, user.id],
    )
    if ((existing.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Impediment not found' })
    }

    const result = await pool.query<ImpedimentRow>(
      `UPDATE impediments SET resolved = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    )

    return reply.send(toDTO(result.rows[0]))
  })
}
