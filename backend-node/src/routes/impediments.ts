import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { createImpedimentSchema } from '../utils/validation';
import { ImpedimentDTO } from '../types';

type AuthRequest = FastifyRequest & { userId: number };

function toImpedimentDTO(row: {
  id: number;
  title: string;
  description: string | null;
  resolved: boolean;
  sprint_id: number;
}): ImpedimentDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    resolved: row.resolved,
    sprintId: row.sprint_id,
  };
}

async function findSprintForUser(
  sprintId: string | number,
  userId: number,
  reply: FastifyReply,
): Promise<{ id: number } | null> {
  const result = await pool.query(
    `SELECT s.id FROM sprints s
     JOIN projects p ON s.project_id = p.id
     WHERE s.id = $1 AND p.user_id = $2`,
    [sprintId, userId],
  );

  if (result.rows.length === 0) {
    reply.status(404).send({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Sprint not found',
    });
    return null;
  }

  return result.rows[0];
}

export async function impedimentRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/impediments?sprintId=:sprintId
   */
  fastify.get(
    '/api/impediments',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { sprintId } = request.query as { sprintId?: string };

      if (!sprintId) {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'sprintId query parameter is required',
        });
      }

      const sprint = await findSprintForUser(sprintId, userId, reply);
      if (!sprint) return;

      const result = await pool.query(
        `SELECT id, title, description, resolved, sprint_id
         FROM impediments WHERE sprint_id = $1
         ORDER BY created_at ASC`,
        [sprintId],
      );

      return reply.send(result.rows.map(toImpedimentDTO));
    },
  );

  /**
   * POST /api/impediments
   */
  fastify.post(
    '/api/impediments',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;

      const parsed = createImpedimentSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { title, description, sprintId } = parsed.data;

      const sprint = await findSprintForUser(sprintId, userId, reply);
      if (!sprint) return;

      const result = await pool.query(
        `INSERT INTO impediments (title, description, resolved, sprint_id, created_at, updated_at)
         VALUES ($1, $2, FALSE, $3, NOW(), NOW())
         RETURNING id, title, description, resolved, sprint_id`,
        [title, description ?? null, sprintId],
      );

      return reply.status(200).send(toImpedimentDTO(result.rows[0]));
    },
  );

  /**
   * POST /api/impediments/:id/resolve
   */
  fastify.post(
    '/api/impediments/:id/resolve',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      // Verify impediment exists and belongs to user
      const impedimentResult = await pool.query(
        `SELECT i.id, i.title, i.description, i.resolved, i.sprint_id
         FROM impediments i
         JOIN sprints s ON i.sprint_id = s.id
         JOIN projects p ON s.project_id = p.id
         WHERE i.id = $1 AND p.user_id = $2`,
        [id, userId],
      );

      if (impedimentResult.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Impediment not found',
        });
      }

      const result = await pool.query(
        `UPDATE impediments SET resolved = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING id, title, description, resolved, sprint_id`,
        [id],
      );

      return reply.send(toImpedimentDTO(result.rows[0]));
    },
  );
}
