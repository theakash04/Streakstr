import type { FastifyInstance } from 'fastify';
import { challengeHandler, verifyHandler, logoutHandler, meHandler } from './auth.controller.ts';
import { challengeRequestSchema, verifyRequestSchema } from './auth.schema.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/challenge', {
    schema: {
      body: challengeRequestSchema,
    },
    handler: challengeHandler,
  });

  fastify.post('/verify', {
    schema: {
      body: verifyRequestSchema,
    },
    handler: verifyHandler,
  });

  fastify.post('/logout', {
    handler: logoutHandler,
  });

  fastify.get('/me', {
    preHandler: authMiddleware,
    handler: meHandler,
  });
}
