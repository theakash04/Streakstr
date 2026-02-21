import { and, desc, eq, gte, lt, or } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { invalidateActiveStreaks } from '../../config/cache.ts';
import { db } from '../../db/index.ts';
import { Logs, StreakHistory, Streaks, StreakSettings, UserActivity } from '../../db/schema.ts';
import { createDuoToken, verifyDuoToken } from '../../utils/DuoInvToken.ts';
import { sendNip04DM } from '../../utils/Nostr/nostrPublisher.ts';
import { notifyWorkerToRefresh } from '../../utils/notifyWorker.ts';
import {
  DuoStreakBodySchema,
  invitationHandlingBodySchema,
  logsBodySchema,
  StreakCommonParamSchema,
  StreaksBodySchema,
  StreaksSettingUpdateBodySchema,
  UserActivityQuerySchema,
  InteractionsQuerySchema,
} from './streak.schema.ts';
import { getUserFromRelays } from '../../utils/Nostr/nostrQueries.ts';
import { getEndOfTodayUTC } from '../../utils/Nostr/EventHandler.ts';
import redis from '../../config/redis.ts';
import { SimplePool } from 'nostr-tools';
import { RELAY_URLS } from '../../config/relay.ts';

type createStreakBody = z.infer<typeof StreaksBodySchema>;
type CreateDuoStreakBody = z.infer<typeof DuoStreakBodySchema>;
type invitationHandlingBody = z.infer<typeof invitationHandlingBodySchema>;
type LogsBody = z.infer<typeof logsBodySchema>;
type streakCommonParams = z.infer<typeof StreakCommonParamSchema>;
type StreaksSettingUpdateBody = z.infer<typeof StreaksSettingUpdateBodySchema>;
type UserActivityQuery = z.infer<typeof UserActivityQuerySchema>;
type InteractionsQuery = z.infer<typeof InteractionsQuerySchema>;

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
        deadline: getEndOfTodayUTC(new Date()),
      })
      .returning();

    await db.insert(StreakSettings).values({
      streakId: newStreak.id,
      showInLeaderboard: true,
    });

    const message =
      `Your solo streak "${name}" has been created!` +
      `\n\n` +
      `Visit ${process.env.FRONTEND_URL} to view your streak.`;
    // send dm to user
    await sendNip04DM(pubkey, message);
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
          or(eq(Streaks.status, 'pending'), eq(Streaks.status, 'active')),
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
        inviteSentAt: new Date(),
      })
      .returning();

    const token = createDuoToken(pubkey, partnerPubkey);
    const message =
      `You've been invited to a duo streak: "${name}"!\n\n` +
      `Accept or decline this invitation at ${process.env.FRONTEND_URL}/invites?token=${token}&sender=${pubkey}&sname=${name}` +
      `\nA duo streak means you both need to interact with each other on Nostr every day to keep the streak alive.`;

    await sendNip04DM(partnerPubkey, message);
    return reply.status(201).send({ message: 'Duo streak created', streak: newStreak });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ error: 'Failed to create duo streak' });
  }
}

export async function invitationHandling(req: FastifyRequest, reply: FastifyReply) {
  const now = new Date();

  try {
    const { pubkey } = req.user!;
    const { token, action, streakId } = req.body as invitationHandlingBody;

    if (!token && !streakId) {
      return reply.status(400).send({
        error: 'Provide either token or streakId',
      });
    }

    let sender: string | null = null;
    let streak;

    // ================= FETCH STREAK =================
    if (token) {
      const decoded = verifyDuoToken(token);

      if (decoded.receiver !== pubkey) {
        return reply.status(403).send({
          error: 'You are not authorized to accept this invitation',
        });
      }

      sender = decoded.sender;

      [streak] = await db
        .select()
        .from(Streaks)
        .where(
          and(
            eq(Streaks.user1Pubkey, sender),
            eq(Streaks.user2Pubkey, pubkey),
            eq(Streaks.inviteStatus, 'pending')
          )
        );
    } else {
      [streak] = await db
        .select()
        .from(Streaks)
        .where(
          and(
            eq(Streaks.id, streakId!),
            eq(Streaks.user2Pubkey, pubkey),
            eq(Streaks.inviteStatus, 'pending')
          )
        );

      if (streak) sender = streak.user1Pubkey;
    }

    if (!streak || !sender) {
      return reply.status(404).send({
        error: 'Duo streak invitation not found',
      });
    }

    // ================= DECLINE =================
    if (action === 'decline') {
      await db
        .update(Streaks)
        .set({
          inviteStatus: 'declined',
          inviteDeclinedAt: now,
        })
        .where(eq(Streaks.id, streak.id));

      return reply.status(200).send({
        message: 'Duo streak invitation declined',
      });
    }

    // ================= ACCEPT =================
    if (action !== 'accept') {
      return reply.status(400).send({
        error: 'Invalid action',
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(Streaks)
        .set({
          inviteStatus: 'accepted',
          status: 'active',
          startedAt: now,
          deadline: getEndOfTodayUTC(now),
          currentCount: 0,
          highestCount: 0,
          inviteAcceptedAt: now,
        })
        .where(eq(Streaks.id, streak!.id));

      await tx.insert(StreakSettings).values({ streakId: streak!.id }).onConflictDoNothing();

      await tx.insert(Logs).values({
        action: 'Invite accepted',
        description: `User ${pubkey} accepted duo streak "${streak!.name}"`,
        startedByPubkey: pubkey,
        relatedPubkey2: sender!,
      });
    });

    // Fetch profiles only after DB success
    const [senderProfileRaw, receiverProfileRaw] = await Promise.all([
      getUserFromRelays(sender),
      getUserFromRelays(pubkey),
    ]);

    const senderProfile = JSON.parse(senderProfileRaw || '{}');
    const receiverProfile = JSON.parse(receiverProfileRaw || '{}');

    const senderName = receiverProfile?.name || receiverProfile?.display_name || pubkey.slice(0, 8);

    const receiverName = senderProfile?.name || senderProfile?.display_name || sender.slice(0, 8);

    const senderMessage = `Your duo streak "${streak.name}" has been accepted by ${senderName}!\n\nVisit ${process.env.FRONTEND_URL} to view your streak.`;

    const receiverMessage = `You have accepted the duo streak "${streak.name}" with ${receiverName}!\n\nVisit ${process.env.FRONTEND_URL} to view your streak.`;

    await Promise.all([sendNip04DM(pubkey, receiverMessage), sendNip04DM(sender, senderMessage)]);

    return reply.status(200).send({
      message: 'Duo streak invitation accepted',
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.message,
      });
    }

    return reply.status(500).send({
      error: 'Failed to handle duo streak invitation',
    });
  } finally {
    await notifyWorkerToRefresh();
  }
}

export async function deleteStreak(req: FastifyRequest, reply: FastifyReply) {
  const { pubkey } = req.user!;
  try {
    const { streakId } = req.params as streakCommonParams;

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
      .set({ acknowledged: true, acknowledgedAt: new Date() })
      .where(and(eq(Logs.id, logsId), eq(Logs.relatedPubkey2, pubkey)));
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to acknowledge logs' });
  }
}

export async function markAllLogsAsRead(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;

    await db
      .update(Logs)
      .set({ acknowledged: true, acknowledgedAt: new Date() })
      .where(eq(Logs.relatedPubkey2, pubkey));
    return reply.status(200).send({ message: 'All logs marked as read' });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to mark logs as read' });
  }
}

export async function getStreakSettings(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { streakId } = req.params as streakCommonParams;

    const streakExists = await db
      .select()
      .from(Streaks)
      .where(
        and(
          eq(Streaks.id, streakId),
          or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
        )
      )
      .limit(1);

    if (streakExists.length === 0) {
      return reply.status(404).send({ error: 'Streak not found' });
    }

    const [settings] = await db
      .select()
      .from(StreakSettings)
      .where(eq(StreakSettings.streakId, streakId));

    if (!settings) {
      const [newSettings] = await db.insert(StreakSettings).values({ streakId }).returning();

      return reply.status(200).send({ settings: newSettings });
    }

    return reply.status(200).send({ settings });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to get streak settings' });
  }
}

export async function updateStreakSettings(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { abuseLevel, dmReminder, reminderOffsetHours, showInLeaderboard } =
      req.body as StreaksSettingUpdateBody;
    const { streakId } = req.params as streakCommonParams;

    const streakExists = await db
      .select()
      .from(Streaks)
      .where(
        and(
          eq(Streaks.id, streakId),
          or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
        )
      )
      .limit(1);

    if (streakExists.length === 0) {
      return reply.status(404).send({ error: 'Streak not found' });
    }

    if (reminderOffsetHours && reminderOffsetHours < 0) {
      return reply
        .status(400)
        .send({ error: 'Reminder offset hours must be greater than or equal to 0' });
    }

    const updateData: Partial<{
      dmReminder: boolean;
      abuseLevel: number;
      reminderOffsetHours: number;
      showInLeaderboard: boolean;
    }> = {};

    if (dmReminder !== undefined) updateData.dmReminder = dmReminder;
    if (abuseLevel !== undefined) updateData.abuseLevel = abuseLevel;
    if (reminderOffsetHours !== undefined) updateData.reminderOffsetHours = reminderOffsetHours;
    if (showInLeaderboard !== undefined) updateData.showInLeaderboard = showInLeaderboard;

    await db.update(StreakSettings).set(updateData).where(eq(StreakSettings.streakId, streakId));
    return reply.status(200).send({ message: 'Streak settings updated' });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to update streak settings' });
  }
}

export async function getSingleStreak(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { streakId } = req.params as streakCommonParams;

    const [streak] = await db
      .select({
        streak: Streaks,
        settings: StreakSettings,
        history: StreakHistory,
      })
      .from(Streaks)
      .where(
        and(
          eq(Streaks.id, streakId),
          or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
        )
      )
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .leftJoin(StreakHistory, eq(StreakHistory.streakId, Streaks.id))
      .limit(1);

    if (!streak) {
      return reply.status(404).send({ error: 'Streak not found for this user' });
    }

    return reply.status(200).send({ streak });
  } catch (error) {
    return reply.status(500).send({ error: 'Failed to get streak details' });
  }
}

export async function getUserActivity(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { year } = req.query as UserActivityQuery;

    // covert year to date range
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    const activityLogs = await db
      .select({
        date: UserActivity.date,
        postCount: UserActivity.postCount,
        streakActive: UserActivity.streakActive,
      })
      .from(UserActivity)
      .where(
        and(
          eq(UserActivity.pubkey, pubkey),
          and(gte(UserActivity.date, startDate), lt(UserActivity.date, endDate))
        )
      );

    return reply.status(200).send({ activityLogs });
  } catch (error) {
    // use pino logs to log the error with stack trace
    req.log.error({ error }, 'Failed to get user activity logs');
    return reply.status(500).send({ error: 'Failed to get user activity logs' });
  }
}

export async function getInteractions(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { pubkey } = req.user!;
    const { timeframe } = (req.query as InteractionsQuery) || { timeframe: 'weekly' };

    const cacheKey = `interactions:${timeframe}:${pubkey}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return reply.status(200).send(JSON.parse(cached));
    }

    const pool = new SimplePool({ enablePing: true, enableReconnect: true });

    // Compute NIP-01 since timestamp
    const nowStampUtc = Math.floor(Date.now() / 1000);
    let sinceStamp: number | undefined = undefined;

    if (timeframe === 'weekly') {
      sinceStamp = nowStampUtc - 7 * 24 * 60 * 60;
    } else if (timeframe === 'monthly') {
      sinceStamp = nowStampUtc - 30 * 24 * 60 * 60;
    }

    // Fetch user's recent events (kinds 1, 7, 9734) to see who they interact with
    const events = await pool.querySync(RELAY_URLS, {
      authors: [pubkey],
      kinds: [1, 7, 9734],
      limit: 1000,
      ...(sinceStamp ? { since: sinceStamp } : {}),
    });

    pool.close(RELAY_URLS);

    const scores: Record<
      string,
      { notes: number; replies: number; reactions: number; zaps: number; total: number }
    > = {};

    for (const event of events) {
      // Find 'p' tags
      const pTags = event.tags.filter((t) => t[0] === 'p' && t[1] !== pubkey);
      const interactedPubkeys = [...new Set(pTags.map((t) => t[1]))]; // Deduplicate per event

      for (const p of interactedPubkeys) {
        if (!scores[p]) {
          scores[p] = { notes: 0, replies: 0, reactions: 0, zaps: 0, total: 0 };
        }

        if (event.kind === 1) {
          // If it has 'e' tags it's likely a reply, else just a mention
          const isReply = event.tags.some((t) => t[0] === 'e');
          if (isReply) {
            scores[p].replies += 1;
            scores[p].total += 2;
          } else {
            scores[p].notes += 1;
            scores[p].total += 1;
          }
        } else if (event.kind === 7) {
          scores[p].reactions += 1;
          scores[p].total += 1;
        } else if (event.kind === 9734) {
          scores[p].zaps += 1;
          scores[p].total += 3;
        }
      }
    }

    // Sort by total score descending and take top 10
    const sortedPubkeys = Object.entries(scores)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    if (sortedPubkeys.length === 0) {
      const response = { interactions: [] };
      await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
      return reply.status(200).send(response);
    }

    const topPubkeys = sortedPubkeys.map(([p]) => p);

    // Fetch profiles (Kind 0) for these top pubkeys
    const pool2 = new SimplePool({ enablePing: false, enableReconnect: false });
    const profileEvents = await pool2.querySync(RELAY_URLS, {
      authors: topPubkeys,
      kinds: [0],
    });
    pool2.close(RELAY_URLS);

    const profiles = profileEvents.reduce(
      (acc, event) => {
        try {
          acc[event.pubkey] = JSON.parse(event.content);
        } catch (e) {
          // ignore invalid JSON
        }
        return acc;
      },
      {} as Record<string, any>
    );

    const interactions = sortedPubkeys.map(([p, stats]) => ({
      pubkey: p,
      stats,
      userInfo: profiles[p] || null,
    }));

    const response = { interactions };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);

    return reply.status(200).send(response);
  } catch (error) {
    req.log.error({ error }, 'Failed to get user interactions');
    return reply.status(500).send({ error: 'Failed to get user interactions' });
  }
}
