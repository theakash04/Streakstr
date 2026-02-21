import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { db } from './db/index.ts';
import { sql } from 'drizzle-orm';
import redis from './config/redis.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';
import swagger from '@fastify/swagger';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import swaggerUi from '@fastify/swagger-ui';
import { streakRoutes } from './modules/streak/streak.routes.ts';
import { publicRoutes } from './modules/public/public.routes.ts';

useWebSocketImplementation(WebSocket);

const PORT = process.env.PORT || 8000;

const fastify = Fastify({ logger: true });

// Set Zod schema validator and serializer
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(cors, {
  origin: process.env.CORS?.split(',').map((s) => s.trim()) || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});
await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'streakstr-dev-secret-change-in-production',
});

fastify.register(swagger, {
  transform: jsonSchemaTransform,
  openapi: {
    info: {
      title: 'streakstr api',
      description: 'API documentation for streakstr',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        cookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session_id',
        },
      },
    },
  },
});

// Register auth routes
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(streakRoutes, { prefix: '/streaks' });
await fastify.register(publicRoutes, { prefix: '/public' });

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  theme: {
    title: 'streakstr API Docs',
    css: [{ filename: 'theme.css', content: '.swagger-ui .topbar { display: none; }' }],
  },
});

fastify.get(
  '/health',
  {
    schema: {
      tags: ['Health'],
    },
  },
  async (_request, _reply) => {
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
  }
);

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
