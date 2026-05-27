import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { ProjectDTO, SprintDTO, ScrumInsightDTO, DashboardDTO } from '../types';

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

async function generateInsights(userId: number): Promise<ScrumInsightDTO[]> {
  const insights: ScrumInsightDTO[] = [];

  // Fetch all active sprints for user (SCRUM projects only)
  const activeSprintsResult = await pool.query(
    `SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.status, s.project_id
     FROM sprints s
     JOIN projects p ON s.project_id = p.id
     WHERE p.user_id = $1 AND s.status = 'ACTIVE' AND p.format = 'SCRUM'`,
    [userId],
  );

  for (const sprint of activeSprintsResult.rows) {
    const storiesResult = await pool.query<{ status: string; story_points: number | null; updated_at: Date; title: string }>(
      'SELECT status, story_points, updated_at, title FROM user_stories WHERE sprint_id = $1',
      [sprint.id],
    );
    const stories = storiesResult.rows;
    const totalStories = stories.length;
    const completedStories = stories.filter((s) => s.status === 'DONE').length;
    const completionPct = totalStories > 0 ? (completedStories / totalStories) * 100 : 0;

    // Sprint ending soon / overdue
    if (sprint.end_date) {
      const endDate = new Date(sprint.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        insights.push({
          type: 'SPRINT_OVERDUE',
          message: `Sprint '${sprint.name}' is overdue by ${Math.abs(daysLeft)} day(s) with ${Math.round(completionPct)}% completion`,
          severity: 'CRITICAL',
          sprintId: sprint.id,
          projectId: sprint.project_id,
        });
      } else if (daysLeft <= 5) {
        let severity: string;
        if (daysLeft <= 1 && completionPct < 80) {
          severity = 'CRITICAL';
        } else if (daysLeft <= 3 && completionPct < 50) {
          severity = 'WARNING';
        } else if (daysLeft <= 2) {
          severity = 'WARNING';
        } else {
          severity = 'INFO';
        }
        insights.push({
          type: 'SPRINT_ENDING_SOON',
          message: `Sprint '${sprint.name}' is ending in ${daysLeft} day(s) with ${Math.round(completionPct)}% completion`,
          severity,
          sprintId: sprint.id,
          projectId: sprint.project_id,
        });
      }
    }

    // No sprint goal
    if (!sprint.goal || sprint.goal.trim() === '') {
      insights.push({
        type: 'NO_SPRINT_GOAL',
        message: `Sprint '${sprint.name}' has no goal defined. A clear goal helps the team stay focused.`,
        severity: 'WARNING',
        sprintId: sprint.id,
        projectId: sprint.project_id,
      });
    }

    // Unresolved impediments
    const impedimentsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM impediments WHERE sprint_id = $1 AND resolved = FALSE`,
      [sprint.id],
    );
    const unresolvedCount = parseInt(impedimentsResult.rows[0].count, 10);
    if (unresolvedCount > 0) {
      insights.push({
        type: 'UNRESOLVED_IMPEDIMENTS',
        message: `Sprint '${sprint.name}' has ${unresolvedCount} unresolved impediment(s). Address them to keep the team unblocked.`,
        severity: 'WARNING',
        sprintId: sprint.id,
        projectId: sprint.project_id,
      });
    }

    // Stories stuck in progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const story of stories.filter((s) => s.status === 'IN_PROGRESS')) {
      if (story.updated_at) {
        const updatedAt = new Date(story.updated_at);
        updatedAt.setHours(0, 0, 0, 0);
        const daysInProgress = Math.round(
          (today.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysInProgress >= 3) {
          insights.push({
            type: 'STORY_STUCK_IN_PROGRESS',
            message: `Story '${story.title}' has been IN PROGRESS for ${daysInProgress} days. Consider reviewing or splitting it.`,
            severity: 'WARNING',
            sprintId: sprint.id,
            projectId: sprint.project_id,
          });
        }
      }
    }
  }

  // Per-project insights (SCRUM only, ACTIVE projects)
  const scrumProjectsResult = await pool.query(
    `SELECT id, name FROM projects WHERE user_id = $1 AND format = 'SCRUM' AND status = 'ACTIVE'`,
    [userId],
  );

  for (const project of scrumProjectsResult.rows) {
    // No active sprint
    const activeSprintCheck = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sprints WHERE project_id = $1 AND status = 'ACTIVE'`,
      [project.id],
    );
    if (parseInt(activeSprintCheck.rows[0].count, 10) === 0) {
      insights.push({
        type: 'NO_ACTIVE_SPRINT',
        message: `Project '${project.name}' has no active sprint. Consider planning and starting a sprint.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      });
    }

    // Stories without points
    const noPointsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM user_stories WHERE project_id = $1 AND story_points IS NULL`,
      [project.id],
    );
    const storiesWithoutPoints = parseInt(noPointsResult.rows[0].count, 10);
    if (storiesWithoutPoints > 0) {
      insights.push({
        type: 'STORIES_WITHOUT_POINTS',
        message: `Project '${project.name}' has ${storiesWithoutPoints} story/stories without story points. Estimate them to improve sprint planning.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      });
    }

    // Large backlog
    const backlogResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM user_stories WHERE project_id = $1 AND sprint_id IS NULL`,
      [project.id],
    );
    const backlogSize = parseInt(backlogResult.rows[0].count, 10);
    if (backlogSize > 20) {
      insights.push({
        type: 'LARGE_BACKLOG',
        message: `Project '${project.name}' has ${backlogSize} items in the backlog. Consider grooming and prioritizing.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      });
    }
  }

  return insights;
}

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/dashboard
   */
  fastify.get(
    '/api/dashboard',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;

      // All projects for user
      const allProjectsResult = await pool.query(
        `SELECT id, name, description, type, format, status, created_at
         FROM projects WHERE user_id = $1`,
        [userId],
      );
      const allProjects = allProjectsResult.rows;

      // Active projects
      const activeProjectDTOs = allProjects
        .filter((p) => p.status === 'ACTIVE')
        .map(toProjectDTO);

      // Active sprints
      const activeSprintsResult = await pool.query(
        `SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.status, s.project_id, s.velocity
         FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE p.user_id = $1 AND s.status = 'ACTIVE'`,
        [userId],
      );
      const activeSprintDTOs = await Promise.all(
        activeSprintsResult.rows.map(buildSprintDTO),
      );

      // Insights
      const insights = await generateInsights(userId);

      // Total sprints across all projects
      const totalSprintsResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE p.user_id = $1`,
        [userId],
      );
      const totalSprints = parseInt(totalSprintsResult.rows[0].count, 10);

      // Completed stories
      const completedStoriesResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM user_stories us
         JOIN projects p ON us.project_id = p.id
         WHERE p.user_id = $1 AND us.status = 'DONE'`,
        [userId],
      );
      const completedStories = parseInt(completedStoriesResult.rows[0].count, 10);

      const dashboard: DashboardDTO = {
        activeProjects: activeProjectDTOs,
        activeSprints: activeSprintDTOs,
        insights,
        totalProjects: allProjects.length,
        totalSprints,
        completedStories,
      };

      return reply.send(dashboard);
    },
  );

  /**
   * GET /api/dashboard/insights
   */
  fastify.get(
    '/api/dashboard/insights',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as AuthRequest).userId;
      const insights = await generateInsights(userId);
      return reply.send(insights);
    },
  );
}
