import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { AuthResponse, UserDTO } from '../types';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/register
   */
  fastify.post(
    '/api/auth/register',
    async (request: FastifyRequest, reply: FastifyReply): Promise<AuthResponse> => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { name, email, password } = parsed.data;

      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );
      if (existing.rows.length > 0) {
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Email already in use',
        });
      }

      const hashedPassword = await hashPassword(password);

      const result = await pool.query<{
        id: number;
        name: string;
        email: string;
        role: string;
      }>(
        `INSERT INTO users (name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'ROLE_USER', NOW(), NOW())
         RETURNING id, name, email, role`,
        [name, email, hashedPassword],
      );

      const user = result.rows[0];
      const token = generateToken(fastify, user.email);

      const userDTO: UserDTO = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return reply.status(200).send({ token, refreshToken: null, user: userDTO });
    },
  );

  /**
   * POST /api/auth/login
   */
  fastify.post(
    '/api/auth/login',
    async (request: FastifyRequest, reply: FastifyReply): Promise<AuthResponse> => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        return reply.status(400).send({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message,
        });
      }

      const { email, password } = parsed.data;

      const result = await pool.query<{
        id: number;
        name: string;
        email: string;
        password: string;
        role: string;
      }>(
        'SELECT id, name, email, password, role FROM users WHERE email = $1',
        [email],
      );

      if (result.rows.length === 0) {
        return reply.status(401).send({
          timestamp: new Date().toISOString(),
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
      }

      const user = result.rows[0];
      const valid = await comparePassword(password, user.password);

      if (!valid) {
        return reply.status(401).send({
          timestamp: new Date().toISOString(),
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(fastify, user.email);

      const userDTO: UserDTO = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return reply.status(200).send({ token, refreshToken: null, user: userDTO });
    },
  );
}
