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

@Injectable()
export class LLMProviderService {
  private readonly logger = new Logger(LLMProviderService.name);

  createChatModel(config: LLMConfig): BaseChatModel {
    try {
      switch (config.provider) {
        case AIProvider.OPENAI:
          return this.createOpenAIModel(config);
        case AIProvider.ANTHROPIC:
          return this.createAnthropicModel(config);
        case AIProvider.GOOGLE:
          return this.createGoogleModel(config);
        default:
          throw new BadRequestException(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create chat model: ${error.message}`);
      throw error;
    }
  }

  private createOpenAIModel(config: LLMConfig): ChatOpenAI {
    return new ChatOpenAI({
      modelName: config.model || 'gpt-4-turbo-preview',
      openAIApiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens,
      streaming: true,
    });
  }

  private createAnthropicModel(config: LLMConfig): ChatAnthropic {
    return new ChatAnthropic({
      modelName: config.model || 'claude-3-5-sonnet-20241022',
      anthropicApiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 4096,
      streaming: true,
    });
  }

  private createGoogleModel(config: LLMConfig): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      model: config.model || 'gemini-pro',
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens,
      streaming: true,
    });
  }

  getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case AIProvider.OPENAI:
        return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'];
      case AIProvider.ANTHROPIC:
        return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
      case AIProvider.GOOGLE:
        return ['gemini-pro'];
      default:
        return [];
    }
  }

  async validateApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    try {
      const model = this.createChatModel({
        provider,
        model: this.getAvailableModels(provider)[0],
        apiKey,
        temperature: 0,
        maxTokens: 10,
      });
      await model.invoke('Test');
      return true;
    } catch (error) {
      this.logger.warn(`API key validation failed for ${provider}: ${error.message}`);
      return false;
    }
  }
}
