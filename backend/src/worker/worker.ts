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

// ── Reminder Worker ──
// Runs every hour. Finds streaks whose deadline is 2-4 hours away and sends reminders.
export const reminderWorker = new Worker(
  'reminders',
  async (job) => {
    const now = new Date();

    // Find active streaks where deadline is 2-4 hours from now
    // i.e., deadline > now + 2hrs AND deadline <= now + 4hrs
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const activeStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(
        and(
          eq(Streaks.status, 'active'),
          gt(Streaks.deadline, twoHoursFromNow),
          lte(Streaks.deadline, fourHoursFromNow)
        )
      );

    console.log(
      `Reminder check: ${activeStreaks.length} streaks have deadlines in 2-4 hours`
    );

    for (const { streak, setting } of activeStreaks) {
      if (setting?.dmReminder === false) continue;

      // Use deadline ISO as the dedup window key
      const deadlineKey = streak.deadline ? new Date(streak.deadline).toISOString() : '';

      // Determine who needs a reminder (for duo, both users; for solo, user1)
      const targets: string[] = [streak.user1Pubkey];
      if (streak.type === 'duo' && streak.user2Pubkey) {
        targets.push(streak.user2Pubkey);
      }

      const abuseLevel = setting?.abuseLevel ?? 0;
      const hoursLeft = streak.deadline
        ? Math.round((new Date(streak.deadline).getTime() - now.getTime()) / 3600000)
        : 0;

      for (const target of targets) {
        // Check Redis: already reminded this user for this streak's current window?
        if (await hasReminderBeenSent(streak.id, target, deadlineKey)) {
          console.log(
            `Already sent reminder to ${target} for streak ${streak.id} (deadline ${deadlineKey}), skipping`
          );
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
        }
      }
    }
  },
  { connection }
);

// ── Streak Check Worker ──
// Runs every hour. Finds active streaks whose deadline has passed → breaks them.
export const streakCheckWorker = new Worker(
  'streak-checks',
  async (job) => {
    const now = new Date();

    // Find all active streaks whose deadline is in the past
    const expiredStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(
        and(
          eq(Streaks.status, 'active'),
          lt(Streaks.deadline, now)
        )
      );

    console.log(`Streak check: ${expiredStreaks.length} streaks have expired deadlines`);

    for (const { streak, setting } of expiredStreaks) {
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
        // Check if we already sent a public tag post for this break
        const existingPost = await db
          .select()
          .from(StreakBreakPost)
          .where(
            and(
              eq(StreakBreakPost.streakId, streak.id),
              eq(StreakBreakPost.pubkey, streak.user1Pubkey),
              eq(StreakBreakPost.abuseLevel, setting?.abuseLevel ?? 3)
            )
          )
          .limit(1);

        if (existingPost.length > 0) {
          console.log(
            `Already sent public tag post for ${streak.user1Pubkey} for streak ${streak.id} break, skipping`
          );
          continue;
        }

        const res = await sendPublicTagPost(streak.user1Pubkey, streak, setting?.abuseLevel ?? 3);
        if (res) {
          await db.insert(StreakBreakPost).values({
            streakId: streak.id,
            pubkey: streak.user1Pubkey,
            abuseLevel: setting?.abuseLevel ?? 3,
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

          const res = await sendDMReminder(target, streak, setting?.abuseLevel ?? 3, 0);
          if (res) {
            await markReminderSent(streak.id, target, `break:${deadlineKey}`);
            await db.insert(ReminderLog).values({
              streakId: streak.id,
              targetPubkey: target,
              abuseLevel: setting?.abuseLevel ?? 3,
              nostrEventId: res,
            });
          }
        }
      }
    }
  },
  { connection }
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

export async function scheduleRecurringJobs(): Promise<void> {
  await reminderQueue.upsertJobScheduler(
    'hourly-reminders',
    { pattern: '0 * * * *' }, // every hour — checks deadline proximity per streak
    { name: 'check-reminders' }
  );

  await streakCheckQueue.upsertJobScheduler(
    'hourly-streak-check',
    { pattern: '30 * * * *' }, // every hour at :30 — catches expired deadlines
    { name: 'check-broken-streaks' }
  );

  console.log('Recurring jobs scheduled');
}
