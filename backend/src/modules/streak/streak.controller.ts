import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../db/index.ts';
import { Logs, Streaks } from '../../db/schema.ts';
import { and, eq, exists, or } from 'drizzle-orm';
import { z } from 'zod';
import {
  deletePramaSchema,
  DuoStreakBodySchema,
  invitationHandlingParamSchema,
  logsBodySchema,
  StreaksBodySchema,
  syncDuoInvitationPramaSchema,
} from './streak.schema.ts';
import { notifyWorkerToRefresh } from '../../utils/notifyWorker.ts';
import { invalidateActiveStreaks } from '../../config/cache.ts';

type createStreakBody = z.infer<typeof StreaksBodySchema>;
type CreateDuoStreakBody = z.infer<typeof DuoStreakBodySchema>;
type syncDuoInvitationPrama = z.infer<typeof syncDuoInvitationPramaSchema>;
type invitationHandlingParam = z.infer<typeof invitationHandlingParamSchema>;
type deleteStreakParam = z.infer<typeof deletePramaSchema>;
type LogsBody = z.infer<typeof logsBodySchema>;

export async function getAllStreaks(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    // get all streaks for the user
    const streaks = await db
      .select()
      .from(Streaks)
      .where(or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey)));

    return reply.status(200).send({ message: 'Get all streaks - not implemented yet', streaks });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to get streaks' });
  }
}

export async function createSoloStrike(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { name } = req.body as createStreakBody;

    const existingStreak = await db
      .select()
      .from(Streaks)
      .where(
        and(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.type, 'solo'), eq(Streaks.status, 'active'))
      )
      .limit(1);

    if (existingStreak.length > 0) {
      return reply.status(400).send({ error: 'User already has an active solo streak' });
    }

    const [newStreak] = await db
      .insert(Streaks)
      .values({
        user1Pubkey: pubkey,
        type: 'solo',
        name,
        status: 'active',
        startedAt: new Date(),
      })
      .returning();

    return reply.status(201).send({ message: 'Solo streak created', streak: newStreak });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to create solo streak' });
  } finally {
    await notifyWorkerToRefresh();
  }
}

export async function createDuoStreak(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { name, partnerPubkey } = req.body as CreateDuoStreakBody;

    if (partnerPubkey === pubkey) {
      return reply.status(400).send({ error: 'Cannot create a duo streak with yourself' });
    }

    // check if the user already has an active duo streak with the same partner
    const existingStreak = await db
      .select()
      .from(Streaks)
      .where(
        and(
          eq(Streaks.type, 'duo'),
          eq(Streaks.status, 'active'),
          or(
            and(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, partnerPubkey)),
            and(eq(Streaks.user1Pubkey, partnerPubkey), eq(Streaks.user2Pubkey, pubkey))
          )
        )
      );

    if (existingStreak.length > 0) {
      return reply
        .status(400)
        .send({ error: 'An active duo streak already exists between these two users' });
    }

    const [newStreak] = await db
      .insert(Streaks)
      .values({
        user1Pubkey: pubkey,
        user2Pubkey: partnerPubkey,
        type: 'duo',
        inviterPubKey: pubkey,
        name,
        inviteStatus: 'pending',
      })
      .returning();

    return reply.status(201).send({ message: 'Duo streak created', streak: newStreak });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to create duo streak' });
  } finally {
    await notifyWorkerToRefresh();
  }
}

export async function SyncDuoStreakInvitation(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { streakId, sentAt } = req.params as syncDuoInvitationPrama;

    // check if the streak exists and the user is the invitee
    const streak = await db
      .select()
      .from(Streaks)
      .where(and(eq(Streaks.id, streakId), eq(Streaks.inviterPubKey, pubkey)))
      .limit(1);

    if (streak.length === 0) {
      return reply.status(404).send({ error: 'Duo streak invitation not found for this user' });
    }

    // update the sentAt
    await db
      .update(Streaks)
      .set({ inviteSentAt: new Date(sentAt) })
      .where(eq(Streaks.id, streakId));

    return reply.status(200).send({ message: 'Duo streak invitation synced' });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to sync duo streak invitation' });
  }
}

export async function invitationHandling(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { streakId, action } = req.params as invitationHandlingParam;

    // check if streak exists and the accepting user is the invited partner
    const streak = await db
      .select()
      .from(Streaks)
      .where(
        and(
          eq(Streaks.id, streakId),
          eq(Streaks.user2Pubkey, pubkey),
          eq(Streaks.inviteStatus, 'pending')
        )
      );

    if (streak.length === 0) {
      return reply.status(404).send({ error: 'Duo streak invitation not found for this user' });
    }

    if (action === 'accept') {
      await db
        .update(Streaks)
        .set({
          inviteStatus: 'accepted',
          status: 'active',
          startedAt: new Date(),
          inviteAcceptedAt: new Date(),
        })
        .where(eq(Streaks.id, streakId));

      return reply.status(200).send({ message: 'Duo streak invitation accepted' });
    }

    await db
      .update(Streaks)
      .set({ inviteStatus: 'declined', inviteDeclinedAt: new Date() })
      .where(eq(Streaks.id, streakId));

    return reply.status(200).send({ message: 'Duo streak invitation declined' });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to handle duo streak invitation' });
  } finally {
    await notifyWorkerToRefresh();
  }
}

export async function deleteStreak(req: FastifyRequest, reply: FastifyReply) {
  const { pubkey } = req.user!;
  try {
    const { streakId } = req.params as deleteStreakParam;

    // check if the streak exists and the user is a participant
    const streak = await db
      .select()
      .from(Streaks)
      .where(
        and(
          eq(Streaks.id, streakId),
          or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
        )
      )
      .limit(1);

    if (streak.length === 0) {
      return reply.status(404).send({ error: 'Streak not found for this user' });
    }

    await db.delete(Streaks).where(eq(Streaks.id, streakId));

    await db.insert(Logs).values({
      action: 'delete_streak',
      description: `User ${pubkey} deleted streak ${streakId}`,
      startedByPubkey: pubkey,
      relatedPubkey2:
        streak[0].type === 'duo'
          ? streak[0].user1Pubkey === pubkey
            ? streak[0].user2Pubkey
            : streak[0].user1Pubkey
          : null,
    });

    return reply.status(200).send({ message: 'Streak deleted' });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to delete streak' });
  } finally {
    await invalidateActiveStreaks(pubkey);
    await notifyWorkerToRefresh();
  }
}

export async function getUnreadLogs(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const logs = await db
      .select()
      .from(Logs)
      .where(and(eq(Logs.acknowledged, false), eq(Logs.relatedPubkey2, pubkey)));

    return reply.status(200).send({ logs });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to get logs' });
  }
}

export async function acknowledgeLogs(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { logsId } = req.body as LogsBody;
    await db
      .update(Logs)
      .set({ acknowledged: true })
      .where(and(eq(Logs.id, logsId), eq(Logs.relatedPubkey2, pubkey)));
  } catch (error) {
    reply.status(500).send({ error: 'Failed to acknowledge logs' });
  }
}
