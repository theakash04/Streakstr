import type { FastifyReply, FastifyRequest } from 'fastify';

export async function getAllStreaks(req: FastifyRequest, reply: FastifyReply) {
  reply.status(200).send({ message: 'Get all streaks - not implemented yet' });
}
