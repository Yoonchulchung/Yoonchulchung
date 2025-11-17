import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;
  private readonly MAX_RETRY_ATTEMPTS = 10;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => {
        if (times > this.MAX_RETRY_ATTEMPTS) {
          this.logger.error('Redis max retry attempts reached. Stopping reconnection.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis reconnecting... Attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      keepAlive: 30000,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY errors
        }
        return false;
      },
    });

    // Enhanced event handlers for better monitoring
    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis is ready to accept commands');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay) => {
      this.logger.log(`Redis reconnecting in ${delay}ms...`);
    });

    this.client.on('end', () => {
      this.logger.warn('Redis connection ended - no more reconnections will be attempted');
      this.isConnected = false;
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}: ${error.message}`);
      // Return null on error instead of crashing
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}: ${error.message}`);
      // Don't throw - let the application continue
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      // Don't throw - let the application continue
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}: ${error.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis PING error: ${error.message}`);
      return false;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from Redis...');
    try {
      await this.client.quit();
      this.logger.log('Redis disconnected gracefully');
    } catch (error) {
      this.logger.error(`Error during Redis shutdown: ${error.message}`);
      this.client.disconnect();
    }
  }
}
