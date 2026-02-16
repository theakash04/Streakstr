import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.ts';

export async function streakRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: ['Streaks'],
      security: [{ cookie: [] }],
    };

    routeOptions.preHandler = [authMiddleware];
  });

  fastify.get('/', async (req, reply) => {
    reply.status(200).send({ message: 'Get all streaks - not implemented yet' });
  });
}
