import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import {
  createUserStorySchema,
  updateUserStorySchema,
  moveToSprintSchema,
} from '../utils/validation';
import { UserStoryDTO } from '../types';

type AuthRequest = FastifyRequest & { userId: number };

function toUserStoryDTO(row: {
  id: number;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  story_points: number | null;
  priority: string;
  status: string;
  sprint_id: number | null;
  project_id: number;
}): UserStoryDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    acceptanceCriteria: row.acceptance_criteria,
    storyPoints: row.story_points,
    priority: row.priority as UserStoryDTO['priority'],
    status: row.status as UserStoryDTO['status'],
    sprintId: row.sprint_id,
    projectId: row.project_id,
  };
}

async function findStoryForUser(
  storyId: string | number,
  userId: number,
  reply: FastifyReply,
): Promise<{
  id: number;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  story_points: number | null;
  priority: string;
  status: string;
  sprint_id: number | null;
  project_id: number;
  project_format: string;
} | null> {
  const result = await pool.query(
    `SELECT us.id, us.title, us.description, us.acceptance_criteria,
            us.story_points, us.priority, us.status, us.sprint_id, us.project_id,
            p.format AS project_format
     FROM user_stories us
     JOIN projects p ON us.project_id = p.id
     WHERE us.id = $1 AND p.user_id = $2`,
    [storyId, userId],
  );

  if (result.rows.length === 0) {
    reply.status(404).send({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'User story not found',
    });
    return null;
  }

  return result.rows[0];
}

export async function userStoryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/stories
   * Query params: ?projectId=:id  OR  ?sprintId=:id
   */
  fastify.get(
    '/api/stories',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { projectId, sprintId } = request.query as {
        projectId?: string;
        sprintId?: string;
      };

      if (sprintId) {
        // Verify sprint belongs to user
        const sprintCheck = await pool.query(
          `SELECT s.id FROM sprints s
           JOIN projects p ON s.project_id = p.id
           WHERE s.id = $1 AND p.user_id = $2`,
          [sprintId, userId],
        );
        if (sprintCheck.rows.length === 0) {
          return reply.status(404).send({
            timestamp: new Date().toISOString(),
            status: 404,
            error: 'Not Found',
            message: 'Sprint not found',
          });
        }

        const result = await pool.query(
          `SELECT id, title, description, acceptance_criteria, story_points,
                  priority, status, sprint_id, project_id
           FROM user_stories WHERE sprint_id = $1
           ORDER BY created_at ASC`,
          [sprintId],
        );
        return reply.send(result.rows.map(toUserStoryDTO));
      }

      if (projectId) {
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

        // Return backlog (stories not assigned to any sprint)
        const result = await pool.query(
          `SELECT id, title, description, acceptance_criteria, story_points,
                  priority, status, sprint_id, project_id
           FROM user_stories WHERE project_id = $1 AND sprint_id IS NULL
           ORDER BY created_at ASC`,
          [projectId],
        );
        return reply.send(result.rows.map(toUserStoryDTO));
      }

      return reply.status(400).send({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Either projectId or sprintId query parameter is required',
      });
    },
  );

  /**
   * POST /api/stories
   */
  fastify.post(
    '/api/stories',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;

      const parsed = createUserStorySchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { title, description, acceptanceCriteria, storyPoints, priority, projectId } =
        parsed.data;

      // Verify project belongs to user
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

      // KANBAN projects start stories as TODO, SCRUM as BACKLOG
      const initialStatus =
        projectResult.rows[0].format === 'KANBAN' ? 'TODO' : 'BACKLOG';
      const storyPriority = priority ?? 'MEDIUM';

      const result = await pool.query(
        `INSERT INTO user_stories
           (title, description, acceptance_criteria, story_points, priority, status, project_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, title, description, acceptance_criteria, story_points, priority, status, sprint_id, project_id`,
        [
          title,
          description ?? null,
          acceptanceCriteria ?? null,
          storyPoints ?? null,
          storyPriority,
          initialStatus,
          projectId,
        ],
      );

      return reply.status(200).send(toUserStoryDTO(result.rows[0]));
    },
  );

  /**
   * PUT /api/stories/:id
   */
  fastify.put(
    '/api/stories/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const parsed = updateUserStorySchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const story = await findStoryForUser(id, userId, reply);
      if (!story) return;

      const { title, description, acceptanceCriteria, storyPoints, priority, status, sprintId } =
        parsed.data;

      // Handle sprint assignment
      let newSprintId = story.sprint_id;
      if (sprintId !== undefined) {
        if (sprintId === null) {
          newSprintId = null;
        } else {
          if (story.project_format !== 'SCRUM') {
            return reply.status(400).send({
              timestamp: new Date().toISOString(),
              status: 400,
              error: 'Bad Request',
              message: 'Only SCRUM projects can assign stories to a sprint',
            });
          }
          // Verify sprint belongs to same project
          const sprintCheck = await pool.query(
            'SELECT id, project_id FROM sprints WHERE id = $1',
            [sprintId],
          );
          if (sprintCheck.rows.length === 0) {
            return reply.status(404).send({
              timestamp: new Date().toISOString(),
              status: 404,
              error: 'Not Found',
              message: 'Sprint not found',
            });
          }
          if (sprintCheck.rows[0].project_id !== story.project_id) {
            return reply.status(400).send({
              timestamp: new Date().toISOString(),
              status: 400,
              error: 'Bad Request',
              message: 'Story and sprint must belong to the same project',
            });
          }
          newSprintId = sprintId;
        }
      }

      const newTitle = title && title.trim() ? title : story.title;
      const newDescription = description !== undefined ? description : story.description;
      const newAcceptanceCriteria =
        acceptanceCriteria !== undefined ? acceptanceCriteria : story.acceptance_criteria;
      const newStoryPoints = storyPoints !== undefined ? storyPoints : story.story_points;
      const newPriority = priority ?? story.priority;
      const newStatus = status ?? story.status;

      const result = await pool.query(
        `UPDATE user_stories
         SET title = $1, description = $2, acceptance_criteria = $3,
             story_points = $4, priority = $5, status = $6, sprint_id = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id, title, description, acceptance_criteria, story_points, priority, status, sprint_id, project_id`,
        [
          newTitle,
          newDescription,
          newAcceptanceCriteria,
          newStoryPoints,
          newPriority,
          newStatus,
          newSprintId,
          id,
        ],
      );

      return reply.send(toUserStoryDTO(result.rows[0]));
    },
  );

  /**
   * POST /api/stories/:id/move-to-sprint
   */
  fastify.post(
    '/api/stories/:id/move-to-sprint',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const parsed = moveToSprintSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { sprintId } = parsed.data;

      const story = await findStoryForUser(id, userId, reply);
      if (!story) return;

      if (story.project_format !== 'SCRUM') {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Only SCRUM projects can move stories to a sprint',
        });
      }

      // Verify sprint belongs to user and same project
      const sprintResult = await pool.query(
        `SELECT s.id, s.project_id, p.user_id
         FROM sprints s JOIN projects p ON s.project_id = p.id
         WHERE s.id = $1`,
        [sprintId],
      );
      if (sprintResult.rows.length === 0 || sprintResult.rows[0].user_id !== userId) {
        return reply.status(404).send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message: 'Sprint not found',
        });
      }
      if (sprintResult.rows[0].project_id !== story.project_id) {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Story and sprint must belong to the same project',
        });
      }

      const result = await pool.query(
        `UPDATE user_stories
         SET sprint_id = $1, status = 'TODO', updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, description, acceptance_criteria, story_points, priority, status, sprint_id, project_id`,
        [sprintId, id],
      );

      return reply.send(toUserStoryDTO(result.rows[0]));
    },
  );

  /**
   * DELETE /api/stories/:id
   */
  fastify.delete(
    '/api/stories/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const { id } = request.params as { id: string };

      const story = await findStoryForUser(id, userId, reply);
      if (!story) return;

      await pool.query('DELETE FROM user_stories WHERE id = $1', [id]);
      return reply.status(204).send();
    },
  );
}
