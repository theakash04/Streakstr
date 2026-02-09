import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  generateChallenge,
  verifyAuthEvent,
  createSession,
  revokeSession,
} from './auth.service.ts';
import type { ChallengeRequest, VerifyRequest } from './auth.schema.ts';
import { getUserFromRelays } from '../../config/relay.ts';

const SESSION_COOKIE_NAME = 'streakstr_session';
const SESSION_MAX_AGE = 86400;

export async function challengeHandler(
  request: FastifyRequest<{ Body: ChallengeRequest }>,
  reply: FastifyReply
) {
  const { pubkey } = request.body;

  try {
    const { challenge, expiresAt } = await generateChallenge(pubkey);

    return reply.status(200).send({
      challenge,
      expiresAt,
    });
  } catch (error) {
    request.log.error(error, 'Failed to generate challenge');
    return reply.status(500).send({ error: 'Failed to generate challenge' });
  }
}

export async function verifyHandler(
  request: FastifyRequest<{ Body: VerifyRequest }>,
  reply: FastifyReply
) {
  const { signedEvent } = request.body;

  try {
    // Verify the signed event
    const result = await verifyAuthEvent(signedEvent);

    if (!result.valid || !result.pubkey) {
      return reply.status(401).send({ error: result.error || 'Authentication failed' });
    }

    // Create session
    const { sessionId, expiresAt } = await createSession(result.pubkey);

    // Set httpOnly cookie
    reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return reply.status(200).send({
      success: true,
      pubkey: result.pubkey,
      expiresAt,
    });
  } catch (error) {
    request.log.error(error, 'Failed to verify authentication');
    return reply.status(500).send({ error: 'Authentication verification failed' });
  }
}

/**
 * POST /auth/logout
 * Revoke the current session
 */
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies[SESSION_COOKIE_NAME];

  if (sessionId) {
    try {
      await revokeSession(sessionId);
    } catch (error) {
      request.log.error(error, 'Failed to revoke session');
    }
  }

  // Clear the cookie
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

  return reply.status(200).send({ success: true });
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as FastifyRequest & { user?: { pubkey: string } }).user;

  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  let nostrUser = null;
  try {
    const nostrUserContent = await getUserFromRelays(user.pubkey);
    nostrUser = nostrUserContent ? JSON.parse(nostrUserContent) : null;
  } catch (error) {
    request.log.error(error, 'Failed to fetch user from relays');
  }

  return reply.status(200).send({
    pubkey: user.pubkey,
    user: nostrUser,
    authenticated: true,
  });
}
