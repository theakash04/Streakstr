import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import {
  createDuoStreak,
  createSoloStrike,
  deleteStreak,
  getAllStreaks,
  getUnreadLogs,
  invitationHandling,
  SyncDuoStreakInvitation,
} from './streak.controller.ts';
import {
  deletePramaSchema,
  DuoStreakBodySchema,
  invitationHandlingParamSchema,
  StreaksBodySchema,
  syncDuoInvitationPramaSchema,
} from './streak.schema.ts';

export async function streakRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    routeOptions.schema = {
      ...routeOptions.schema,
      tags: ['Streaks'],
      security: [{ cookie: [] }],
    };

    routeOptions.preHandler = [authMiddleware];
  });

  fastify.get('/all', { schema: {} }, getAllStreaks);
  fastify.post('/solo', { schema: { body: StreaksBodySchema } }, createSoloStrike);

  fastify.post(
    '/duo',
    {
      schema: {
        body: DuoStreakBodySchema,
      },
    },
    createDuoStreak
  );

  fastify.put(
    '/duo-invitation/:streakId/sync/:sentAt',
    {
      schema: {
        params: syncDuoInvitationPramaSchema,
      },
    },
    SyncDuoStreakInvitation
  );

  fastify.put(
    '/duo-invitation/:streakId/respond',
    {
      schema: {
        params: invitationHandlingParamSchema,
      },
    },
    invitationHandling
  );

  fastify.delete(
    '/:streakId',
    {
      schema: {
        params: deletePramaSchema,
      },
    },
    deleteStreak
  );

  fastify.get(
    '/logs',
    {
      schema: {},
    },
    getUnreadLogs
  );
}
