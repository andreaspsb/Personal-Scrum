import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type { AuthenticatedUser, UserRow, UserDTO } from '../types'

type AuthRequest = FastifyRequest & { user: AuthenticatedUser }

const updateRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
})

function toDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  }
}

/**
 * Checks whether the authenticated user has the ADMIN role.
 * Mirrors Spring's @PreAuthorize("hasRole('ADMIN')") on UserController.
 */
function requireAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'ROLE_ADMIN'
}

export default async function userRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /users
   * Admin only — returns all users.
   */
  app.get('/users', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    if (!requireAdmin(user)) {
      return reply.status(403).send({ message: 'Access denied' })
    }

    const result = await pool.query<UserRow>(
      'SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id ASC',
    )

    return reply.send(result.rows.map(toDTO))
  })

  /**
   * PUT /users/:id/role
   * Admin only — updates a user's role.
   * Body: { role }
   */
  app.put('/users/:id/role', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    if (!requireAdmin(user)) {
      return reply.status(403).send({ message: 'Access denied' })
    }

    const { id } = request.params as { id: string }
    const parsed = updateRoleSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }

    // Normalize role: prefix with ROLE_ if not already present (mirrors Spring's UserUseCase)
    let newRole = parsed.data.role.toUpperCase()
    if (!newRole.startsWith('ROLE_')) {
      newRole = `ROLE_${newRole}`
    }

    const result = await pool.query<UserRow>(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, role, created_at, updated_at`,
      [newRole, id],
    )

    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: `User not found with id ${id}` })
    }

    return reply.send(toDTO(result.rows[0]))
  })

  /**
   * DELETE /users/:id
   * Admin only — deletes a user.
   */
  app.delete('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest
    if (!requireAdmin(user)) {
      return reply.status(403).send({ message: 'Access denied' })
    }

    const { id } = request.params as { id: string }
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id])

    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({ message: `User not found with id ${id}` })
    }

    return reply.status(204).send()
  })
}
