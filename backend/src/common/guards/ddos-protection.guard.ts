import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class DDoSProtectionGuard implements CanActivate {
  private readonly WINDOW_SIZE = 60; // 1 minute
  private readonly MAX_REQUESTS = 100; // Max requests per window
  private readonly BLOCK_DURATION = 300; // 5 minutes block

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);

    // Check if IP is blocked
    const isBlocked = await this.redisService.get(`blocked:${ip}`);
    if (isBlocked) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check request count
    const key = `ddos:${ip}`;
    const requests = await this.redisService.getClient().incr(key);

    if (requests === 1) {
      // Set expiration on first request
      await this.redisService.getClient().expire(key, this.WINDOW_SIZE);
    }

    if (requests > this.MAX_REQUESTS) {
      // Block the IP
      await this.redisService.set(`blocked:${ip}`, '1', this.BLOCK_DURATION);
      await this.redisService.getClient().del(key);

      throw new HttpException(
        'Too many requests. You have been temporarily blocked.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    // Try to get real IP from various headers (for proxy/load balancer scenarios)
    return (
      request.headers['cf-connecting-ip'] || // Cloudflare
      request.headers['x-real-ip'] ||
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
