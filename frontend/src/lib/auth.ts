import type { User } from '../types'

const TOKEN_KEY = 'jwt_token'
const USER_KEY = 'user'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
export const getUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}
export const setUser = (user: User): void => localStorage.setItem(USER_KEY, JSON.stringify(user))
export const isAuthenticated = (): boolean => !!getToken()
