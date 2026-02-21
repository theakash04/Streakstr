import z from 'zod';

export const StreaksBodySchema = z.object({
  name: z.string().min(1),
});

export const DuoStreakBodySchema = z.object({
  name: z.string().min(1),
  partnerPubkey: z.string().length(64),
});

export const StreakCommonParamSchema = z.object({
  streakId: z.uuid(),
});

export const syncDuoInvitationPramaSchema = z.object({
  streakId: z.uuid(),
  sentAt: z.string(), // ISO date string
});

export const invitationHandlingBodySchema = z
  .object({
    token: z.string().optional(),
    streakId: z.uuid().optional(),
    action: z.enum(['accept', 'decline']),
  })
  .refine((data) => data.token || data.streakId, {
    message: 'Either token or streakId must be provided',
  });

export const logsBodySchema = z.object({
  logsId: z.uuid(),
});

export const UserActivityQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/), // Year in YYYY format
});

export const StreaksSettingUpdateBodySchema = z.object({
  dmReminder: z.boolean().optional(),
  abuseLevel: z.number().int().min(0).max(3).optional(),
  reminderOffsetHours: z.number().int().min(0).optional(),
  showInLeaderboard: z.boolean().optional(),
});

export const InteractionsQuerySchema = z.object({
  timeframe: z.enum(['weekly', 'monthly', 'all']).default('weekly'),
});
