import type { NostrEvent } from 'nostr-tools';
import { nip04, nip19, nip44 } from 'nostr-tools';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { BotFollower, DailyLogs, Logs, Streaks, StreakSettings } from '../../db/schema.ts';
import { sendDMReminder, sendNip17DM } from './nostrPublisher.ts';
import { notifyWorkerToRefresh } from '../notifyWorker.ts';
import {
  getActiveStreaksForPubkey,
  invalidateActiveStreaksForStreak,
  invalidateAllForPubkey,
  isWindowCompleted,
  markWindowCompleted,
  getBotFollowerStatus,
  invalidateBotFollower,
  getSoloStreaksForPubkey,
} from '../../config/cache.ts';

// Get bot secret key for decrypting DMs
const { type: keyType, data: botSk } = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
if (keyType !== 'nsec') {
  throw new Error('NOSTR_BOT_SECRET_KEY must be an nsec key');
}

/**
 * Check if an event is a direct interaction WITH a specific pubkey.
 * Returns true if the event tags the target pubkey (reply, react, repost, mention).
 */
function isInteractionWith(event: NostrEvent, targetPubkey: string): boolean {
  return event.tags.some((tag) => tag[0] === 'p' && tag[1] === targetPubkey);
}

/**
 * Process an interaction event (note, reaction, repost).
 * Uses a rolling 24hr window: each streak has a `deadline`.
 * When activity completes a window → count increments, deadline resets to now + 24hrs.
 */
export async function processInteractionEvent(event: NostrEvent): Promise<void> {
  const pubkey = event.pubkey;
  const now = new Date();

  // Find all active streaks involving this pubkey (cached)
  const streaks = await getActiveStreaksForPubkey(pubkey);

  for (const streak of streaks) {
    // If the deadline has already passed, skip — streakCheckWorker will break it
    if (streak.deadline && new Date(streak.deadline) < now) {
      continue;
    }

    // Use the deadline ISO string as the window key for caching
    const windowKey = streak.deadline ? new Date(streak.deadline).toISOString() : 'initial';

    const completed = await isWindowCompleted(streak.id, windowKey);
    if (completed) {
      continue;
    }

    if (streak.type === 'solo') {
      const isUser1 = streak.user1Pubkey === pubkey;
      if (!isUser1) continue; // For solo streaks, only user1 is tracked

      await db
        .insert(DailyLogs)
        .values({
          streakId: streak.id,
          date: new Date().toISOString().split('T')[0],
          user1Completed: true,
          user1EventId: event.id,
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [DailyLogs.streakId, DailyLogs.date],
          set: {
            user1Completed: true,
            user1EventId: event.id,
            completedAt: new Date(),
          },
        });

      await db
        .update(Streaks)
        .set({
          currentCount: (streak.currentCount ?? 0) + 1,
          highestCount: Math.max(streak.highestCount ?? 0, (streak.currentCount ?? 0) + 1),
          lastActivityAt: new Date(),
          deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        })
        .where(eq(Streaks.id, streak.id));

      await markWindowCompleted(streak.id, windowKey);
      await invalidateAllForPubkey(pubkey);
    } else if (streak.type === 'duo') {
      const isUser1 = streak.user1Pubkey === pubkey;
      const isUser2 = streak.user2Pubkey === pubkey;
      const otherPubkey = isUser1 ? streak.user2Pubkey : isUser2 ? streak.user1Pubkey : null;
      if (!otherPubkey) continue;
      const taggedPubkeys = event.tags.filter((t) => t[0] === 'p').map((t) => t[1]);

      if (!isInteractionWith(event, otherPubkey)) {
        continue;
      }

      const today = new Date().toISOString().split('T')[0];

      if (isUser1) {
        await db
          .insert(DailyLogs)
          .values({
            streakId: streak.id,
            date: today,
            user1Completed: true,
            user1EventId: event.id,
          })
          .onConflictDoUpdate({
            target: [DailyLogs.streakId, DailyLogs.date],
            set: { user1Completed: true, user1EventId: event.id },
          });
      } else if (isUser2) {
        await db
          .insert(DailyLogs)
          .values({
            streakId: streak.id,
            date: today,
            user2Completed: true,
            user2EventId: event.id,
          })
          .onConflictDoUpdate({
            target: [DailyLogs.streakId, DailyLogs.date],
            set: { user2Completed: true, user2EventId: event.id },
          });
      }

      // Check if BOTH sides have now interacted
      const [log] = await db
        .select()
        .from(DailyLogs)
        .where(and(eq(DailyLogs.streakId, streak.id), eq(DailyLogs.date, today)));

      if (log?.user1Completed && log?.user2Completed) {
        // Both interacted with each other → streak complete!
        await db.update(DailyLogs).set({ completedAt: new Date() }).where(eq(DailyLogs.id, log.id));

        await db
          .update(Streaks)
          .set({
            currentCount: (streak.currentCount ?? 0) + 1,
            highestCount: Math.max(streak.highestCount ?? 0, (streak.currentCount ?? 0) + 1),
            lastActivityAt: new Date(),
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })
          .where(eq(Streaks.id, streak.id));

        await markWindowCompleted(streak.id, windowKey);
        await invalidateAllForPubkey(streak.user1Pubkey);
        await invalidateAllForPubkey(streak.user2Pubkey!);
      } else {
        console.log(
          `Duo streak "${streak.name}": ${isUser1 ? 'User1' : 'User2'} interacted with partner. ` +
            `Waiting for ${isUser1 ? 'User2' : 'User1'}.`
        );
      }
    }
  }
}

/**
 * Process a follow event on the bot account.
 * Auto-creates a solo streak with default settings.
 */
export async function processFollowEvent(event: NostrEvent): Promise<void> {
  const pubkey = event.pubkey;

  // Check follower status from cache first
  const followerStatus = await getBotFollowerStatus(pubkey);

  if (followerStatus.autoStreakCreated) {
    return;
  }

  if (followerStatus.doNotKeepStreak) {
    console.log(`Skipping auto-streak for ${pubkey} — user opted out (doNotKeepStreak)`);
    return;
  }

  // Record the follower
  await db
    .insert(BotFollower)
    .values({ pubkey, autoStreakCreated: true })
    .onConflictDoUpdate({
      target: BotFollower.pubkey,
      set: { autoStreakCreated: true },
    });

  // Create a default solo streak with 24hr rolling window
  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [streak] = await db
    .insert(Streaks)
    .values({
      type: 'solo',
      name: 'Daily Nostr Activity',
      user1Pubkey: pubkey,
      status: 'active',
      startedAt: now,
      deadline,
    })
    .returning();

  await db.insert(StreakSettings).values({
    streakId: streak.id,
    dmReminder: true,
  });

  // send dm to the new follower that the streak is created
  await sendNip17DM(
    pubkey,
    `Welcome to Streakstr! 🔥 A solo streak "Daily Nostr Activity" has been created for you.\n\n` +
      `You have 24 hours to post on Nostr to keep your streak alive! Your first deadline is ${deadline.toUTCString()}.\n\n` +
      `Customize your settings at https://streakstr.akashtwt.in\n\n` +
      `This was created because you followed our bot account.`
  );

  // Invalidate caches for this pubkey
  await invalidateAllForPubkey(pubkey);

  await notifyWorkerToRefresh();
}

/**
 * Unwrap a NIP-17 Gift Wrap (Kind 1059) → Seal (Kind 13) → Rumor (Kind 14)
 * Returns the real sender pubkey and plaintext content.
 */
function unwrapGiftWrap(event: NostrEvent): { senderPubkey: string; content: string } | null {
  try {
    // Step 1: Decrypt Gift Wrap → Seal
    const giftWrapConvoKey = nip44.v2.utils.getConversationKey(botSk as Uint8Array, event.pubkey);
    const sealJson = nip44.v2.decrypt(event.content, giftWrapConvoKey);
    const seal = JSON.parse(sealJson);

    // Step 2: Decrypt Seal → Rumor
    const sealConvoKey = nip44.v2.utils.getConversationKey(botSk as Uint8Array, seal.pubkey);
    const rumorJson = nip44.v2.decrypt(seal.content, sealConvoKey);
    const rumor = JSON.parse(rumorJson);

    return {
      senderPubkey: rumor.pubkey,
      content: rumor.content,
    };
  } catch (error) {
    console.error('Failed to unwrap gift wrap:', error);
    return null;
  }
}

/**
 * Decrypt a NIP-04 legacy DM (kind 4)
 */
async function decryptNip04DM(
  event: NostrEvent
): Promise<{ senderPubkey: string; content: string } | null> {
  try {
    const senderPubkey = event.pubkey;
    const plaintext = await nip04.decrypt(botSk as Uint8Array, senderPubkey, event.content);

    return {
      senderPubkey,
      content: plaintext,
    };
  } catch (error) {
    console.error('Failed to decrypt NIP-04 DM:', error);
    return null;
  }
}

/**
 * Process a DM sent to the bot.
 * Commands:
 *   stop  → Delete active streaks, set doNotKeepStreak = true
 *   stats → Reply with current solo streak info
 *   start → Start tracking solo streak if not already (might be used for user who stop then want to start it will create a new)
 *   anything else → Generic promo reply
 */
export async function processBotDMReply(event: NostrEvent): Promise<void> {
  let unwrapped: { senderPubkey: string; content: string } | null = null;
  if (event.kind === 1059) {
    unwrapped = unwrapGiftWrap(event);
  } else if (event.kind === 4) {
    unwrapped = await decryptNip04DM(event);
  } else {
    console.warn(`Received unsupported DM kind ${event.kind} from ${event.pubkey}`);
    return;
  }
  if (!unwrapped) return;

  const { senderPubkey, content } = unwrapped;
  const command = content.trim().toLowerCase();

  if (command === 'start') {
    const soloStreaks = await getSoloStreaksForPubkey(senderPubkey);

    if (soloStreaks.length > 0) {
      await sendNip17DM(
        senderPubkey,
        `You already have an active solo streak. Reply STOP to delete it and start fresh, or visit https://streakstr.akashtwt.in to manage your streaks.`
      );
      return;
    }

    // Create a default solo streak with 24hr rolling window
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [streak] = await db
      .insert(Streaks)
      .values({
        type: 'solo',
        name: 'Daily Nostr Activity',
        user1Pubkey: senderPubkey,
        status: 'active',
        startedAt: now,
        deadline,
      })
      .returning();

    await db.insert(StreakSettings).values({
      streakId: streak.id,
      dmReminder: true,
    });

    await sendNip17DM(
      senderPubkey,
      `A new solo streak "Daily Nostr Activity" has been created for you! 🔥\n\n` +
        `You have 24 hours to post on Nostr. Your first deadline is ${deadline.toUTCString()}.\n\n` +
        `Customize your settings at https://streakstr.akashtwt.in`
    );

    await invalidateAllForPubkey(senderPubkey);
    await notifyWorkerToRefresh();
    return;
  }

  // ── STOP command ──
  if (command === 'stop') {
    // Get active streaks from cache
    const activeStreaks = await getActiveStreaksForPubkey(senderPubkey);
    // Filter to solo only (STOP only affects solo streaks in current logic)
    const soloStreaks = activeStreaks.filter((s) => s.type === 'solo');

    for (const streak of soloStreaks) {
      await db.delete(Streaks).where(eq(Streaks.id, streak.id));

      await db.insert(Logs).values({
        action: 'Manual Streak Stop',
        startedByPubkey: senderPubkey,
        relatedPubkey2: null,
        description: `User sent STOP command via DM. Streak "${streak.name}" (ID: ${streak.id}) is now Deleted.`,
      });
    }

    // Mark user as doNotKeepStreak so auto-follow doesn't recreate
    await db
      .update(BotFollower)
      .set({ doNotKeepStreak: true })
      .where(eq(BotFollower.pubkey, senderPubkey));

    // Invalidate all caches for this user
    await invalidateAllForPubkey(senderPubkey);

    await sendNip17DM(
      senderPubkey,
      `All your streaks have been stopped and removed. \n\n` +
        `We won't auto-create streaks for you anymore.\n` +
        `If you change your mind, visit https://streakstr.akashtwt.in to start again.`
    );

    await notifyWorkerToRefresh();
    return;
  }

  // ── /stats command ──
  if (command === 'stats') {
    // Use cached solo streaks
    const soloStreaks = await getSoloStreaksForPubkey(senderPubkey);

    if (soloStreaks.length === 0) {
      await sendNip17DM(
        senderPubkey,
        `You don't have any solo streaks yet!\n\n` +
          `Follow our bot account or visit https://streakstr.akashtwt.in to create one.`
      );
      return;
    }

    let statsMessage = `Your Solo Streak Stats\n\n`;

    for (const streak of soloStreaks) {
      const deadlineStr = streak.deadline
        ? `${Math.max(0, Math.round((new Date(streak.deadline).getTime() - Date.now()) / 3600000))}h remaining`
        : 'N/A';

      statsMessage +=
        `${streak.name}\n` +
        `   Status: ${streak.status}\n` +
        `   Current: ${streak.currentCount ?? 0} days\n` +
        `   Highest: ${streak.highestCount ?? 0} days\n` +
        `   Deadline: ${deadlineStr}\n` +
        `   Started: ${streak.startedAt ? new Date(streak.startedAt).toLocaleDateString() : 'N/A'}\n\n`;
    }

    statsMessage += `Visit https://streakstr.akashtwt.in for more details!`;

    await sendNip17DM(senderPubkey, statsMessage);
    return;
  }

  // ── Generic reply for anything else ──
  await sendNip17DM(
    senderPubkey,
    `Hey! 👋 I'm the Streakstr bot.\n\n` +
      `Here's what I can do:\n` +
      `  Reply STOP to stop all solo streak tracking\n` +
      `  Reply /stats to see your solo streak info\n\n` +
      `Want to start a streak? Follow this account or visit https://streakstr.akashtwt.in 🔥`
  );
}
