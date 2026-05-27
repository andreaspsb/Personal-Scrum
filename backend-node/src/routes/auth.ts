import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db'
import type { UserRow, AuthResponseDTO } from '../types'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

function generateToken(email: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  // 24-hour expiry — matches Spring's jwt.expiration=86400000ms
  return jwt.sign({ sub: email }, secret, { expiresIn: '24h', algorithm: 'HS256' })
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /auth/register
   * Body: { name, email, password }
   * Returns: AuthResponse { token, refreshToken: null, user }
   */
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { name, email, password } = parsed.data

    // Check for duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if ((existing.rowCount ?? 0) > 0) {
      return reply.status(400).send({ message: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'ROLE_USER', NOW(), NOW())
       RETURNING id, name, email, role`,
      [name, email, hashedPassword],
    )

    const user = result.rows[0]
    const token = generateToken(user.email)

    const response: AuthResponseDTO = {
      token,
      refreshToken: null,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
    return reply.status(200).send(response)
  })

  /**
   * POST /auth/login
   * Body: { email, password }
   * Returns: AuthResponse { token, refreshToken: null, user }
   */
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0].message })
    }
    const { email, password } = parsed.data

    const result = await pool.query<UserRow>(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email],
    )

    if ((result.rowCount ?? 0) === 0) {
      return reply.status(401).send({ message: 'Invalid email or password' })
    }

    const user = result.rows[0]
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return reply.status(401).send({ message: 'Invalid email or password' })
    }

    const token = generateToken(user.email)

    const response: AuthResponseDTO = {
      token,
      refreshToken: null,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
    return reply.status(200).send(response)
  })
}
