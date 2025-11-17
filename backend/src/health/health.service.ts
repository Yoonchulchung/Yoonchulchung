import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { RedisService } from '../config/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check() {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();

    const isHealthy = database.healthy && redis.healthy;

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
      },
    };
  }

  async checkReadiness() {
    try {
      await this.checkDatabase();
      await this.checkRedis();
      return { status: 'ready' };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw error;
    }
  }

  checkLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true, message: 'Database connection is healthy' };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { healthy: false, message: 'Database connection failed', error: error.message };
    }
  }

  private async checkRedis() {
    try {
      await this.redis.getClient().ping();
      return { healthy: true, message: 'Redis connection is healthy' };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { healthy: false, message: 'Redis connection failed', error: error.message };
    }
  }
}
