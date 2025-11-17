import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AIProvider } from '@prisma/client';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface LLMConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Provider Service
 * 다양한 AI 모델 프로바이더를 통합 관리하는 서비스
 */
@Injectable()
export class LLMProviderService {
  private readonly logger = new Logger(LLMProviderService.name);

  /**
   * 프로바이더에 맞는 Chat Model 인스턴스 생성
   */
  createChatModel(config: LLMConfig): BaseChatModel {
    try {
      switch (config.provider) {
        case AIProvider.OPENAI:
          return this.createOpenAIModel(config);

        case AIProvider.ANTHROPIC:
          return this.createAnthropicModel(config);

        case AIProvider.GOOGLE:
          return this.createGoogleModel(config);

        case AIProvider.COHERE:
          throw new BadRequestException('Cohere provider is not yet implemented');

        case AIProvider.HUGGINGFACE:
          throw new BadRequestException('HuggingFace provider is not yet implemented');

        default:
          throw new BadRequestException(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create chat model: ${error.message}`);
      throw error;
    }
  }

  /**
   * OpenAI Chat Model 생성
   */
  private createOpenAIModel(config: LLMConfig): ChatOpenAI {
    return new ChatOpenAI({
      modelName: config.model || 'gpt-4-turbo-preview',
      openAIApiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens,
      streaming: true,
    });
  }

  /**
   * Anthropic (Claude) Chat Model 생성
   */
  private createAnthropicModel(config: LLMConfig): ChatAnthropic {
    return new ChatAnthropic({
      modelName: config.model || 'claude-3-5-sonnet-20241022',
      anthropicApiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 4096,
      streaming: true,
    });
  }

  /**
   * Google (Gemini) Chat Model 생성
   */
  private createGoogleModel(config: LLMConfig): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      modelName: config.model || 'gemini-pro',
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens,
      streaming: true,
    });
  }

  /**
   * 프로바이더별 사용 가능한 모델 목록
   */
  getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case AIProvider.OPENAI:
        return [
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-4-32k',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k',
        ];

      case AIProvider.ANTHROPIC:
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0',
        ];

      case AIProvider.GOOGLE:
        return [
          'gemini-pro',
          'gemini-pro-vision',
          'gemini-ultra',
        ];

      case AIProvider.COHERE:
        return ['command', 'command-light', 'command-nightly'];

      case AIProvider.HUGGINGFACE:
        return ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'];

      default:
        return [];
    }
  }

  /**
   * API 키 유효성 검증
   */
  async validateApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    try {
      const model = this.createChatModel({
        provider,
        model: this.getAvailableModels(provider)[0],
        apiKey,
        temperature: 0,
        maxTokens: 10,
      });

      // 간단한 메시지로 API 키 테스트
      await model.invoke('Test');
      return true;
    } catch (error) {
      this.logger.warn(`API key validation failed for ${provider}: ${error.message}`);
      return false;
    }
  }
}
