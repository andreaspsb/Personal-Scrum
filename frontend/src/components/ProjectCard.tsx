import type { Project } from '../types'

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const typeKey = project.type.toLowerCase()
  const statusKey = project.status.toLowerCase()

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{project.name}</span>
        <span className={`badge badge-${typeKey}`}>{project.type}</span>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
        {project.description.length > 100
          ? project.description.slice(0, 100) + '…'
          : project.description}
      </p>
      <span className={`badge badge-${statusKey}`}>{project.status}</span>
    </div>
  )
}
