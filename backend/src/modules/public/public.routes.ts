import type { FastifyInstance } from 'fastify';
import { GetLeaderboard } from './public.controller.ts';

export async function publicRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: ['Public'],
    };
  });

  fastify.get('/leaderboard', GetLeaderboard);
}
