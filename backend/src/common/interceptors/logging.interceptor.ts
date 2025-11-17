import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const userInfo = user ? `User: ${user.userId}` : 'Anonymous';
    const startTime = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url} - ${userInfo}`);

    // Log request body for non-GET requests (excluding sensitive data)
    if (method !== 'GET' && body) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const responseTime = Date.now() - startTime;

        this.logger.log(
          `Outgoing Response: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        this.logger.error(
          `Error Response: ${method} ${url} - ${error.status || 500} - ${responseTime}ms`,
          error.stack,
        );
        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
