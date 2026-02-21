import type { FastifyInstance } from 'fastify';
import {
  challengeHandler,
  verifyHandler,
  logoutHandler,
  meHandler,
} from './auth.controller.ts';
import { challengeRequestSchema, verifyRequestSchema } from './auth.schema.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import { RELAY_URLS } from '../../config/relay.ts';
import z from 'zod';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: ['Authentication'],
    };
  });

  // Public — exposes relay URLs for frontend NIP-46 / auth event
  fastify.get('/relays', async (_req, reply) => {
    return reply.send({ relays: RELAY_URLS });
  });

  fastify.post(
    '/challenge',
    {
      schema: {
        body: challengeRequestSchema,
      },
    },
    challengeHandler
  );

  fastify.post(
    '/verify',
    {
      schema: {
        body: verifyRequestSchema,
      },
    },
    verifyHandler
  );

  fastify.post(
    '/logout',
    {
      schema: {
        security: [{ cookie: [] }],
      },
      preHandler: authMiddleware,
    },
    logoutHandler
  );

  fastify.get(
    '/me',
    {
      schema: {
        security: [{ cookie: [] }],
      },
      preHandler: authMiddleware,
    },
    meHandler
  );
}
