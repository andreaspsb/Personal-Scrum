import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, updateUserRole, deleteUser } from '../lib/api'
import { Trash2 } from 'lucide-react'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [errorObj, setErrorObj] = useState<string | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then((res) => res.data),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      setErrorObj('Erro ao atualizar a permissão do usuário.')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      setErrorObj('Erro ao deletar usuário.')
    },
  })

  const handleRoleChange = (id: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    updateRoleMutation.mutate({ id, role: e.target.value })
  }

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      deleteUserMutation.mutate(id)
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.75rem', fontWeight: 'bold' }}>
        Gerenciar Usuários
      </h1>

      {errorObj && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', marginBottom: '1rem', borderRadius: '4px' }}>
          {errorObj}
        </div>
      )}

      {isLoading ? (
        <p>Carregando usuários...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>E-mail</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Permissão</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{u.id}</td>
                  <td style={{ padding: '1rem' }}>{u.name}</td>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      value={u.role || 'ROLE_USER'}
                      onChange={(e) => handleRoleChange(u.id, e)}
                      disabled={updateRoleMutation.isPending}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)'
                      }}
                    >
                      <option value="ROLE_USER">Usuário (USER)</option>
                      <option value="ROLE_ADMIN">Administrador (ADMIN)</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deleteUserMutation.isPending}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger, #ef4444)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius)'
                      }}
                      title="Excluir Usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
