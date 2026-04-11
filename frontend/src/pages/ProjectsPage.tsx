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
  name: z.string().min(1, 'O nome é obrigatório'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  type: z.enum(['PERSONAL', 'PROFESSIONAL']),
  format: z.enum(['SCRUM', 'KANBAN']),
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
    defaultValues: { type: 'PERSONAL', format: 'SCRUM' },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  const filtered = filter === 'ALL' ? projects : projects.filter((p) => p.type === filter)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projetos</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Projeto
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
          Carregando projetos...
        </div>
      )}
      {isError && <div className="error-msg">Falha ao carregar projetos.</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state">Nenhum projeto encontrado. Crie seu primeiro projeto!</div>
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
              <label htmlFor="proj-name">Nome</label>
              <input id="proj-name" type="text" placeholder="Meu Projeto" {...register('name')} />
              {errors.name && <span className="form-error">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proj-desc">Descrição</label>
              <textarea id="proj-desc" placeholder="Sobre o que é este projeto?" {...register('description')} />
              {errors.description && <span className="form-error">{errors.description.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proj-type">Tipo</label>
              <select id="proj-type" {...register('type')}>
                <option value="PERSONAL">Pessoal</option>
                <option value="PROFESSIONAL">Profissional</option>
              </select>
              {errors.type && <span className="form-error">{errors.type.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="proj-format">Formato</label>
              <select id="proj-format" {...register('format')}>
                <option value="SCRUM">Scrum (com Sprints)</option>
                <option value="KANBAN">Kanban (simples)</option>
              </select>
              {errors.format && <span className="form-error">{errors.format.message}</span>}
            </div>

            {mutation.isError && <div className="error-msg">Falha ao criar projeto.</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); reset() }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Criando...' : 'Criar Projeto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
