import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Plus, Play, CheckCircle } from 'lucide-react'
import {
  getSprintStories,
  getImpediments,
  startSprint,
  completeSprint,
  updateStory,
  createImpediment,
  resolveImpediment,
} from '../lib/api'
import type { UserStory, StoryStatus, Impediment } from '../types'
import Modal from '../components/Modal'

const COLUMNS: { status: StoryStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'IN_REVIEW', label: 'In Review' },
  { status: 'DONE', label: 'Done' },
]

const impedimentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
})
type ImpedimentForm = z.infer<typeof impedimentSchema>

const statusSchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
})
type StatusForm = z.infer<typeof statusSchema>

export default function SprintBoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sprintId = parseInt(id ?? '0', 10)
  const queryClient = useQueryClient()

  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null)
  const [showImpedimentModal, setShowImpedimentModal] = useState(false)

  /* ── Data queries ── */
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['sprint-stories', sprintId],
    queryFn: () => getSprintStories(sprintId).then((r) => r.data),
    enabled: !!sprintId,
  })

  const { data: impediments = [], isLoading: impLoading } = useQuery({
    queryKey: ['impediments', sprintId],
    queryFn: () => getImpediments(sprintId).then((r) => r.data),
    enabled: !!sprintId,
  })

  // Try to get sprint info from the react-query cache (populated by ProjectDetailPage)
  type SprintCacheEntry = { data: { id: number; name: string; goal: string; startDate: string; endDate: string; status: string; projectId: number; velocity: number | null; storyCount: number; completedStoryCount: number }[] }
  const cachedSprints = queryClient.getQueriesData<SprintCacheEntry>({ queryKey: ['sprints'] })
  let sprintInfo: { id: number; name: string; goal: string; startDate: string; endDate: string; status: string; projectId: number } | null = null
  for (const [, cacheData] of cachedSprints) {
    if (cacheData?.data) {
      const found = cacheData.data.find((s) => s.id === sprintId)
      if (found) { sprintInfo = found; break }
    }
  }

  /* ── Mutations ── */
  const startMutation = useMutation({
    mutationFn: () => startSprint(sprintId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories', sprintId] })
      void queryClient.invalidateQueries({ queryKey: ['sprints'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => completeSprint(sprintId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories', sprintId] })
      void queryClient.invalidateQueries({ queryKey: ['sprints'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ storyId, status }: { storyId: number; status: string }) =>
      updateStory(storyId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprint-stories', sprintId] })
      setSelectedStory(null)
    },
  })

  const impedimentMutation = useMutation({
    mutationFn: (data: ImpedimentForm) => createImpediment({ ...data, sprintId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['impediments', sprintId] })
      setShowImpedimentModal(false)
      impReset()
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (impId: number) => resolveImpediment(impId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['impediments', sprintId] })
    },
  })

  /* ── Forms ── */
  const {
    register: impReg,
    handleSubmit: impSubmit,
    reset: impReset,
    formState: { errors: impErrors },
  } = useForm<ImpedimentForm>({ resolver: zodResolver(impedimentSchema) })

  const {
    register: statusReg,
    handleSubmit: statusSubmit,
    formState: { errors: statusErrors },
  } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    values: selectedStory ? { status: selectedStory.status } : undefined,
  })

  const storiesByStatus = (status: StoryStatus) => stories.filter((s) => s.status === status)

  const isLoading = storiesLoading || impLoading

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="page-title">
              {sprintInfo ? sprintInfo.name : `Sprint #${sprintId}`}
            </h1>
            {sprintInfo?.goal && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Goal: {sprintInfo.goal}
              </p>
            )}
            {sprintInfo && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {format(parseISO(sprintInfo.startDate), 'MMM d')} –{' '}
                {format(parseISO(sprintInfo.endDate), 'MMM d, yyyy')}
                {' · '}
                <span className={`badge badge-${sprintInfo.status.toLowerCase()}`}>
                  {sprintInfo.status}
                </span>
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {sprintInfo?.status === 'PLANNED' && (
            <button
              className="btn-primary"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <Play size={14} />
              {startMutation.isPending ? 'Starting…' : 'Start Sprint'}
            </button>
          )}
          {sprintInfo?.status === 'ACTIVE' && (
            <button
              className="btn-secondary"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              <CheckCircle size={14} />
              {completeMutation.isPending ? 'Completing…' : 'Complete Sprint'}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading"><div className="spinner" />Loading sprint board…</div>
      )}

      {!isLoading && (
        <>
          {/* Kanban board */}
          <div className="kanban-board">
            {COLUMNS.map(({ status, label }) => {
              const colStories = storiesByStatus(status)
              return (
                <div key={status} className="kanban-column">
                  <div className="kanban-col-header">
                    <span className="kanban-col-title">{label}</span>
                    <span className="kanban-count">{colStories.length}</span>
                  </div>
                  {colStories.length === 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                      Empty
                    </div>
                  )}
                  {colStories.map((story) => (
                    <div
                      key={story.id}
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '0.65rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedStory(story)}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                        {story.title}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${story.priority.toLowerCase()}`}>
                          {story.priority}
                        </span>
                        {story.storyPoints != null && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {story.storyPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Impediments */}
          <section style={{ marginTop: '2rem' }}>
            <div className="page-header">
              <p className="section-title">🚧 Impediments</p>
              <button className="btn-ghost" onClick={() => setShowImpedimentModal(true)}>
                <Plus size={14} /> Add Impediment
              </button>
            </div>

            {impLoading && <div className="loading"><div className="spinner" /></div>}

            {!impLoading && impediments.length === 0 && (
              <div className="empty-state">No impediments. Great work!</div>
            )}

            {impediments.map((imp: Impediment) => (
              <div
                key={imp.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                  opacity: imp.resolved ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>
                    {imp.resolved && '✅ '}{imp.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{imp.description}</div>
                </div>
                {!imp.resolved && (
                  <button
                    className="btn-ghost"
                    onClick={() => resolveMutation.mutate(imp.id)}
                    disabled={resolveMutation.isPending}
                    style={{ flexShrink: 0 }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      {/* Story status modal */}
      {selectedStory && (
        <Modal title="Update Story Status" onClose={() => setSelectedStory(null)}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{selectedStory.title}</div>
            {selectedStory.description && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedStory.description}</p>
            )}
          </div>
          <form
            onSubmit={statusSubmit((d) =>
              updateStatusMutation.mutate({ storyId: selectedStory.id, status: d.status }),
            )}
          >
            <div className="form-group">
              <label htmlFor="story-status">Status</label>
              <select id="story-status" {...statusReg('status')}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
              {statusErrors.status && (
                <span className="form-error">{statusErrors.status.message}</span>
              )}
            </div>
            {updateStatusMutation.isError && (
              <div className="error-msg">Failed to update story status.</div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setSelectedStory(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Saving…' : 'Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Impediment modal */}
      {showImpedimentModal && (
        <Modal title="Add Impediment" onClose={() => { setShowImpedimentModal(false); impReset() }}>
          <form onSubmit={impSubmit((d) => impedimentMutation.mutate(d))}>
            <div className="form-group">
              <label htmlFor="imp-title">Title</label>
              <input id="imp-title" type="text" placeholder="Impediment title" {...impReg('title')} />
              {impErrors.title && <span className="form-error">{impErrors.title.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="imp-desc">Description</label>
              <textarea id="imp-desc" placeholder="Describe the impediment…" {...impReg('description')} />
              {impErrors.description && <span className="form-error">{impErrors.description.message}</span>}
            </div>
            {impedimentMutation.isError && <div className="error-msg">Failed to add impediment.</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowImpedimentModal(false); impReset() }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={impedimentMutation.isPending}>
                {impedimentMutation.isPending ? 'Adding…' : 'Add Impediment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
