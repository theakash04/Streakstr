import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import {
  acknowledgeLogs,
  createDuoStreak,
  createSoloStrike,
  deleteStreak,
  getAllStreaks,
  getSingleStreak,
  getUnreadLogs,
  getUserActivity,
  invitationHandling,
  markAllLogsAsRead,
  SyncDuoStreakInvitation,
  updateStreakSettings,
} from './streak.controller.ts';
import {
  DuoStreakBodySchema,
  invitationHandlingParamSchema,
  logsBodySchema,
  StreakCommonParamSchema,
  StreaksBodySchema,
  StreaksSettingUpdateBodySchema,
  syncDuoInvitationPramaSchema,
  UserActivityQuerySchema,
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
        description:
          'Create a new duo streak with a partner. The partner will receive an invitation to join the streak.',
        deprecated: true,
      },
    },
    createDuoStreak
  );

  fastify.put(
    '/duo-invitation/:streakId/sync/:sentAt',
    {
      schema: {
        params: syncDuoInvitationPramaSchema,
        description:
          'Sync a duo streak invitation. This is used to handle the case where the user accepts the invitation on another device and we need to sync the state across devices.',
        deprecated: true,
      },
    },
    SyncDuoStreakInvitation
  );

  fastify.put(
    '/duo-invitation/:streakId/respond',
    {
      schema: {
        params: invitationHandlingParamSchema,
        description:
          'Handle a duo streak invitation. This is used when the user accepts or declines a duo streak invitation.',
        deprecated: true,
      },
    },
    invitationHandling
  );

  fastify.delete(
    '/:streakId',
    {
      schema: {
        params: StreakCommonParamSchema,
        description: 'Delete a streak by its ID. Only the owner can delete the streak.',
      },
    },
    deleteStreak
  );

  fastify.get(
    '/logs/unread',
    {
      schema: {
        description: 'Get all unread logs for the authenticated user',
      },
    },
    getUnreadLogs
  );

  fastify.patch(
    '/:streakId/logs/mark-read',
    {
      schema: {
        description: 'Mark all logs for a streak as read',
      },
    },
    markAllLogsAsRead
  );

  fastify.patch(
    '/:streakId/logs/:logsId/acknowledge',
    {
      schema: {
        params: StreakCommonParamSchema,
        body: logsBodySchema,
        description:
          'Acknowledge a specific log entry. This is used when the user wants to acknowledge a log entry without marking all logs as read.',
      },
    },
    acknowledgeLogs
  );

  fastify.get(
    '/:streakId',
    {
      schema: {
        params: StreakCommonParamSchema,
        description:
          'Get details of a single streak by its ID. This includes the streak information, settings, history, and logs. Only participants of the streak can access this endpoint.',
      },
    },
    getSingleStreak
  );

  fastify.patch(
    '/:streakId/settings',
    {
      schema: {
        params: StreakCommonParamSchema,
        body: StreaksSettingUpdateBodySchema,
        description:
          'Update the settings of a streak. Only the owner of the streak can update the settings. This includes toggling DM reminders, setting abuse level, reminder offset hours, and whether to show in leaderboard.',
      },
    },
    updateStreakSettings
  );

  fastify.get(
    '/activity',
    {
      schema: {
        querystring: UserActivityQuerySchema,
        description:
          'Get user activity logs for a specific year. This includes all streak-related activities such as creating streaks, breaking streaks, and acknowledging logs. The year should be provided as a query parameter.',
      },
    },
    getUserActivity
  );
}
