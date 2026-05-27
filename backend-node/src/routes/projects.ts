import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema } from '../utils/validation';
import { ProjectDTO, ProjectType } from '../types';

type AuthRequest = FastifyRequest & { userId: number };

function toProjectDTO(row: {
  id: number;
  name: string;
  description: string | null;
  type: string;
  format: string;
  status: string;
  created_at: Date;
}): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as ProjectDTO['type'],
    format: row.format as ProjectDTO['format'],
    status: row.status as ProjectDTO['status'],
    createdAt: row.created_at,
  };
}

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/projects
   * Query param: ?type=PERSONAL|PROFESSIONAL
   */
  fastify.get(
    '/api/projects',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { type } = request.query as { type?: ProjectType };

      let result;
      if (type) {
        result = await pool.query(
          `SELECT id, name, description, type, format, status, created_at
           FROM projects WHERE user_id = $1 AND type = $2
           ORDER BY created_at DESC`,
          [userId, type],
        );
      } else {
        result = await pool.query(
          `SELECT id, name, description, type, format, status, created_at
           FROM projects WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId],
        );
      }

      return reply.send(result.rows.map(toProjectDTO));
    },
  );

  /**
   * POST /api/projects
   */
  fastify.post(
    '/api/projects',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;

      const parsed = createProjectSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { name, description, type, format } = parsed.data;
      const projectFormat = format ?? 'SCRUM';

      const result = await pool.query(
        `INSERT INTO projects (name, description, type, format, status, user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW(), NOW())
         RETURNING id, name, description, type, format, status, created_at`,
        [name, description ?? null, type, projectFormat, userId],
      );

      return reply.status(200).send(toProjectDTO(result.rows[0]));
    },
  );

  /**
   * GET /api/projects/:id
   */
  fastify.get(
    '/api/projects/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const result = await pool.query(
        `SELECT id, name, description, type, format, status, created_at
         FROM projects WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      return reply.send(toProjectDTO(result.rows[0]));
    },
  );

  /**
   * PUT /api/projects/:id
   */
  fastify.put(
    '/api/projects/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const parsed = updateProjectSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      // Fetch existing project
      const existing = await pool.query(
        'SELECT id, name, description, status FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
      if (existing.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      const current = existing.rows[0];
      const { name, description, status } = parsed.data;

      const newName = name && name.trim() ? name : current.name;
      const newDescription = description !== undefined ? description : current.description;
      const newStatus = status ?? current.status;

      const result = await pool.query(
        `UPDATE projects
         SET name = $1, description = $2, status = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING id, name, description, type, format, status, created_at`,
        [newName, newDescription, newStatus, id, userId],
      );

      return reply.send(toProjectDTO(result.rows[0]));
    },
  );

  /**
   * DELETE /api/projects/:id
   */
  fastify.delete(
    '/api/projects/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const existing = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
      if (existing.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      return reply.status(204).send();
    },
  );
}
