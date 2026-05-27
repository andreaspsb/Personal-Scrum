import { FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';

/**
 * Prehandler hook that verifies the JWT and attaches the resolved
 * numeric userId to the request object for downstream route handlers.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();

    const payload = request.user as { sub: string };
    const email = payload.sub;

    const result = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({
        timestamp: new Date().toISOString(),
        status: 401,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    (request as FastifyRequest & { userId: number }).userId = result.rows[0].id;
  } catch (err) {
    return reply.status(401).send({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
