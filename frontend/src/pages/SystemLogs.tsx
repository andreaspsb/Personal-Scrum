import { useQuery } from '@tanstack/react-query'
import { getSystemLogs } from '../lib/api'
import { RefreshCw } from 'lucide-react'
import { useRef, useEffect } from 'react'

export default function SystemLogs() {
  const scrollRef = useRef<HTMLPreElement>(null)

  const { data: logs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['system-logs'],
    queryFn: () => getSystemLogs().then((res) => res.data),
    retry: false
  })

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
          Logs do Sistema
        </h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            opacity: isFetching ? 0.7 : 1
          }}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Atualizando...' : 'Atualizar Logs'}
        </button>
      </div>

      <div style={{ flex: 1, background: '#1e1e1e', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem 1rem', background: '#2d2d2d', color: '#cecece', fontSize: '0.875rem', borderBottom: '1px solid #404040' }}>
          /api/actuator/logfile
        </div>
        
        {isLoading ? (
          <div style={{ padding: '2rem', color: '#cecece' }}>Carregando logs...</div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#ef4444' }}>
            Erro ao carregar logs. Certifique-se de que o backend está gerando o arquivo de log e você tem permissão.
          </div>
        ) : (
          <pre
            ref={scrollRef}
            style={{
              padding: '1rem',
              color: '#d4d4d4',
              margin: 0,
              fontSize: '0.875rem',
              lineHeight: 1.5,
              overflowY: 'auto',
              flex: 1,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {logs || 'Nenhum log encontrado.'}
          </pre>
        )}
      </div>
    </div>
  )
}
