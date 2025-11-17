import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { ChatService } from './services/chat.service';
import { RAGService } from './services/rag.service';
import { LLMProviderService } from './services/llm-provider.service';
import { PrismaService } from '../config/prisma.service';
import { RedisService } from '../config/redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AIController],
  providers: [
    ChatService,
    RAGService,
    LLMProviderService,
    PrismaService,
    RedisService,
    ConfigService,
  ],
  exports: [ChatService, RAGService, LLMProviderService],
})
export class AIModule {}
