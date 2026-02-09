import { randomBytes, createHash } from 'node:crypto';
import { schnorr } from '@noble/curves/secp256k1.js';
import redis from '../../config/redis.ts';
import type { NostrEvent } from './auth.schema.ts';

// Constants
const CHALLENGE_TTL = 300; // 5 minutes
const SESSION_TTL = 86400; // 24 hours
const CHALLENGE_PREFIX = 'auth:challenge:';
const SESSION_PREFIX = 'auth:session:';

// Types
interface ChallengeData {
  pubkey: string;
  createdAt: number;
}

interface SessionData {
  pubkey: string;
  createdAt: number;
  lastActive: number;
}

/**
 * Generate a cryptographically secure challenge nonce
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate and store a challenge for a pubkey
 */
export async function generateChallenge(
  pubkey: string
): Promise<{ challenge: string; expiresAt: number }> {
  const challenge = generateNonce();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CHALLENGE_TTL;

  const data: ChallengeData = {
    pubkey,
    createdAt: now,
  };

  await redis.setex(`${CHALLENGE_PREFIX}${challenge}`, CHALLENGE_TTL, JSON.stringify(data));

  return { challenge, expiresAt };
}

/**
 * Retrieve and delete a challenge (single-use)
 */
async function consumeChallenge(challenge: string): Promise<ChallengeData | null> {
  const key = `${CHALLENGE_PREFIX}${challenge}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  // Delete immediately to prevent replay attacks
  await redis.del(key);

  return JSON.parse(data) as ChallengeData;
}

/**
 * Compute the event ID (hash) according to NIP-01
 */
function computeEventId(event: Omit<NostrEvent, 'id' | 'sig'>): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Verify a Nostr event signature using schnorr
 */
function verifySignature(event: NostrEvent): boolean {
  try {
    // Verify the event ID is correctly computed
    const computedId = computeEventId(event);
    if (computedId !== event.id) {
      console.error('Event ID mismatch');
      return false;
    }

    // Verify the schnorr signature
    const signatureBytes = Buffer.from(event.sig, 'hex');
    const messageBytes = Buffer.from(event.id, 'hex');
    const pubkeyBytes = Buffer.from(event.pubkey, 'hex');

    return schnorr.verify(signatureBytes, messageBytes, pubkeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Extract challenge from event tags
 */
function extractChallengeFromEvent(event: NostrEvent): string | null {
  const challengeTag = event.tags.find((tag) => tag[0] === 'challenge');
  return challengeTag?.[1] ?? null;
}

/**
 * Verify a signed authentication event
 */
export async function verifyAuthEvent(
  event: NostrEvent
): Promise<{ valid: boolean; pubkey?: string; error?: string }> {
  // 1. Verify event kind
  if (event.kind !== 22242) {
    return { valid: false, error: 'Invalid event kind' };
  }

  // 2. Verify signature
  if (!verifySignature(event)) {
    return { valid: false, error: 'Invalid signature' };
  }

  // 3. Extract and validate challenge from tags
  const challenge = extractChallengeFromEvent(event);
  if (!challenge) {
    return { valid: false, error: 'Challenge tag missing' };
  }

  // 4. Consume challenge (single-use)
  const challengeData = await consumeChallenge(challenge);
  if (!challengeData) {
    return { valid: false, error: 'Challenge not found or expired' };
  }

  // 5. Verify pubkey matches challenge
  if (challengeData.pubkey !== event.pubkey) {
    return { valid: false, error: 'Pubkey mismatch' };
  }

  // 6. Verify event timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const eventAge = now - event.created_at;
  if (eventAge > CHALLENGE_TTL || eventAge < -60) {
    return { valid: false, error: 'Event timestamp out of range' };
  }

  return { valid: true, pubkey: event.pubkey };
}

/**
 * Create a new session for a verified user
 */
export async function createSession(
  pubkey: string
): Promise<{ sessionId: string; expiresAt: number }> {
  const sessionId = generateNonce();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL;

  const data: SessionData = {
    pubkey,
    createdAt: now,
    lastActive: now,
  };

  await redis.setex(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL, JSON.stringify(data));

  return { sessionId, expiresAt };
}

/**
 * Validate an existing session
 */
export async function validateSession(
  sessionId: string
): Promise<{ valid: boolean; pubkey?: string }> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.get(key);

  if (!data) {
    return { valid: false };
  }

  const session = JSON.parse(data) as SessionData;

  // Update last active time (sliding expiration)
  session.lastActive = Math.floor(Date.now() / 1000);
  await redis.setex(key, SESSION_TTL, JSON.stringify(session));

  return { valid: true, pubkey: session.pubkey };
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}
