import { Worker } from 'bullmq';
import connection from './connect.ts';
import { db } from '../db/index.ts';
import {
  DailyLogs,
  ReminderLog,
  StreakBreakPost,
  StreakHistory,
  Streaks,
  StreakSettings,
} from '../db/schema.ts';
import { and, eq, lt, gt, gte, lte, sql } from 'drizzle-orm';
import { reminderQueue, streakCheckQueue } from './queue.ts';
import { sendDMReminder, sendPublicTagPost } from '../utils/Nostr/nostrPublisher.ts';
import { getTrackedPubkeys } from './index.ts';
import { refreshInteractionSubscriptions } from '../utils/Nostr/relaySubscriptionManager.ts';
import { hasReminderBeenSent, markReminderSent } from '../config/cache.ts';

// Grace period: don't break streaks until this long after the deadline
const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

// ── Reminder Worker ──
// Runs every 15 minutes. Uses per-streak reminderOffsetHours to time reminders.
export const reminderWorker = new Worker(
  'reminders',
  async (job) => {
    const now = new Date();

    // Fetch all active streaks with their settings
    const activeStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(eq(Streaks.status, 'active'));

    let sentCount = 0;

    for (const { streak, setting } of activeStreaks) {
      try {
        if (!streak.deadline || setting?.dmReminder === false) continue;

        // Per-streak reminder offset (default 3 hours before deadline)
        const offsetHours = setting?.reminderOffsetHours ?? 3;
        const deadlineMs = new Date(streak.deadline).getTime();
        const reminderMs = deadlineMs - offsetHours * 60 * 60 * 1000;

        // Only send if we're within [reminderTime, deadline]
        if (now.getTime() < reminderMs || now.getTime() > deadlineMs) continue;

        // Use deadline ISO as the dedup window key
        const deadlineKey = new Date(streak.deadline).toISOString();

        // Determine who needs a reminder (for duo, both users; for solo, user1)
        const targets: string[] = [streak.user1Pubkey];
        if (streak.type === 'duo' && streak.user2Pubkey) {
          targets.push(streak.user2Pubkey);
        }

        const abuseLevel = setting?.abuseLevel ?? 1;
        const hoursLeft = Math.round((deadlineMs - now.getTime()) / 3600000);

        for (const target of targets) {
          // Check Redis: already reminded this user for this streak's current window?
          if (await hasReminderBeenSent(streak.id, target, deadlineKey)) {
            continue;
          }

          // Send private DM reminder
          const res = await sendDMReminder(target, streak, abuseLevel, hoursLeft);
          if (res) {
            await markReminderSent(streak.id, target, deadlineKey);

            await db.insert(ReminderLog).values({
              streakId: streak.id,
              targetPubkey: target,
              abuseLevel,
              nostrEventId: res,
            });
            sentCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing reminder for streak ${streak.id}:`, error);
      }
    }

    console.log(
      `Reminder check: ${activeStreaks.length} active streaks, ${sentCount} reminders sent`
    );
  },
  { connection, concurrency: 1 }
);

// ── Streak Check Worker ──
// Runs every 10 minutes. Breaks active streaks whose deadline + grace period has passed.
export const streakCheckWorker = new Worker(
  'streak-checks',
  async (job) => {
    const now = new Date();

    // Only break streaks whose deadline is past the grace period
    const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MS);

    // Find all active streaks whose deadline is past the grace threshold
    const expiredStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(and(eq(Streaks.status, 'active'), lt(Streaks.deadline, graceThreshold)));

    console.log(`Streak check: ${expiredStreaks.length} streaks expired (past grace period)`);

    for (const { streak, setting } of expiredStreaks) {
      try {
        // Record history before breaking
        await db.insert(StreakHistory).values({
          streakId: streak.id,
          countBeforeBreak: streak.currentCount ?? 0,
          startedAt: streak.createdAt ?? new Date(),
          brokenAt: now,
        });

        // Break the streak
        await db
          .update(Streaks)
          .set({
            status: 'broken',
            endedAt: now,
          })
          .where(eq(Streaks.id, streak.id));

        if (streak.type === 'solo') {
          // Check if we already sent a public tag post for this break (dedup by streakId + pubkey only)
          const existingPost = await db
            .select()
            .from(StreakBreakPost)
            .where(
              and(
                eq(StreakBreakPost.streakId, streak.id),
                eq(StreakBreakPost.pubkey, streak.user1Pubkey)
              )
            )
            .limit(1);

          if (existingPost.length > 0) {
            console.log(
              `Already sent public tag post for ${streak.user1Pubkey} for streak ${streak.id} break, skipping`
            );
            continue;
          }

          if (setting?.abuseLevel === 0) {
            continue;
          }
          const res = await sendPublicTagPost(streak.user1Pubkey, streak, setting?.abuseLevel ?? 1);
          if (res) {
            await db.insert(StreakBreakPost).values({
              streakId: streak.id,
              pubkey: streak.user1Pubkey,
              abuseLevel: setting?.abuseLevel ?? 1,
              eventId: res,
            });
          }
        }

        if (streak.type === 'duo') {
          // Notify both duo partners their streak broke
          const duoTargets = [streak.user1Pubkey, streak.user2Pubkey].filter(Boolean) as string[];
          const deadlineKey = streak.deadline ? new Date(streak.deadline).toISOString() : '';

          for (const target of duoTargets) {
            if (await hasReminderBeenSent(streak.id, target, `break:${deadlineKey}`)) {
              continue;
            }

            const res = await sendDMReminder(target, streak, setting?.abuseLevel ?? 1, 0);
            if (res) {
              await markReminderSent(streak.id, target, `break:${deadlineKey}`);
              await db.insert(ReminderLog).values({
                streakId: streak.id,
                targetPubkey: target,
                abuseLevel: setting?.abuseLevel ?? 1,
                nostrEventId: res,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing expired streak ${streak.id}:`, error);
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
    { pattern: '*/15 * * * *' }, // every 15 minutes — per-streak reminder offset
    { name: 'check-reminders' }
  );

  await streakCheckQueue.upsertJobScheduler(
    'streak-check',
    { pattern: '*/10 * * * *' }, // every 10 minutes — catches expired deadlines faster
    { name: 'check-broken-streaks' }
  );

  console.log('Recurring jobs scheduled (reminders: 15min, streak-check: 10min)');
}
