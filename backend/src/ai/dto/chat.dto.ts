import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { AIProvider } from '@prisma/client';

export class CreateChatSessionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(AIProvider)
  provider: AIProvider;

  @IsString()
  model: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @Max(32000)
  @IsOptional()
  maxTokens?: number;

  @IsBoolean()
  @IsOptional()
  useRAG?: boolean;
}

export class SendMessageDto {
  @IsString()
  sessionId: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  stream?: boolean;
}

export class SaveApiKeyDto {
  @IsEnum(AIProvider)
  provider: AIProvider;

  @IsString()
  apiKey: string;
}

export class QueryRAGDto {
  @IsString()
  query: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  topK?: number;
}
