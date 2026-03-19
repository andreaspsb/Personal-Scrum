import { AlertTriangle, Info, AlertOctagon } from 'lucide-react'
import type { ScrumInsight } from '../types'

interface InsightCardProps {
  insight: ScrumInsight
}

export default function InsightCard({ insight }: InsightCardProps) {
  const severityClass =
    insight.severity === 'CRITICAL'
      ? 'insight-critical'
      : insight.severity === 'WARNING'
        ? 'insight-warning'
        : 'insight-info'

  const Icon =
    insight.severity === 'CRITICAL'
      ? AlertOctagon
      : insight.severity === 'WARNING'
        ? AlertTriangle
        : Info

  const iconColor =
    insight.severity === 'CRITICAL'
      ? 'var(--danger)'
      : insight.severity === 'WARNING'
        ? 'var(--warning)'
        : 'var(--info)'

  return (
    <div className={`card ${severityClass}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '0.1rem' }} />
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: iconColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
          {insight.type.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{insight.message}</div>
      </div>
    </div>
  )
}
