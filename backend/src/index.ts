import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { db } from './db/index.ts';
import { sql } from 'drizzle-orm';
import redis from './config/redis.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';

const PORT = process.env.PORT || 8000;

const fastify = Fastify({ logger: true });

// Set Zod schema validator and serializer
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'streakstr-dev-secret-change-in-production',
});

// Register auth routes
await fastify.register(authRoutes, { prefix: '/auth' });

fastify.get('/health', async (_request, _reply) => {
  let dbStatus = 'Disconnected';
  let redisStatus;

  try {
    await db.execute(sql`SELECT NOW()`);
    dbStatus = 'Connected';
    const result = await redis.ping();
    redisStatus = result;
  } catch (error) {
    dbStatus = 'Error: ' + (error as Error).message;
    redisStatus = 'Error: ' + (error as Error).message;
  }

  return {
    success: true,
    message: {
      healthStatus: 'Running',
      DBStatus: dbStatus,
      RedisStatus: redisStatus,
    },
  };
});

const start = async () => {
  try {
    await db.execute(sql`SELECT NOW()`);
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
