import { SetMetadata } from '@nestjs/common';

export const TRANSACTION_KEY = 'transaction';
export const Transaction = () => SetMetadata(TRANSACTION_KEY, true);
