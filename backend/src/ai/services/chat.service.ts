import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';
import { LLMProviderService, LLMConfig } from './llm-provider.service';
import { RAGService } from './rag.service';
import { AIProvider, MessageRole } from '@prisma/client';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

/**
 * Chat Service
 * 채팅 세션 관리, 메시지 처리, RAG 통합, LangGraph 워크플로우 실행
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly llmProvider: LLMProviderService,
    private readonly ragService: RAGService,
  ) {}

  /**
   * 새 채팅 세션 생성
   */
  async createSession(
    userId: string,
    provider: AIProvider,
    model: string,
    options?: {
      title?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      useRAG?: boolean;
    },
  ) {
    try {
      const session = await this.prisma.chatSession.create({
        data: {
          userId,
          title: options?.title || 'New Chat',
          provider,
          model,
          systemPrompt: options?.systemPrompt,
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? 2000,
          useRAG: options?.useRAG ?? false,
        },
      });

      this.logger.log(`Created chat session ${session.id} for user ${userId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  /**
   * 메시지 전송 및 응답 생성
   */
  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
  ): Promise<string> {
    try {
      // 1. 세션 확인
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      // 2. API 키 가져오기
      const apiKey = await this.getApiKey(userId, session.provider);

      // 3. RAG 사용 시 컨텍스트 생성
      let context = '';
      if (session.useRAG) {
        if (!this.ragService.isInitialized()) {
          await this.ragService.initialize(apiKey);
        }
        context = await this.ragService.generateContext(message);
      }

      // 4. LLM 모델 생성
      const llmConfig: LLMConfig = {
        provider: session.provider,
        model: session.model,
        apiKey,
        temperature: session.temperature,
        maxTokens: session.maxTokens,
      };
      const chatModel = this.llmProvider.createChatModel(llmConfig);

      // 5. 대화 히스토리 로드
      const memory = await this.loadMemory(session.id, session.messages);

      // 6. 프롬프트 템플릿 생성
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', session.systemPrompt || 'You are a helpful AI assistant.'],
        ...(context ? [['system', context] as [string, string]] : []),
        new MessagesPlaceholder('history'),
        ['human', '{input}'],
      ]);

      // 7. Conversation Chain 생성 및 실행
      const chain = new ConversationChain({
        llm: chatModel,
        memory,
        prompt,
      });

      const response = await chain.invoke({ input: message });

      // 8. 메시지 저장 (사용자 메시지)
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: MessageRole.USER,
          content: message,
        },
      });

      // 9. 메시지 저장 (AI 응답)
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: MessageRole.ASSISTANT,
          content: response.response,
          metadata: {
            model: session.model,
            provider: session.provider,
            usedRAG: session.useRAG,
          },
        },
      });

      // 10. Redis 캐시 업데이트
      await this.cacheMemory(session.id, memory);

      this.logger.log(`Message processed for session ${sessionId}`);
      return response.response;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  /**
   * 스트리밍 응답 생성 (실시간 응답)
   */
  async *sendMessageStream(
    userId: string,
    sessionId: string,
    message: string,
  ): AsyncGenerator<string> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const apiKey = await this.getApiKey(userId, session.provider);

    // RAG 컨텍스트
    let context = '';
    if (session.useRAG) {
      if (!this.ragService.isInitialized()) {
        await this.ragService.initialize(apiKey);
      }
      context = await this.ragService.generateContext(message);
    }

    // LLM 생성
    const llmConfig: LLMConfig = {
      provider: session.provider,
      model: session.model,
      apiKey,
      temperature: session.temperature,
      maxTokens: session.maxTokens,
    };
    const chatModel = this.llmProvider.createChatModel(llmConfig);

    // 메시지 구성
    const messages = [
      new SystemMessage(session.systemPrompt || 'You are a helpful AI assistant.'),
      ...(context ? [new SystemMessage(context)] : []),
      ...session.messages.map((msg) =>
        msg.role === MessageRole.USER
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content),
      ),
      new HumanMessage(message),
    ];

    // 스트리밍 실행
    const stream = await chatModel.stream(messages);
    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.content.toString();
      fullResponse += content;
      yield content;
    }

    // 메시지 저장
    await this.prisma.chatMessage.create({
      data: { sessionId, role: MessageRole.USER, content: message },
    });

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: MessageRole.ASSISTANT,
        content: fullResponse,
        metadata: { model: session.model, provider: session.provider },
      },
    });
  }

  /**
   * 대화 히스토리를 메모리에 로드
   */
  private async loadMemory(sessionId: string, messages: any[]): Promise<BufferMemory> {
    // Redis 캐시에서 메모리 로드 시도
    const cached = await this.redis.get(`chat:memory:${sessionId}`);

    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
    });

    // 메시지 히스토리 로드
    for (const msg of messages) {
      if (msg.role === MessageRole.USER) {
        await memory.chatHistory.addMessage(new HumanMessage(msg.content));
      } else if (msg.role === MessageRole.ASSISTANT) {
        await memory.chatHistory.addMessage(new AIMessage(msg.content));
      }
    }

    return memory;
  }

  /**
   * 메모리를 Redis에 캐시
   */
  private async cacheMemory(sessionId: string, memory: BufferMemory): Promise<void> {
    try {
      const messages = await memory.chatHistory.getMessages();
      await this.redis.set(
        `chat:memory:${sessionId}`,
        JSON.stringify(messages),
        3600, // 1시간 TTL
      );
    } catch (error) {
      this.logger.warn(`Failed to cache memory: ${error.message}`);
    }
  }

  /**
   * 사용자의 API 키 가져오기 (복호화)
   */
  private async getApiKey(userId: string, provider: AIProvider): Promise<string> {
    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      throw new UnauthorizedException(`No active API key found for ${provider}`);
    }

    return this.decrypt(apiKeyRecord.apiKey);
  }

  /**
   * API 키 저장 (암호화)
   */
  async saveApiKey(userId: string, provider: AIProvider, apiKey: string): Promise<void> {
    const encryptedKey = this.encrypt(apiKey);

    await this.prisma.apiKey.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      create: {
        userId,
        provider,
        apiKey: encryptedKey,
        isActive: true,
      },
      update: {
        apiKey: encryptedKey,
        isActive: true,
      },
    });

    this.logger.log(`API key saved for user ${userId}, provider ${provider}`);
  }

  /**
   * 세션 목록 조회
   */
  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  /**
   * 세션 상세 조회
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * 세션 삭제
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.chatSession.deleteMany({
      where: { id: sessionId, userId },
    });

    // Redis 캐시 삭제
    await this.redis.del(`chat:memory:${sessionId}`);
  }

  // 암호화/복호화 유틸리티
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
