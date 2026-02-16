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
import { and, eq } from 'drizzle-orm';
import { reminderQueue, streakCheckQueue } from './queue.ts';
import { sendDMReminder, sendPublicTagPost } from '../utils/Nostr/nostrPublisher.ts';
import { getTrackedPubkeys } from './index.ts';
import { refreshInteractionSubscriptions } from '../utils/Nostr/relaySubscriptionManager.ts';

// workers
export const reminderWorker = new Worker(
  'reminders',
  async (job) => {
    const activeStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(eq(Streaks.status, 'active'));

    const today = new Date().toISOString().split('T')[0];

    for (const { streak, setting } of activeStreaks) {
      const [todayLog] = await db
        .select()
        .from(DailyLogs)
        .where(and(eq(DailyLogs.streakId, streak.id), eq(DailyLogs.date, today)));

      const isIncomplete =
        !todayLog ||
        (streak.type === 'solo' && !todayLog.user1Completed) ||
        (streak.type === 'duo' && (!todayLog.user1Completed || !todayLog.user2Completed));

      if (!isIncomplete) continue;

      // determine who needs a reminder
      const targets: string[] = [];
      if (!todayLog?.user1Completed) targets.push(streak.user1Pubkey);
      if (streak.type === 'duo' && streak.user2Pubkey && !todayLog?.user2Completed) {
        targets.push(streak.user2Pubkey);
      }

      const abuseLevel = setting?.abuseLevel ?? 0;

      for (const target of targets) {
        // send private dm reminder using bot account
        if (setting?.dmReminder !== false) {
          // check if we already sent a reminder today to avoid spamming
          const existingReminder = await db
            .select()
            .from(ReminderLog)
            .where(
              and(
                eq(ReminderLog.streakId, streak.id),
                eq(ReminderLog.targetPubkey, target),
                eq(ReminderLog.sentAt, new Date(today))
              )
            )
            .limit(1);
          if (existingReminder.length > 0) {
            console.log(
              `Already sent reminder to ${target} for streak ${streak.id} today, skipping`
            );
            continue;
          }
          const res = await sendDMReminder(target, streak, abuseLevel ?? 3);
          if (res) {
            await db.insert(ReminderLog).values({
              streakId: streak.id,
              targetPubkey: target,
              abuseLevel,
              nostrEventId: res,
            });
          }
        }
      }
    }
  },
  { connection }
);

export const streakCheckWorker = new Worker(
  'streak-checks',
  async (job) => {
    const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0];

    const activeStreaks = await db
      .select({ streak: Streaks, setting: StreakSettings })
      .from(Streaks)
      .leftJoin(StreakSettings, eq(StreakSettings.streakId, Streaks.id))
      .where(eq(Streaks.status, 'active'));

    for (const { streak, setting } of activeStreaks) {
      const [yesterdayLog] = await db
        .select()
        .from(DailyLogs)
        .where(and(eq(DailyLogs.streakId, streak.id), eq(DailyLogs.date, yesterday)));

      const wasMissed = !yesterdayLog || !yesterdayLog.completedAt;

      if (wasMissed) {
        await db.insert(StreakHistory).values({
          streakId: streak.id,
          countBeforeBreak: streak.currentCount ?? 0,
          startedAt: streak.createdAt ?? new Date(),
          brokenAt: new Date(),
        });

        // break the streak
        await db
          .update(Streaks)
          .set({
            status: 'broken',
            endedAt: new Date(),
          })
          .where(eq(Streaks.id, streak.id));

        if (streak.type === 'solo') {
          // check if we already sent a public tag post for this break to avoid spamming
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
          if (setting?.dmReminder !== false) {
            const today = new Date().toISOString().split('T')[0];
            if (streak.user1Pubkey) {
              // check if we already sent a reminder today to avoid spamming
              const existingReminder = await db
                .select()
                .from(ReminderLog)
                .where(
                  and(
                    eq(ReminderLog.streakId, streak.id),
                    eq(ReminderLog.targetPubkey, streak.user1Pubkey),
                    eq(ReminderLog.sentAt, new Date(today))
                  )
                )
                .limit(1);
              if (existingReminder.length > 0) {
                console.log(
                  `Already sent reminder to ${streak.user1Pubkey} for streak ${streak.id} today, skipping`
                );
                continue;
              }
              const res = await sendDMReminder(
                streak.user1Pubkey,
                streak,
                setting?.abuseLevel ?? 3
              );
              if (res) {
                await db.insert(ReminderLog).values({
                  streakId: streak.id,
                  targetPubkey: streak.user1Pubkey,
                  abuseLevel: setting?.abuseLevel ?? 3,
                  nostrEventId: res,
                });
              }
            }
            if (streak.user2Pubkey) {
              // check if we already sent a reminder today to avoid spamming
              const existingReminder = await db
                .select()
                .from(ReminderLog)
                .where(
                  and(
                    eq(ReminderLog.streakId, streak.id),
                    eq(ReminderLog.targetPubkey, streak.user2Pubkey),
                    eq(ReminderLog.sentAt, new Date(today))
                  )
                )
                .limit(1);
              if (existingReminder.length > 0) {
                console.log(
                  `Already sent reminder to ${streak.user2Pubkey} for streak ${streak.id} today, skipping`
                );
                continue;
              }
              const res = await sendDMReminder(
                streak.user2Pubkey,
                streak,
                setting?.abuseLevel ?? 3
              );
              if (res) {
                await db.insert(ReminderLog).values({
                  streakId: streak.id,
                  targetPubkey: streak.user2Pubkey,
                  abuseLevel: setting?.abuseLevel ?? 3,
                  nostrEventId: res,
                });
              }
            }
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
    { pattern: '0 */3 * * *' }, // every 3 hours
    { name: 'check-reminders' }
  );

  await streakCheckQueue.upsertJobScheduler(
    'daily-streak-check',
    { pattern: '0 */5 * * *' }, // check every 5 hours to ensure we catch any missed checks
    { name: 'check-broken-streaks' }
  );

  console.log('Recurring jobs scheduled');
}
