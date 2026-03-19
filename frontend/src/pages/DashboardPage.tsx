import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../lib/api'
import { getUser } from '../lib/auth'
import InsightCard from '../components/InsightCard'
import SprintCard from '../components/SprintCard'

export default function DashboardPage() {
  const user = getUser()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard().then((r) => r.data),
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
          Welcome back{user ? `, ${user.name}` : ''}! 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Here's an overview of your personal scrum board.
        </p>
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner" />
          Loading dashboard…
        </div>
      )}

      {isError && (
        <div className="error-msg">Failed to load dashboard. Please try again.</div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid-stats">
            <div className="stat-card">
              <div className="stat-value">{data.totalProjects}</div>
              <div className="stat-label">Total Projects</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.totalSprints}</div>
              <div className="stat-label">Active Sprints</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.completedStories}</div>
              <div className="stat-label">Completed Stories</div>
            </div>
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <p className="section-title">🔍 Proactive Insights</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))}
              </div>
            </section>
          )}

          {/* Active Sprints */}
          <section>
            <p className="section-title">⚡ Active Sprints</p>
            {data.activeSprints.length === 0 ? (
              <div className="empty-state">No active sprints. Start a sprint in your projects!</div>
            ) : (
              <div className="grid-2">
                {data.activeSprints.map((sprint) => (
                  <SprintCard key={sprint.id} sprint={sprint} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
