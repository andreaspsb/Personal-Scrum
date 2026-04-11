import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowLeft, MoveRight } from 'lucide-react'
import {
  getSprints,
  createSprint,
  getBacklog,
  createStory,
  moveToSprint,
  getProject,
} from '../lib/api'
import type { Sprint, UserStory } from '../types'
import SprintCard from '../components/SprintCard'
import StoryCard from '../components/StoryCard'
import Modal from '../components/Modal'

/* ── Sprint form ── */
const sprintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  goal: z.string().min(1, 'Goal is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})
type SprintForm = z.infer<typeof sprintSchema>

/* ── Story form ── */
const storySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  storyPoints: z.coerce.number().int().min(0).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})
type StoryForm = z.infer<typeof storySchema>

type ActiveTab = 'sprints' | 'backlog' | 'board'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = parseInt(id ?? '0', 10)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<ActiveTab>('sprints')
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [moveStory, setMoveStory] = useState<UserStory | null>(null)
  const [targetSprintId, setTargetSprintId] = useState<string>('')

  /* ── Project (to get format) ── */
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId).then((r) => r.data),
    enabled: !!projectId,
  })

  const isKanban = project?.format === 'KANBAN'

  /* ── Data ── */
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => getSprints(projectId).then((r) => r.data),
    enabled: !!projectId,
  })

  const { data: backlog = [], isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => getBacklog(projectId).then((r) => r.data),
    enabled: !!projectId && (tab === 'backlog' || tab === 'board'),
  })

  /* ── Sprint mutation ── */
  const sprintMutation = useMutation({
    mutationFn: (data: SprintForm) => createSprint({ ...data, projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      setShowSprintModal(false)
      sprintReset()
    },
  })

  /* ── Story mutation ── */
  const storyMutation = useMutation({
    mutationFn: (data: StoryForm) =>
      createStory({ ...data, projectId, storyPoints: data.storyPoints ?? undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
      setShowStoryModal(false)
      storyReset()
    },
  })

  /* ── Move to sprint mutation ── */
  const moveMutation = useMutation({
    mutationFn: ({ storyId, sprintId }: { storyId: number; sprintId: number }) =>
      moveToSprint(storyId, sprintId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
      setMoveStory(null)
      setTargetSprintId('')
    },
  })

  /* ── Forms ── */
  const {
    register: sprintReg,
    handleSubmit: sprintSubmit,
    reset: sprintReset,
    formState: { errors: sprintErrors },
  } = useForm<SprintForm>({ resolver: zodResolver(sprintSchema) })

  const {
    register: storyReg,
    handleSubmit: storySubmit,
    reset: storyReset,
    formState: { errors: storyErrors },
  } = useForm<StoryForm>({
    resolver: zodResolver(storySchema),
    defaultValues: { priority: 'MEDIUM' },
  })

  const handleMove = () => {
    if (!moveStory || !targetSprintId) return
    moveMutation.mutate({ storyId: moveStory.id, sprintId: parseInt(targetSprintId, 10) })
  }

  const availableSprints: Sprint[] = sprints.filter(
    (s) => s.status === 'PLANNED' || s.status === 'ACTIVE',
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">Project Detail</h1>
        </div>
      </div>

      {/* Tabs - hide Sprints for KANBAN */}
      <div className="tabs">
        {!isKanban && (
          <button className={`tab ${tab === 'sprints' ? 'active' : ''}`} onClick={() => setTab('sprints')}>
            Sprints
          </button>
        )}
        {isKanban && (
          <button className={`tab ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>
            Board
          </button>
        )}
        <button className={`tab ${tab === 'backlog' ? 'active' : ''}`} onClick={() => setTab('backlog')}>
          Backlog
        </button>
      </div>

      {/* Sprints Tab - only for SCRUM projects */}
      {tab === 'sprints' && !isKanban && (
        <>
          <div className="page-header">
            <p className="section-title">Sprints</p>
            <button className="btn-primary" onClick={() => setShowSprintModal(true)}>
              <Plus size={16} /> New Sprint
            </button>
          </div>
          {sprintsLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : sprints.length === 0 ? (
            <div className="empty-state">No sprints yet. Create your first sprint!</div>
          ) : (
            <div className="grid-2">
              {sprints.map((s) => (
                <SprintCard key={s.id} sprint={s} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Backlog Tab */}
      {tab === 'backlog' && (
        <>
          <div className="page-header">
            <p className="section-title">Backlog</p>
            <button className="btn-primary" onClick={() => setShowStoryModal(true)}>
              <Plus size={16} /> New Story
            </button>
          </div>
          {backlogLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : backlog.length === 0 ? (
            <div className="empty-state">Backlog is empty. Add your first user story!</div>
          ) : (
            <div>
              {backlog.map((story) => (
                <div key={story.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <StoryCard story={story} />
                  </div>
                  {availableSprints.length > 0 && (
                    <button
                      className="btn-ghost"
                      style={{ marginTop: '0.85rem', flexShrink: 0 }}
                      onClick={() => { setMoveStory(story); setTargetSprintId('') }}
                      title="Move to sprint"
                    >
                      <MoveRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Kanban Board Tab - only for KANBAN projects */}
      {tab === 'board' && isKanban && (
        <>
          <div className="page-header">
            <p className="section-title">Board</p>
            <button className="btn-primary" onClick={() => setShowStoryModal(true)}>
              <Plus size={16} /> New Task
            </button>
          </div>
          {backlogLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : backlog.length === 0 ? (
            <div className="empty-state">No tasks yet. Create your first task!</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((column) => (
                <div key={column} style={{ background: 'var(--card)', padding: '1rem', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {column === 'TODO' ? 'To Do' : column === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {backlog.filter((s) => s.status === column).map((story) => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sprint Modal */}
      {showSprintModal && (
        <Modal title="New Sprint" onClose={() => { setShowSprintModal(false); sprintReset() }}>
          <form onSubmit={sprintSubmit((d) => sprintMutation.mutate(d))}>
            <div className="form-group">
              <label htmlFor="s-name">Sprint Name</label>
              <input id="s-name" type="text" placeholder="Sprint 1" {...sprintReg('name')} />
              {sprintErrors.name && <span className="form-error">{sprintErrors.name.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="s-goal">Goal</label>
              <textarea id="s-goal" placeholder="Sprint goal…" {...sprintReg('goal')} />
              {sprintErrors.goal && <span className="form-error">{sprintErrors.goal.message}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="s-start">Start Date</label>
                <input id="s-start" type="date" {...sprintReg('startDate')} />
                {sprintErrors.startDate && <span className="form-error">{sprintErrors.startDate.message}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="s-end">End Date</label>
                <input id="s-end" type="date" {...sprintReg('endDate')} />
                {sprintErrors.endDate && <span className="form-error">{sprintErrors.endDate.message}</span>}
              </div>
            </div>
            {sprintMutation.isError && <div className="error-msg">Failed to create sprint.</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowSprintModal(false); sprintReset() }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={sprintMutation.isPending}>
                {sprintMutation.isPending ? 'Creating…' : 'Create Sprint'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Story Modal */}
      {showStoryModal && (
        <Modal title="New User Story" onClose={() => { setShowStoryModal(false); storyReset() }}>
          <form onSubmit={storySubmit((d) => storyMutation.mutate(d))}>
            <div className="form-group">
              <label htmlFor="st-title">Title</label>
              <input id="st-title" type="text" placeholder="As a user, I want to…" {...storyReg('title')} />
              {storyErrors.title && <span className="form-error">{storyErrors.title.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="st-desc">Description</label>
              <textarea id="st-desc" placeholder="Story description…" {...storyReg('description')} />
              {storyErrors.description && <span className="form-error">{storyErrors.description.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="st-ac">Acceptance Criteria</label>
              <textarea id="st-ac" placeholder="Given… When… Then…" {...storyReg('acceptanceCriteria')} />
              {storyErrors.acceptanceCriteria && <span className="form-error">{storyErrors.acceptanceCriteria.message}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="st-pts">Story Points</label>
                <input id="st-pts" type="number" min={0} placeholder="0" {...storyReg('storyPoints')} />
              </div>
              <div className="form-group">
                <label htmlFor="st-priority">Priority</label>
                <select id="st-priority" {...storyReg('priority')}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            {storyMutation.isError && <div className="error-msg">Failed to create story.</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowStoryModal(false); storyReset() }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={storyMutation.isPending}>
                {storyMutation.isPending ? 'Creating…' : 'Create Story'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Move to Sprint Modal */}
      {moveStory && (
        <Modal title="Move to Sprint" onClose={() => setMoveStory(null)}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Move "<strong style={{ color: 'var(--text)' }}>{moveStory.title}</strong>" to a sprint:
          </p>
          <div className="form-group">
            <label htmlFor="move-sprint">Select Sprint</label>
            <select
              id="move-sprint"
              value={targetSprintId}
              onChange={(e) => setTargetSprintId(e.target.value)}
            >
              <option value="">-- Choose sprint --</option>
              {availableSprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {moveMutation.isError && <div className="error-msg">Failed to move story.</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setMoveStory(null)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleMove}
              disabled={!targetSprintId || moveMutation.isPending}
            >
              {moveMutation.isPending ? 'Moving…' : 'Move Story'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
