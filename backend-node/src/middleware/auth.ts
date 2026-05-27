import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import pool from '../db'
import type { JwtPayload, AuthenticatedUser } from '../types'

/**
 * Fastify preHandler that validates the Bearer JWT and attaches the
 * authenticated user to `request.user`.
 *
 * The Spring backend signs tokens with the user's email as the `sub` claim
 * (UserDetails.getUsername() → email). We replicate that here so tokens
 * issued by either backend are interchangeable as long as JWT_SECRET matches.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return reply.status(500).send({ message: 'JWT_SECRET is not configured' })
  }

  let payload: JwtPayload
  try {
    payload = jwt.verify(token, secret) as JwtPayload
  } catch {
    return reply.status(401).send({ message: 'Invalid or expired token' })
  }

  // Look up the user by email (the `sub` claim)
  const result = await pool.query<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE email = $1',
    [payload.sub],
  )

  if (result.rowCount === 0) {
    return reply.status(401).send({ message: 'User not found' })
  }

  const user = result.rows[0]
  ;(request as FastifyRequest & { user: AuthenticatedUser }).user = {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}
