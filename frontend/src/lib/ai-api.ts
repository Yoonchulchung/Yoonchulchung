import { apiClient } from './api';

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  provider: string;
  useRAG: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
  metadata?: any;
}

export interface CreateSessionRequest {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'COHERE' | 'HUGGINGFACE';
  model: string;
  title?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  useRAG?: boolean;
}

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  stream?: boolean;
}

export interface SaveApiKeyRequest {
  provider: string;
  apiKey: string;
}

/**
 * AI API Client
 */
export const aiApi = {
  // 세션 관리
  async createSession(data: CreateSessionRequest): Promise<ChatSession> {
    const response = await apiClient.post('/ai/sessions', data);
    return response.data;
  },

  async getSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get('/ai/sessions');
    return response.data;
  },

  async getSession(sessionId: string): Promise<ChatSession & { messages: ChatMessage[] }> {
    const response = await apiClient.get(`/ai/sessions/${sessionId}`);
    return response.data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/ai/sessions/${sessionId}`);
  },

  // 채팅
  async sendMessage(data: SendMessageRequest): Promise<{ response: string }> {
    const response = await apiClient.post('/ai/chat', data);
    return response.data.data;
  },

  // 스트리밍 채팅
  async *sendMessageStream(data: SendMessageRequest): AsyncGenerator<string> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              yield data;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // API 키 관리
  async saveApiKey(data: SaveApiKeyRequest): Promise<void> {
    await apiClient.post('/ai/api-keys', data);
  },

  // RAG
  async searchDocuments(query: string, topK?: number): Promise<any[]> {
    const response = await apiClient.post('/ai/rag/search', { query, topK });
    return response.data.data;
  },

  async addDocument(title: string, content: string, source?: string): Promise<string> {
    const response = await apiClient.post('/ai/rag/documents', { title, content, source });
    return response.data.data.documentId;
  },

  async reindexRAG(): Promise<void> {
    await apiClient.post('/ai/rag/reindex');
  },

  // 모델 목록
  async getAvailableModels(provider: string): Promise<string[]> {
    const response = await apiClient.get(`/ai/models/${provider}`);
    return response.data.data.models;
  },
};
