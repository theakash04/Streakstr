import { z } from 'zod';

// Hex pubkey validation (64 chars, lowercase hex)
export const hexPubkeySchema = z
  .string()
  .length(64)
  .regex(/^[0-9a-f]+$/, 'Invalid hex pubkey');

// Challenge request schema
export const challengeRequestSchema = z.object({
  pubkey: hexPubkeySchema,
});

// Nostr event schema for verification (kind 22242)
export const nostrEventSchema = z.object({
  id: z.string().length(64),
  pubkey: hexPubkeySchema,
  created_at: z.number().int().positive(),
  kind: z.literal(22242),
  tags: z.array(z.array(z.string())),
  content: z.string(),
  sig: z
    .string()
    .length(128)
    .regex(/^[0-9a-f]+$/, 'Invalid signature'),
});

// Verify request schema
export const verifyRequestSchema = z.object({
  signedEvent: nostrEventSchema,
});

// Response schemas
export const challengeResponseSchema = z.object({
  challenge: z.string(),
  expiresAt: z.number(),
});

export const verifyResponseSchema = z.object({
  success: z.boolean(),
  pubkey: hexPubkeySchema,
  expiresAt: z.number(),
});

// Type exports
export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;
export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
export type NostrEvent = z.infer<typeof nostrEventSchema>;
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
