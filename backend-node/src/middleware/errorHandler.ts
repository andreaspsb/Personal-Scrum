import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const timestamp = new Date().toISOString();

  // Fastify validation errors (schema-level)
  if (error.validation) {
    reply.status(400).send({
      timestamp,
      status: 400,
      error: 'Bad Request',
      message: error.message,
    });
    return;
  }

  const statusCode = error.statusCode ?? 500;

  reply.status(statusCode).send({
    timestamp,
    status: statusCode,
    error: statusCode === 500 ? 'Internal Server Error' : error.name ?? 'Error',
    message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
  });
}
