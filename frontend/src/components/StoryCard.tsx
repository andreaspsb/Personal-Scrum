import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { UserStory } from '../types'

interface StoryCardProps {
  story: UserStory
  onClick?: () => void
}

export default function StoryCard({ story, onClick }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const priorityKey = story.priority.toLowerCase()
  const statusKey = story.status.toLowerCase()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      setExpanded((prev) => !prev)
    }
  }

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', marginBottom: '0.5rem', padding: '0.85rem' }}
      onClick={handleClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>{story.title}</span>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
          {story.storyPoints != null && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              {story.storyPoints}
            </span>
          )}
          {!onClick && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
        <span className={`badge badge-${priorityKey}`}>{story.priority}</span>
        <span className={`badge badge-${statusKey}`}>{story.status.replace('_', ' ')}</span>
      </div>

      {expanded && !onClick && story.description && (
        <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {story.description}
          </p>
          {story.acceptanceCriteria && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Acceptance Criteria
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {story.acceptanceCriteria}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
