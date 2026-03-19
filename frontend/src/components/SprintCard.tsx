import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Calendar, Target } from 'lucide-react'
import type { Sprint } from '../types'

interface SprintCardProps {
  sprint: Sprint
}

export default function SprintCard({ sprint }: SprintCardProps) {
  const navigate = useNavigate()
  const total = sprint.storyCount || 0
  const done = sprint.completedStoryCount || 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const daysLeft = differenceInDays(parseISO(sprint.endDate), new Date())
  const statusKey = sprint.status.toLowerCase()

  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/sprints/${sprint.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sprint.name}</span>
        <span className={`badge badge-${statusKey}`}>{sprint.status}</span>
      </div>

      {sprint.goal && (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <Target size={13} style={{ color: 'var(--text-muted)', marginTop: '0.15rem', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {sprint.goal}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <Calendar size={12} />
        {format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
        {sprint.status === 'ACTIVE' && (
          <span style={{ marginLeft: 'auto', color: daysLeft < 3 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
          </span>
        )}
      </div>

      <div className="progress-bar" style={{ marginBottom: '0.35rem' }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {done}/{total} stories ({pct}%)
      </div>
    </div>
  )
}
