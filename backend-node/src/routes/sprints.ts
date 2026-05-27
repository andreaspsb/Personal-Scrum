import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { createSprintSchema, updateSprintSchema } from '../utils/validation';
import { SprintDTO } from '../types';

type AuthRequest = FastifyRequest & { userId: number };

async function buildSprintDTO(row: {
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  project_id: number;
  velocity: number | null;
}): Promise<SprintDTO> {
  const storiesResult = await pool.query<{ status: string }>(
    'SELECT status FROM user_stories WHERE sprint_id = $1',
    [row.id],
  );
  const stories = storiesResult.rows;
  const completedStoryCount = stories.filter((s) => s.status === 'DONE').length;

  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as SprintDTO['status'],
    projectId: row.project_id,
    velocity: row.velocity,
    storyCount: stories.length,
    completedStoryCount,
  };
}

async function findSprintForUser(
  sprintId: string | number,
  userId: number,
  reply: FastifyReply,
): Promise<{
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  project_id: number;
  velocity: number | null;
} | null> {
  const result = await pool.query(
    `SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.status, s.project_id, s.velocity
     FROM sprints s
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

export async function sprintRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/sprints?projectId=:projectId
   */
  fastify.get(
    '/api/sprints',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { projectId } = request.query as { projectId?: string };

      if (!projectId) {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'projectId query parameter is required',
        });
      }

      // Verify project belongs to user
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId],
      );
      if (projectCheck.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      const result = await pool.query(
        `SELECT id, name, goal, start_date, end_date, status, project_id, velocity
         FROM sprints WHERE project_id = $1
         ORDER BY created_at DESC`,
        [projectId],
      );

      const dtos = await Promise.all(result.rows.map(buildSprintDTO));
      return reply.send(dtos);
    },
  );

  /**
   * POST /api/sprints
   */
  fastify.post(
    '/api/sprints',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;

      const parsed = createSprintSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { name, goal, startDate, endDate, projectId } = parsed.data;

      // Verify project belongs to user and is SCRUM format
      const projectResult = await pool.query(
        'SELECT id, format FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId],
      );
      if (projectResult.rows.length === 0) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      if (projectResult.rows[0].format !== 'SCRUM') {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Sprints are only available for SCRUM projects',
        });
      }

      const result = await pool.query(
        `INSERT INTO sprints (name, goal, start_date, end_date, status, project_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'PLANNED', $5, NOW(), NOW())
         RETURNING id, name, goal, start_date, end_date, status, project_id, velocity`,
        [name, goal ?? null, startDate ?? null, endDate ?? null, projectId],
      );

      const dto = await buildSprintDTO(result.rows[0]);
      return reply.status(200).send(dto);
    },
  );

  /**
   * GET /api/sprints/:id
   */
  fastify.get(
    '/api/sprints/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const sprint = await findSprintForUser(id, userId, reply);
      if (!sprint) return;

      const dto = await buildSprintDTO(sprint);
      return reply.send(dto);
    },
  );

  /**
   * PUT /api/sprints/:id
   */
  fastify.put(
    '/api/sprints/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const parsed = updateSprintSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const sprint = await findSprintForUser(id, userId, reply);
      if (!sprint) return;

      const { name, goal, startDate, endDate, status } = parsed.data;

      const newName = name && name.trim() ? name : sprint.name;
      const newGoal = goal !== undefined ? goal : sprint.goal;
      const newStartDate = startDate !== undefined ? startDate : sprint.start_date;
      const newEndDate = endDate !== undefined ? endDate : sprint.end_date;
      const newStatus = status ?? sprint.status;

      const result = await pool.query(
        `UPDATE sprints
         SET name = $1, goal = $2, start_date = $3, end_date = $4, status = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, name, goal, start_date, end_date, status, project_id, velocity`,
        [newName, newGoal, newStartDate, newEndDate, newStatus, id],
      );

      const dto = await buildSprintDTO(result.rows[0]);
      return reply.send(dto);
    },
  );

  /**
   * POST /api/sprints/:id/start
   */
  fastify.post(
    '/api/sprints/:id/start',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const sprint = await findSprintForUser(id, userId, reply);
      if (!sprint) return;

      if (sprint.status !== 'PLANNED') {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Only PLANNED sprints can be started',
        });
      }

      const startDate = sprint.start_date ?? new Date().toISOString().split('T')[0];

      const result = await pool.query(
        `UPDATE sprints
         SET status = 'ACTIVE', start_date = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, goal, start_date, end_date, status, project_id, velocity`,
        [startDate, id],
      );

      const dto = await buildSprintDTO(result.rows[0]);
      return reply.send(dto);
    },
  );

  /**
   * POST /api/sprints/:id/complete
   */
  fastify.post(
    '/api/sprints/:id/complete',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const sprint = await findSprintForUser(id, userId, reply);
      if (!sprint) return;

      if (sprint.status !== 'ACTIVE') {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Only ACTIVE sprints can be completed',
        });
      }

      // Calculate velocity: sum of story points for DONE stories
      const velocityResult = await pool.query<{ velocity: string }>(
        `SELECT COALESCE(SUM(story_points), 0) AS velocity
         FROM user_stories
         WHERE sprint_id = $1 AND status = 'DONE'`,
        [id],
      );
      const velocity = parseInt(velocityResult.rows[0].velocity, 10);
      const endDate = sprint.end_date ?? new Date().toISOString().split('T')[0];

      const result = await pool.query(
        `UPDATE sprints
         SET status = 'COMPLETED', velocity = $1, end_date = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, goal, start_date, end_date, status, project_id, velocity`,
        [velocity, endDate, id],
      );

      const dto = await buildSprintDTO(result.rows[0]);
      return reply.send(dto);
    },
  );
}
