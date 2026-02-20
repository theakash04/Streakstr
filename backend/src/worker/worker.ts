import { Worker } from 'bullmq';
import { and, eq, lt } from 'drizzle-orm';
import redis from '../config/redis.ts';
import { db } from '../db/index.ts';
import {
  ReminderLog,
  StreakBreakPost,
  StreakHistory,
  Streaks,
  StreakSettings,
} from '../db/schema.ts';
import { sendDMReminder, sendNip04DM, sendPublicTagPost } from '../utils/Nostr/nostrPublisher.ts';
import { refreshInteractionSubscriptions } from '../utils/Nostr/relaySubscriptionManager.ts';
import connection from './connect.ts';
import { getTrackedPubkeys } from './index.ts';
import { reminderQueue, streakCheckQueue } from './queue.ts';

// Grace period: don't break streaks until this long after the deadline
const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

// ── Reminder Worker ──
export const reminderWorker = new Worker(
  'reminders',
  async () => {
    const now = new Date();

    /**
     * =========================
     * PHASE 1 — FETCH ONLY VALID CANDIDATES
     * =========================
     * Let SQL filter time window instead of JS.
     */

    const activeStreaks = await db
      .select({
        streak: Streaks,
        setting: StreakSettings,
      })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(eq(Streaks.status, 'active'));

    let sentCount = 0;

    /**
     * =========================
     * PHASE 2 — SIDE EFFECTS
     * =========================
     * Reminders do NOT mutate streak state.
     * So no DB transaction needed.
     */

    for (const { streak, setting } of activeStreaks) {
      try {
        if (!streak.deadline) continue;
        if (setting?.dmReminder === false) continue;

        const deadline = new Date(streak.deadline);
        const deadlineMs = deadline.getTime();

        const offsetHours = setting?.reminderOffsetHours ?? 3;
        const reminderMs = deadlineMs - offsetHours * 60 * 60 * 1000;

        const nowMs = now.getTime();

        // Only within reminder window
        if (nowMs < reminderMs || nowMs > deadlineMs) continue;

        const deadlineKey = deadline.toISOString();
        const abuseLevel = setting?.abuseLevel ?? 1;

        const hoursLeft = Math.max(0, Math.round((deadlineMs - nowMs) / 3600000));

        const targets =
          streak.type === 'duo'
            ? [streak.user1Pubkey, streak.user2Pubkey].filter(Boolean)
            : [streak.user1Pubkey];

        for (const target of targets) {
          const redisKey = `reminder:${streak.id}:${deadlineKey}:${target}`;

          /**
           * Atomic dedup using Redis
           * If key already exists → skip
           */
          const lock = await redis.set(
            redisKey,
            '1',
            'EX',
            60 * 60 * 24 // 24h TTL
          );

          if (!lock) continue;

          const res = await sendDMReminder(target!, streak, abuseLevel, hoursLeft);

          if (res) {
            await db
              .insert(ReminderLog)
              .values({
                streakId: streak.id,
                targetPubkey: target!,
                abuseLevel,
                nostrEventId: res,
              })
              .onConflictDoNothing();

            sentCount++;
          }
        }
      } catch (err) {
        console.error(`Reminder failed for streak ${streak.id}`, err);
      }
    }

    console.log(`Reminder check: ${activeStreaks.length} active, ${sentCount} sent`);
  },
  { connection, concurrency: 1 }
);

// ── Streak Check Worker ──
export const streakCheckWorker = new Worker(
  'streak-checks',
  async () => {
    const now = new Date();
    const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MS);

    /**
     * PHASE 1:
     * Atomically break streaks inside a transaction.
     * No DMs. No network calls. Pure DB mutation.
     */
    const brokenStreaks = await db.transaction(async (tx) => {
      // Atomically update and return affected streaks
      const updated = await tx
        .update(Streaks)
        .set({
          status: 'broken',
          endedAt: now,
        })
        .where(and(eq(Streaks.status, 'active'), lt(Streaks.deadline, graceThreshold)))
        .returning();
      console.log(updated);

      if (updated.length === 0) return [];

      // Insert history in bulk
      await tx.insert(StreakHistory).values(
        updated.map((streak) => ({
          streakId: streak.id,
          countBeforeBreak: streak.currentCount ?? 0,
          startedAt: streak.createdAt ?? now,
          brokenAt: now,
        }))
      );

      return updated;
    });

    console.log(`Streak check: ${brokenStreaks.length} streaks broken (past grace)`);
    console.log(brokenStreaks);

    /**
     * PHASE 2:
     * Side effects (network calls).
     * If these fail, state is already correct.
     * We can retry safely later.
     */
    for (const streak of brokenStreaks) {
      try {
        const setting = await db
          .select()
          .from(StreakSettings)
          .where(eq(StreakSettings.streakId, streak.id))
          .limit(1)
          .then((r) => r[0]);

        const abuseLevel = setting?.abuseLevel ?? 1;

        // If abuseLevel = 0 → no notifications at all
        if (abuseLevel === 0) continue;

        const deadlineKey = new Date(streak.deadline!).toISOString();
        const dedupBase = `break:${streak.id}:${deadlineKey}`;

        // ===== SOLO =====
        if (streak.type === 'solo') {
          // DB-based idempotency (stronger than checking first)
          const res = await sendPublicTagPost(streak.user1Pubkey, streak, abuseLevel);

          if (res) {
            await db
              .insert(StreakBreakPost)
              .values({
                streakId: streak.id,
                pubkey: streak.user1Pubkey,
                abuseLevel,
                eventId: res,
              })
              .onConflictDoNothing(); // prevents duplicates
          }
        }

        // ===== DUO =====
        if (streak.type === 'duo') {
          const targets = [streak.user1Pubkey, streak.user2Pubkey].filter(Boolean) as string[];

          for (const target of targets) {
            const dedupKey = `${dedupBase}:${target}`;

            // Redis-based idempotency with TTL
            const alreadySent = await redis.set(
              dedupKey,
              '1',
              'EX',
              60 * 60 * 24 // 24h
            );

            if (!alreadySent) continue;

            const breakMessage = `Your duo streak "${streak.name}" has been broken after ${
              streak.currentCount ?? 0
            } day${
              (streak.currentCount ?? 0) !== 1 ? 's' : ''
            }.\n\nStart a new duo streak at ${process.env.FRONTEND_URL}`;

            const res = await sendNip04DM(target, breakMessage);

            if (res) {
              await db
                .insert(ReminderLog)
                .values({
                  streakId: streak.id,
                  targetPubkey: target,
                  abuseLevel,
                  nostrEventId: res,
                })
                .onConflictDoNothing();
            }
          }
        }
      } catch (err) {
        console.error(`Side effect failed for streak ${streak.id}`, err);
      }
    }
  },
  { connection, concurrency: 1 }
);

export const refreshWorker = new Worker(
  'subscription-refresh',
  async () => {
    console.log('Refreshing relay subscriptions...');
    const updatedPubkeys = await getTrackedPubkeys();
    refreshInteractionSubscriptions(updatedPubkeys);
  },
  { connection }
);

// ── Error listeners ──
reminderWorker.on('failed', (job, err) => {
  console.error(`Reminder job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

streakCheckWorker.on('failed', (job, err) => {
  console.error(`Streak check job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

refreshWorker.on('failed', (job, err) => {
  console.error(`Refresh job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

export async function scheduleRecurringJobs(): Promise<void> {
  await reminderQueue.upsertJobScheduler(
    'reminder-check',
    { pattern: '*/5 * * * *' }, // every 5 minutes — per-streak reminder offset
    { name: 'check-reminders' }
  );

  await streakCheckQueue.upsertJobScheduler(
    'streak-check',
    { pattern: '*/1 * * * *' }, // every 1 minutes — catches expired deadlines faster
    { name: 'check-broken-streaks' }
  );

  console.log('Recurring jobs scheduled (reminders: 5min, streak-check: 1min)');
}
