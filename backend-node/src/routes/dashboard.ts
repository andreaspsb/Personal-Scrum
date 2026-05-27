import { FastifyInstance, FastifyRequest } from 'fastify'
import pool from '../db'
import { authenticate } from '../middleware/auth'
import type {
  AuthenticatedUser,
  ProjectRow,
  SprintRow,
  UserStoryRow,
  ImpedimentRow,
  ProjectDTO,
  SprintDTO,
  ScrumInsightDTO,
  DashboardDTO,
} from '../types'

type AuthRequest = FastifyRequest & { user: AuthenticatedUser }

function projectToDTO(row: ProjectRow): ProjectDTO {
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

async function buildSprintDTO(sprint: SprintRow): Promise<SprintDTO> {
  const storiesResult = await pool.query<{ status: string }>(
    'SELECT status FROM user_stories WHERE sprint_id = $1',
    [sprint.id],
  )
  const stories = storiesResult.rows
  const completedCount = stories.filter((s) => s.status === 'DONE').length

  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal,
    startDate: sprint.start_date,
    endDate: sprint.end_date,
    status: sprint.status,
    projectId: sprint.project_id,
    velocity: sprint.velocity,
    storyCount: stories.length,
    completedStoryCount: completedCount,
  }
}

/**
 * Generates proactive Scrum insights for the user's active sprints and projects.
 * Mirrors the logic in ScrumMasterUseCase.generateInsights().
 */
async function generateInsights(
  userId: number,
  projects: ProjectRow[],
  activeSprints: SprintRow[],
): Promise<ScrumInsightDTO[]> {
  const insights: ScrumInsightDTO[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Per-sprint insights ──────────────────────────────────────────────────────
  for (const sprint of activeSprints) {
    // Skip KANBAN sprints (they shouldn't exist, but be safe)
    const projectResult = await pool.query<{ format: string }>(
      'SELECT format FROM projects WHERE id = $1',
      [sprint.project_id],
    )
    if (projectResult.rows[0]?.format !== 'SCRUM') continue

    const storiesResult = await pool.query<UserStoryRow>(
      'SELECT * FROM user_stories WHERE sprint_id = $1',
      [sprint.id],
    )
    const stories = storiesResult.rows
    const totalStories = stories.length
    const completedStories = stories.filter((s) => s.status === 'DONE').length
    const completionPct = totalStories > 0 ? (completedStories / totalStories) * 100 : 0

    // Sprint ending soon / overdue
    if (sprint.end_date) {
      const endDate = new Date(sprint.end_date)
      endDate.setHours(0, 0, 0, 0)
      const msPerDay = 86_400_000
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / msPerDay)

      if (daysLeft >= 0 && daysLeft <= 5) {
        let severity: ScrumInsightDTO['severity']
        if (daysLeft <= 1 && completionPct < 80) {
          severity = 'CRITICAL'
        } else if (daysLeft <= 3 && completionPct < 50) {
          severity = 'WARNING'
        } else if (daysLeft <= 2) {
          severity = 'WARNING'
        } else {
          severity = 'INFO'
        }
        insights.push({
          type: 'SPRINT_ENDING_SOON',
          message: `Sprint '${sprint.name}' is ending in ${daysLeft} day(s) with ${Math.round(completionPct)}% completion`,
          severity,
          sprintId: sprint.id,
          projectId: sprint.project_id,
        })
      } else if (daysLeft < 0) {
        insights.push({
          type: 'SPRINT_OVERDUE',
          message: `Sprint '${sprint.name}' is overdue by ${Math.abs(daysLeft)} day(s) with ${Math.round(completionPct)}% completion`,
          severity: 'CRITICAL',
          sprintId: sprint.id,
          projectId: sprint.project_id,
        })
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
      })
    }

    // Unresolved impediments
    const impedimentsResult = await pool.query<ImpedimentRow>(
      'SELECT id FROM impediments WHERE sprint_id = $1 AND resolved = FALSE',
      [sprint.id],
    )
    if ((impedimentsResult.rowCount ?? 0) > 0) {
      insights.push({
        type: 'UNRESOLVED_IMPEDIMENTS',
        message: `Sprint '${sprint.name}' has ${impedimentsResult.rowCount} unresolved impediment(s). Address them to keep the team unblocked.`,
        severity: 'WARNING',
        sprintId: sprint.id,
        projectId: sprint.project_id,
      })
    }

    // Stories stuck in progress (updated_at >= 3 days ago)
    for (const story of stories) {
      if (story.status === 'IN_PROGRESS' && story.updated_at) {
        const updatedAt = new Date(story.updated_at)
        updatedAt.setHours(0, 0, 0, 0)
        const msPerDay = 86_400_000
        const daysInProgress = Math.round((today.getTime() - updatedAt.getTime()) / msPerDay)
        if (daysInProgress >= 3) {
          insights.push({
            type: 'STORY_STUCK_IN_PROGRESS',
            message: `Story '${story.title}' has been IN PROGRESS for ${daysInProgress} days. Consider reviewing or splitting it.`,
            severity: 'WARNING',
            sprintId: sprint.id,
            projectId: sprint.project_id,
          })
        }
      }
    }
  }

  // ── Per-project insights (SCRUM only) ────────────────────────────────────────
  const scrumProjects = projects.filter((p) => p.format === 'SCRUM' && p.status === 'ACTIVE')

  for (const project of scrumProjects) {
    // No active sprint
    const activeSprintResult = await pool.query(
      `SELECT id FROM sprints WHERE project_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [project.id],
    )
    if ((activeSprintResult.rowCount ?? 0) === 0) {
      insights.push({
        type: 'NO_ACTIVE_SPRINT',
        message: `Project '${project.name}' has no active sprint. Consider planning and starting a sprint.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      })
    }

    // Stories without story points
    const noPointsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM user_stories WHERE project_id = $1 AND story_points IS NULL`,
      [project.id],
    )
    const storiesWithoutPoints = parseInt(noPointsResult.rows[0].count, 10)
    if (storiesWithoutPoints > 0) {
      insights.push({
        type: 'STORIES_WITHOUT_POINTS',
        message: `Project '${project.name}' has ${storiesWithoutPoints} story/stories without story points. Estimate them to improve sprint planning.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      })
    }

    // Large backlog
    const backlogResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM user_stories WHERE project_id = $1 AND sprint_id IS NULL`,
      [project.id],
    )
    const backlogSize = parseInt(backlogResult.rows[0].count, 10)
    if (backlogSize > 20) {
      insights.push({
        type: 'LARGE_BACKLOG',
        message: `Project '${project.name}' has ${backlogSize} items in the backlog. Consider grooming and prioritizing.`,
        severity: 'INFO',
        sprintId: null,
        projectId: project.id,
      })
    }
  }

  return insights
}

export default async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /dashboard
   */
  app.get('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest

    const [projectsResult, activeSprintsResult] = await Promise.all([
      pool.query<ProjectRow>(
        'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
        [user.id],
      ),
      pool.query<SprintRow>(
        `SELECT s.* FROM sprints s
         JOIN projects p ON p.id = s.project_id
         WHERE p.user_id = $1 AND s.status = 'ACTIVE'
         ORDER BY s.created_at ASC`,
        [user.id],
      ),
    ])

    const allProjects = projectsResult.rows
    const activeSprints = activeSprintsResult.rows

    const activeProjectDTOs = allProjects
      .filter((p) => p.status === 'ACTIVE')
      .map(projectToDTO)

    const activeSprintDTOs = await Promise.all(activeSprints.map(buildSprintDTO))

    const insights = await generateInsights(user.id, allProjects, activeSprints)

    // Total sprints across all projects
    const totalSprintsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sprints s
       JOIN projects p ON p.id = s.project_id
       WHERE p.user_id = $1`,
      [user.id],
    )
    const totalSprints = parseInt(totalSprintsResult.rows[0].count, 10)

    // Completed stories across all projects
    const completedStoriesResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM user_stories us
       JOIN projects p ON p.id = us.project_id
       WHERE p.user_id = $1 AND us.status = 'DONE'`,
      [user.id],
    )
    const completedStories = parseInt(completedStoriesResult.rows[0].count, 10)

    const dashboard: DashboardDTO = {
      activeProjects: activeProjectDTOs,
      activeSprints: activeSprintDTOs,
      insights,
      totalProjects: allProjects.length,
      totalSprints,
      completedStories,
    }

    return reply.send(dashboard)
  })

  /**
   * GET /dashboard/insights
   */
  app.get('/dashboard/insights', { preHandler: authenticate }, async (request, reply) => {
    const { user } = request as AuthRequest

    const [projectsResult, activeSprintsResult] = await Promise.all([
      pool.query<ProjectRow>(
        'SELECT * FROM projects WHERE user_id = $1',
        [user.id],
      ),
      pool.query<SprintRow>(
        `SELECT s.* FROM sprints s
         JOIN projects p ON p.id = s.project_id
         WHERE p.user_id = $1 AND s.status = 'ACTIVE'`,
        [user.id],
      ),
    ])

    const insights = await generateInsights(
      user.id,
      projectsResult.rows,
      activeSprintsResult.rows,
    )

    return reply.send(insights)
  })
}
