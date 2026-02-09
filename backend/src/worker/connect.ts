import { Redis } from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST!,
  password: process.env.REDIS_PASS!,
  port: Number(process.env.REDIS_PORT!),
  maxRetriesPerRequest: null,
});

export default connection;
