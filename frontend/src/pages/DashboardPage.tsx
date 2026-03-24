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
          Bem-vindo de volta{user ? `, ${user.name}` : ''}! 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Aqui está o resumo do seu quadro pessoal Scrum.
        </p>
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner" />
          Carregando painel...
        </div>
      )}

      {isError && (
        <div className="error-msg">Falha ao carregar painel. Tente novamente.</div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid-stats">
            <div className="stat-card">
              <div className="stat-value">{data.totalProjects}</div>
              <div className="stat-label">Total de Projetos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.totalSprints}</div>
              <div className="stat-label">Sprints Ativas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.completedStories}</div>
              <div className="stat-label">User Stories Concluídas</div>
            </div>
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <p className="section-title">🔍 Insights Proativos</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))}
              </div>
            </section>
          )}

          {/* Active Sprints */}
          <section>
            <p className="section-title">⚡ Sprints Ativas</p>
            {data.activeSprints.length === 0 ? (
              <div className="empty-state">Nenhuma Sprint ativa. Inicie uma Sprint nos seus projetos!</div>
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
