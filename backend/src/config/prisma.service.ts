import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly circuitBreaker: CircuitBreaker;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    this.circuitBreaker = new CircuitBreaker('prisma-database', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000, // 30 seconds
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
    // Note: beforeExit hook removed - not supported in Prisma 5.x
    // Cleanup is handled by onModuleDestroy() lifecycle hook
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma client disconnected');
  }

  private async connectWithRetry(): Promise<void> {
    while (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.$connect();
          this.logger.log('Database connected successfully');
          this.reconnectAttempts = 0; // Reset on success
        });
        return;
      } catch (error) {
        this.reconnectAttempts++;
        this.logger.error(
          `Database connection failed (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}):`,
          error.message,
        );

        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
          this.logger.error('Max reconnection attempts reached. Service will continue without database.');
          // Don't throw - let the service start in degraded mode
          return;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.RECONNECT_DELAY));
      }
    }
  }

  // Wrapper for safe query execution with circuit breaker
  async executeQuery<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await this.circuitBreaker.execute(query);
    } catch (error) {
      this.logger.error('Query execution failed:', error);

      // Attempt to reconnect if connection was lost
      if (error.message?.includes('connection')) {
        this.logger.warn('Attempting to reconnect to database...');
        this.reconnectAttempts = 0;
        await this.connectWithRetry();
      }

      throw error;
    }
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getMetrics();
  }
}
