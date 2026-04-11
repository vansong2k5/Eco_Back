import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

const RedisProvider = {
  provide: 'REDIS',
  useFactory: () => {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    client.on('error', (err) => console.error('Redis error:', err));
    return client;
  },
};

@Global()
@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule {}
