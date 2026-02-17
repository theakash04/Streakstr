import z from 'zod';

export const StreaksBodySchema = z.object({
  name: z.string().min(1),
});

export const DuoStreakBodySchema = z.object({
  name: z.string().min(1),
  partnerPubkey: z.string().length(64),
});

export const deletePramaSchema = z.object({
  streakId: z.uuid(),
});

export const syncDuoInvitationPramaSchema = z.object({
  streakId: z.uuid(),
  sentAt: z.string(), // ISO date string
});

export const invitationHandlingParamSchema = z.object({
  streakId: z.uuid(),
  action: z.enum(['accept', 'decline']),
});

export const logsBodySchema = z.object({
  logsId: z.uuid(),
});
