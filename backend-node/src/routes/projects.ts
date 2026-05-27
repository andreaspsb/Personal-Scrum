import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type { AuthenticatedUser, ProjectRow, ProjectDTO } from '../types'

type AuthRequest = FastifyRequest & { user: AuthenticatedUser }

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  type: z.enum(['PERSONAL', 'PROFESSIONAL']),
  format: z.enum(['SCRUM', 'KANBAN']).optional().default('SCRUM'),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED']).optional(),
})

function toDTO(row: ProjectRow): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    format: row.format,
    status: row.status,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  }
}

export default async function projectRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /projects?type=PERSONAL|PROFESSIONAL
   * Returns all projects belonging to the authenticated user, optionally filtered by type.
   */
  app.get('/projects', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { type } = request.query as { type?: string }

    let result
    if (type) {
      result = await pool.query<ProjectRow>(
        'SELECT * FROM projects WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC',
        [user.id, type],
      )
    } else {
      result = await pool.query<ProjectRow>(
        'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
        [user.id],
      )
    }

    return reply.send(result.rows.map(toDTO))
  })

  /**
   * POST /projects
   * Body: { name, description, type, format? }
   */
  app.post('/projects', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const parsed = createProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { name, description, type, format } = parsed.data

    const result = await pool.query<ProjectRow>(
      `INSERT INTO projects (name, description, type, format, status, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW(), NOW())
       RETURNING *`,
      [name, description ?? null, type, format, user.id],
    )

    return reply.status(200).send(toDTO(result.rows[0]))
  })

  /**
   * GET /projects/:id
   */
  app.get('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const result = await pool.query<ProjectRow>(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, user.id],
    )

    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * PUT /projects/:id
   * Body: { name?, description?, status? }
   */
  app.put('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const parsed = updateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }

    // Fetch existing project first
    const existing = await pool.query<ProjectRow>(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, user.id],
    )
    if ((existing.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    const project = existing.rows[0]
    const { name, description, status } = parsed.data

    const newName = (name && name.trim()) ? name : project.name
    const newDescription = description !== undefined ? description : project.description
    const newStatus = status ?? project.status

    const result = await pool.query<ProjectRow>(
      `UPDATE projects
       SET name = $1, description = $2, status = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [newName, newDescription, newStatus, id, user.id],
    )

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * DELETE /projects/:id
   */
  app.delete('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    const { id } = request.params as { id: string }

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2',
      [id, user.id],
    )

    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    return reply.status(204).send()
  })
}
