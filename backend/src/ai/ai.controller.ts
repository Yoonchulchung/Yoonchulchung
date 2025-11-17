import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Sse,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './services/chat.service';
import { RAGService } from './services/rag.service';
import { LLMProviderService } from './services/llm-provider.service';
import { CreateChatSessionDto, SendMessageDto, SaveApiKeyDto, QueryRAGDto } from './dto/chat.dto';
import { Observable } from 'rxjs';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(
    private readonly chatService: ChatService,
    private readonly ragService: RAGService,
    private readonly llmProvider: LLMProviderService,
  ) {}

  /**
   * 새 채팅 세션 생성
   */
  @Post('sessions')
  async createSession(@Request() req, @Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession(
      req.user.userId,
      dto.provider,
      dto.model,
      {
        title: dto.title,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        useRAG: dto.useRAG,
      },
    );
  }

  /**
   * 세션 목록 조회
   */
  @Get('sessions')
  async getSessions(@Request() req) {
    return this.chatService.getSessions(req.user.userId);
  }

  /**
   * 세션 상세 조회
   */
  @Get('sessions/:sessionId')
  async getSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.chatService.getSession(req.user.userId, sessionId);
  }

  /**
   * 세션 삭제
   */
  @Delete('sessions/:sessionId')
  async deleteSession(@Request() req, @Param('sessionId') sessionId: string) {
    await this.chatService.deleteSession(req.user.userId, sessionId);
    return { success: true, message: 'Session deleted' };
  }

  /**
   * 메시지 전송 (일반 응답)
   */
  @Post('chat')
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    const response = await this.chatService.sendMessage(
      req.user.userId,
      dto.sessionId,
      dto.message,
    );

    return {
      success: true,
      data: { response },
    };
  }

  /**
   * 메시지 전송 (스트리밍 응답)
   */
  @Sse('chat/stream')
  async sendMessageStream(@Request() req, @Body() dto: SendMessageDto): Promise<Observable<MessageEvent>> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const stream = this.chatService.sendMessageStream(
            req.user.userId,
            dto.sessionId,
            dto.message,
          );

          for await (const chunk of stream) {
            subscriber.next({
              data: chunk,
            } as MessageEvent);
          }

          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * API 키 저장
   */
  @Post('api-keys')
  async saveApiKey(@Request() req, @Body() dto: SaveApiKeyDto) {
    await this.chatService.saveApiKey(req.user.userId, dto.provider, dto.apiKey);
    return {
      success: true,
      message: 'API key saved successfully',
    };
  }

  /**
   * RAG: 문서 검색
   */
  @Post('rag/search')
  async searchDocuments(@Body() dto: QueryRAGDto) {
    const results = await this.ragService.search(dto.query, dto.topK || 5);

    return {
      success: true,
      data: results.map((doc) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    };
  }

  /**
   * RAG: 문서 추가
   */
  @Post('rag/documents')
  async addDocument(
    @Body() body: { title: string; content: string; source?: string },
  ) {
    const documentId = await this.ragService.addDocument(
      body.title,
      body.content,
      body.source,
    );

    return {
      success: true,
      data: { documentId },
      message: 'Document added and indexed',
    };
  }

  /**
   * RAG: 재인덱싱
   */
  @Post('rag/reindex')
  async reindex(@Request() req) {
    // OpenAI API 키 가져오기 (RAG용)
    const apiKey = await this.chatService['getApiKey'](req.user.userId, 'OPENAI');
    await this.ragService.reindex(apiKey);

    return {
      success: true,
      message: 'Reindexing completed',
    };
  }

  /**
   * 프로바이더별 사용 가능한 모델 목록
   */
  @Get('models/:provider')
  async getAvailableModels(@Param('provider') provider: string) {
    const models = this.llmProvider.getAvailableModels(provider as any);

    return {
      success: true,
      data: { provider, models },
    };
  }
}
