import { nip04, nip19, nip44, SimplePool } from 'nostr-tools';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import { hexToBytes } from 'nostr-tools/utils';
import { Streaks } from '../../db/schema.ts';
import { RELAY_URLS } from '../../config/relay.ts';
import { generateAbuseMessage } from '../AiRandMsg.ts';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool({ enablePing: true, enableReconnect: true });
const decoded = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
if (decoded.type !== 'nsec') {
  throw new Error('Invalid Nostr bot secret key');
}
const botSk: Uint8Array = decoded.data;

type Streak = typeof Streaks.$inferSelect;

export async function sendDMReminder(
  targetPubkey: string,
  streak: Streak,
  abuseLevel: number,
  hoursLeft: number = 0
): Promise<string | null> {
  try {
    const timeWarning =
      hoursLeft > 0
        ? `Your streak expires in ~${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}! Post something on Nostr to keep it alive! 📝`
        : `Your streak has expired! 💀`;

    const message =
      `${await generateAbuseMessage(abuseLevel, { currentCount: streak.currentCount ?? 0, streakName: streak.name }, 'dm')}\n\n` +
      `Streak: "${streak.name}" — Day ${streak.currentCount ?? 0}\n` +
      timeWarning;

    return sendNip17DM(targetPubkey, message);
  } catch (error) {
    console.error(`Error sending DM reminder to ${targetPubkey}:`, error);
    return null;
  }
}

export const sendPublicTagPost = async (
  targetPubkey: string,
  streak: Streak,
  abuseLevel: number
): Promise<string | null> => {
  try {
    const npub = nip19.npubEncode(targetPubkey);
    const message = `${await generateAbuseMessage(abuseLevel, { currentCount: streak.currentCount ?? 0, streakName: streak.name }, 'post')}\n\nStreak: "${streak.name}" - Day ${streak.currentCount ?? 0}\n\nnostr:${npub}`;
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', targetPubkey]],
        content: message,
      },
      botSk
    );

    await Promise.all(pool.publish(RELAY_URLS, event));
    return event.id;
  } catch (error) {
    console.error(`Error sending public tag post for ${targetPubkey}:`, error);
    return null;
  }
};

export async function sendNip17DM(targetPubkey: string, message: string): Promise<string | null> {
  try {
    const rumor = {
      kind: 14,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', targetPubkey]],
      content: message,
      pubkey: getPublicKey(botSk),
    };

    const conversationKey = nip44.v2.utils.getConversationKey(botSk, targetPubkey);
    const encryptedRumor = nip44.v2.encrypt(JSON.stringify(rumor), conversationKey);

    const seal = finalizeEvent(
      {
        kind: 13,
        created_at: randomTimeOffset(),
        tags: [],
        content: encryptedRumor,
      },
      botSk
    );

    const randomSk = generateSecretKey();
    const giftWrapConvoKey = nip44.v2.utils.getConversationKey(randomSk, targetPubkey);
    const encryptedSeal = nip44.v2.encrypt(JSON.stringify(seal), giftWrapConvoKey);

    const giftWrap = finalizeEvent(
      {
        kind: 1059,
        created_at: randomTimeOffset(),
        tags: [['p', targetPubkey]],
        content: encryptedSeal,
      },
      randomSk
    );

    await Promise.any(pool.publish(RELAY_URLS, giftWrap));
    console.log(`NIP-17 DM sent to ${targetPubkey}`);
    return giftWrap.id;
  } catch (error) {
    console.error(`Failed to send NIP-17 DM:`, error);
    return null;
  }
}

/**
 * Randomize timestamp by ±2 days to hide metadata
 */
function randomTimeOffset(): number {
  const twoDays = 2 * 24 * 60 * 60;
  const offset = Math.floor(Math.random() * twoDays) - twoDays;
  return Math.floor(Date.now() / 1000) + offset;
}
