import { create } from 'zustand';
import { ChatSession, ChatMessage, aiApi, CreateSessionRequest } from '../lib/ai-api';

interface ChatStore {
  sessions: ChatSession[];
  currentSession: (ChatSession & { messages: ChatMessage[] }) | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (data: CreateSessionRequest) => Promise<ChatSession>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  sendMessage: (message: string, stream?: boolean) => Promise<string>;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    try {
      set({ isLoading: true, error: null });
      const sessions = await aiApi.getSessions();
      set({ sessions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createSession: async (data: CreateSessionRequest) => {
    try {
      set({ isLoading: true, error: null });
      const session = await aiApi.createSession(data);
      const sessions = [session, ...get().sessions];
      set({ sessions, isLoading: false });
      return session;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  selectSession: async (sessionId: string) => {
    try {
      set({ isLoading: true, error: null });
      const session = await aiApi.getSession(sessionId);
      set({ currentSession: session, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      set({ isLoading: true, error: null });
      await aiApi.deleteSession(sessionId);
      const sessions = get().sessions.filter((s) => s.id !== sessionId);
      const currentSession = get().currentSession?.id === sessionId ? null : get().currentSession;
      set({ sessions, currentSession, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  sendMessage: async (message: string, stream = false) => {
    const currentSession = get().currentSession;
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      set({ isLoading: true, error: null });

      // 사용자 메시지 임시 추가
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'USER',
        content: message,
        createdAt: new Date().toISOString(),
      };

      set({
        currentSession: {
          ...currentSession,
          messages: [...currentSession.messages, userMessage],
        },
      });

      if (stream) {
        // 스트리밍 응답
        let fullResponse = '';
        const assistantMessage: ChatMessage = {
          id: `temp-stream-${Date.now()}`,
          role: 'ASSISTANT',
          content: '',
          createdAt: new Date().toISOString(),
        };

        const updatedMessages = [...currentSession.messages, userMessage, assistantMessage];
        set({
          currentSession: {
            ...currentSession,
            messages: updatedMessages,
          },
        });

        const stream = aiApi.sendMessageStream({
          sessionId: currentSession.id,
          message,
          stream: true,
        });

        for await (const chunk of stream) {
          fullResponse += chunk;
          const lastMessageIndex = get().currentSession!.messages.length - 1;
          const messages = [...get().currentSession!.messages];
          messages[lastMessageIndex] = {
            ...messages[lastMessageIndex],
            content: fullResponse,
          };
          set({
            currentSession: {
              ...get().currentSession!,
              messages,
            },
          });
        }

        set({ isLoading: false });
        return fullResponse;
      } else {
        // 일반 응답
        const result = await aiApi.sendMessage({
          sessionId: currentSession.id,
          message,
        });

        const assistantMessage: ChatMessage = {
          id: `temp-${Date.now() + 1}`,
          role: 'ASSISTANT',
          content: result.response,
          createdAt: new Date().toISOString(),
        };

        set({
          currentSession: {
            ...currentSession,
            messages: [...currentSession.messages, userMessage, assistantMessage],
          },
          isLoading: false,
        });

        return result.response;
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
