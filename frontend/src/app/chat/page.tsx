'use client';

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/store/chat-store';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const {
    sessions,
    currentSession,
    isLoading,
    fetchSessions,
    createSession,
    selectSession,
    sendMessage,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const handleCreateSession = async () => {
    try {
      setIsCreatingSession(true);
      const session = await createSession({
        provider: 'OPENAI',
        model: 'gpt-4-turbo-preview',
        title: 'New Chat',
        useRAG: true, // RAG 활성화
      });
      await selectSession(session.id);
    } catch (error: any) {
      alert(`Failed to create session: ${error.message}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSession) return;

    try {
      const message = inputMessage;
      setInputMessage('');
      await sendMessage(message, true); // 스트리밍 활성화
    } catch (error: any) {
      alert(`Failed to send message: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 사이드바 - 세션 목록 */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <button
          onClick={handleCreateSession}
          disabled={isCreatingSession}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {isCreatingSession ? 'Creating...' : '+ New Chat'}
        </button>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                currentSession?.id === session.id
                  ? 'bg-blue-100 border-blue-500 border'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium text-sm truncate">{session.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {session._count.messages} messages · {session.provider}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* 헤더 */}
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold">{currentSession.title}</h2>
              <p className="text-sm text-gray-500">
                {currentSession.model} · RAG: {currentSession.useRAG ? 'ON' : 'OFF'}
              </p>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      message.role === 'USER'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`text-xs mt-2 ${
                        message.role === 'USER' ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력창 */}
            <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message... (RAG will search your portfolio data)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">No chat selected</h3>
              <p>Create a new chat or select an existing one from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
