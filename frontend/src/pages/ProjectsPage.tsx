import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { getProjects, createProject } from '../lib/api'
import type { ProjectType } from '../types'
import ProjectCard from '../components/ProjectCard'
import Modal from '../components/Modal'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['PERSONAL', 'PROFESSIONAL']),
})

type FormData = z.infer<typeof schema>

type FilterTab = 'ALL' | ProjectType

export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterTab>('ALL')
  const [showModal, setShowModal] = useState(false)

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
      reset()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PERSONAL' },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  const filtered = filter === 'ALL' ? projects : projects.filter((p) => p.type === filter)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {(['ALL', 'PERSONAL', 'PROFESSIONAL'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner" />
          Loading projects…
        </div>
      )}
      {isError && <div className="error-msg">Failed to load projects.</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state">No projects found. Create your first project!</div>
      )}

      <div className="grid-2">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => navigate(`/projects/${project.id}`)}
          />
        ))}
      </div>

      {showModal && (
        <Modal title="New Project" onClose={() => { setShowModal(false); reset() }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label htmlFor="proj-name">Name</label>
              <input id="proj-name" type="text" placeholder="My Project" {...register('name')} />
              {errors.name && <span className="form-error">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proj-desc">Description</label>
              <textarea id="proj-desc" placeholder="What is this project about?" {...register('description')} />
              {errors.description && <span className="form-error">{errors.description.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proj-type">Type</label>
              <select id="proj-type" {...register('type')}>
                <option value="PERSONAL">Personal</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>
              {errors.type && <span className="form-error">{errors.type.message}</span>}
            </div>

            {mutation.isError && <div className="error-msg">Failed to create project.</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); reset() }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
