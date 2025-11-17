import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap } from 'rxjs';
import { PrismaService } from '../../config/prisma.service';
import { TRANSACTION_KEY } from '../decorators/transaction.decorator';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const useTransaction = this.reflector.get<boolean>(
      TRANSACTION_KEY,
      context.getHandler(),
    );

    if (!useTransaction) {
      return next.handle();
    }

    // Use Prisma transaction
    return new Observable((subscriber) => {
      this.prisma
        .$transaction(async (prisma) => {
          const request = context.switchToHttp().getRequest();
          request.transaction = prisma;

          return next
            .handle()
            .pipe(
              tap((data) => subscriber.next(data)),
              catchError((error) => {
                subscriber.error(error);
                throw error;
              }),
            )
            .toPromise();
        })
        .then(() => subscriber.complete())
        .catch((error) => subscriber.error(error));
    });
  }
}
