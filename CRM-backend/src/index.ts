import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
const PORT = process.env.PORT || 8000;

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: '*' });

fastify.get('/', async (_request, _reply) => {
  return { message: 'Hello from Node + TypeScript with Fastify!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(\`Server running on http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
