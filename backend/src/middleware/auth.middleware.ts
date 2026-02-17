import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateSession } from '../modules/auth/auth.service.ts';

const SESSION_COOKIE_NAME = 'streakstr_session';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      pubkey: string;
    };
  }
}

/**
 * Authentication middleware
 * Validates the session cookie and attaches user info to request
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  try {
    const result = await validateSession(sessionId);

    if (!result.valid || !result.pubkey) {
      return reply.status(401).send({ error: 'Invalid or expired session' });
    }

    // Attach user to request
    request.user = { pubkey: result.pubkey };
  } catch (error) {
    request.log.error(error, 'Session validation failed');
    return reply.status(500).send({ error: 'Authentication error' });
  }
}
