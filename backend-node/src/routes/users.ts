import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { updateUserRoleSchema } from '../utils/validation';
import { UserDTO } from '../types';

type AuthRequest = FastifyRequest & { userId: number };

function toUserDTO(row: {
  id: number;
  name: string;
  email: string;
  role: string;
}): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

/**
 * Prehandler that verifies the authenticated user has ROLE_ADMIN.
 */
async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (request as AuthRequest).userId;

  const result = await pool.query<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [userId],
  );

  if (result.rows.length === 0 || result.rows[0].role !== 'ROLE_ADMIN') {
    return reply.status(403).send({
      timestamp: new Date().toISOString(),
      status: 403,
      error: 'Forbidden',
      message: 'Access denied',
    });
  }
}

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/users
   * Admin only
   */
  fastify.get(
    '/api/users',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await pool.query(
        'SELECT id, name, email, role FROM users ORDER BY id ASC',
      );
      return reply.send(result.rows.map(toUserDTO));
    },
  );

  /**
   * PUT /api/users/:id/role
   * Admin only
   */
  fastify.put(
    '/api/users/:id/role',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = updateUserRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      let { role } = parsed.data;
      role = role.toUpperCase();
      if (!role.startsWith('ROLE_')) {
        role = `ROLE_${role}`;
      }

      const result = await pool.query(
        `UPDATE users SET role = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, email, role`,
        [role, id],
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: `User not found with id ${id}`,
        });
      }

      return reply.send(toUserDTO(result.rows[0]));
    },
  );

  /**
   * DELETE /api/users/:id
   * Admin only
   */
  fastify.delete(
    '/api/users/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const existing = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [id],
      );
      if (existing.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: `User not found with id ${id}`,
        });
      }

      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return reply.status(204).send();
    },
  );
}
