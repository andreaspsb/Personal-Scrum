import { FastifyInstance } from 'fastify';

/**
 * Generates a JWT token with the user's email as the subject.
 * Relies on @fastify/jwt registered on the Fastify instance.
 */
export function generateToken(
  fastify: FastifyInstance,
  email: string,
): string {
  return fastify.jwt.sign(
    { sub: email },
    { expiresIn: '24h' },
  );
}
