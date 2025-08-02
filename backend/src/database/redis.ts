import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export const initRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const cache = {
  get: async (key: string) => {
    const client = getRedisClient();
    return await client.get(key);
  },
  
  set: async (key: string, value: string, ttl?: number) => {
    const client = getRedisClient();
    if (ttl) {
      return await client.setEx(key, ttl, value);
    }
    return await client.set(key, value);
  },
  
  del: async (key: string) => {
    const client = getRedisClient();
    return await client.del(key);
  },
  
  exists: async (key: string) => {
    const client = getRedisClient();
    return await client.exists(key);
  }
};

export default cache; 