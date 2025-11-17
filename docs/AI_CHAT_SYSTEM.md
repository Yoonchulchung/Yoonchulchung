# AI 채팅 시스템 가이드

## 🤖 개요

LangChain 기반의 AI 채팅 시스템으로, 다중 LLM 프로바이더 지원, RAG (Retrieval-Augmented Generation), 대화 메모리 관리를 제공합니다.

## ✨ 주요 기능

### 1. **다중 LLM 프로바이더 지원**
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Google**: Gemini Pro
- **향후 지원 예정**: Cohere, HuggingFace

### 2. **RAG (Retrieval-Augmented Generation)**
- 포트폴리오, 프로젝트, 문서 자동 인덱싱
- 벡터 검색을 통한 관련 정보 추출
- 컨텍스트 기반 답변 생성

### 3. **대화 메모리**
- Redis 기반 대화 히스토리 캐싱
- 세션별 컨텍스트 유지
- 이전 대화 내용 참조

### 4. **스트리밍 응답**
- 실시간 토큰 단위 응답
- Server-Sent Events (SSE)
- 더 나은 사용자 경험

### 5. **보안**
- API 키 AES-256-CBC 암호화
- 사용자별 API 키 관리
- 안전한 저장소

## 🏗️ 아키텍처

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
│                 │
│  - Chat Page    │
│  - Settings     │
│  - Zustand      │
└────────┬────────┘
         │
         │ REST API / SSE
         ▼
┌─────────────────┐
│   Backend       │
│  (NestJS)       │
│                 │
│  - AI Module    │
│  - LangChain    │
│  - RAG Service  │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────┐
│  Database   │  │   Redis     │
│ (PostgreSQL)│  │  (Cache)    │
│             │  │             │
│ - ApiKey    │  │ - Memory    │
│ - Session   │  │ - State     │
│ - Message   │  │             │
│ - Document  │  │             │
└─────────────┘  └─────────────┘
```

## 📦 설치된 패키지

### Backend
```json
{
  "langchain": "^0.x.x",
  "@langchain/core": "^0.x.x",
  "@langchain/openai": "^0.x.x",
  "@langchain/anthropic": "^0.x.x",
  "@langchain/google-genai": "^0.x.x",
  "@langchain/community": "^1.x.x",
  "@langchain/textsplitters": "^0.x.x",
  "chromadb": "^1.x.x",
  "hnswlib-node": "^3.x.x"
}
```

## 🗄️ 데이터베이스 스키마

### ApiKey
```prisma
model ApiKey {
  id        String      @id @default(uuid())
  userId    String
  provider  AIProvider  // OPENAI, ANTHROPIC, GOOGLE, etc.
  apiKey    String      // 암호화됨
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}
```

### ChatSession
```prisma
model ChatSession {
  id           String        @id @default(uuid())
  userId       String
  title        String        @default("New Chat")
  model        String        @default("gpt-4")
  provider     AIProvider    @default(OPENAI)
  systemPrompt String?
  temperature  Float         @default(0.7)
  maxTokens    Int           @default(2000)
  useRAG       Boolean       @default(false)
  messages     ChatMessage[]
}
```

### ChatMessage
```prisma
model ChatMessage {
  id        String      @id @default(uuid())
  sessionId String
  role      MessageRole // USER, ASSISTANT, SYSTEM, FUNCTION
  content   String      @db.Text
  metadata  Json?
  createdAt DateTime    @default(now())
}
```

### Document
```prisma
model Document {
  id          String   @id @default(uuid())
  title       String
  content     String   @db.Text
  source      String?
  sourceType  String   @default("manual")
  metadata    Json?
  embedding   Float[]? // 벡터 임베딩
  isIndexed   Boolean  @default(false)
}
```

## 🚀 사용 방법

### 1. API 키 설정

**Frontend** (`/settings` 페이지):
```typescript
// Settings 페이지에서 API 키 입력
await aiApi.saveApiKey({
  provider: 'OPENAI',
  apiKey: 'sk-...',
});
```

**Backend** (암호화되어 저장):
```typescript
// ChatService에서 자동으로 암호화/복호화
await this.chatService.saveApiKey(userId, 'OPENAI', apiKey);
const decryptedKey = await this.getApiKey(userId, 'OPENAI');
```

### 2. 채팅 세션 생성

```typescript
// Frontend
const session = await aiApi.createSession({
  provider: 'OPENAI',
  model: 'gpt-4-turbo-preview',
  title: 'My Chat',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  maxTokens: 2000,
  useRAG: true, // RAG 활성화
});
```

### 3. 메시지 전송 (일반)

```typescript
// Frontend
const response = await aiApi.sendMessage({
  sessionId: session.id,
  message: '포트폴리오에 대해 알려줘',
});

console.log(response.response);
```

### 4. 메시지 전송 (스트리밍)

```typescript
// Frontend
const stream = aiApi.sendMessageStream({
  sessionId: session.id,
  message: 'Hello!',
  stream: true,
});

for await (const chunk of stream) {
  console.log(chunk); // 실시간 토큰 출력
}
```

### 5. RAG 문서 추가

```typescript
// Backend API
await aiApi.addDocument(
  'My Document',
  'This is the content of my document...',
  'https://example.com/doc',
);

// 재인덱싱
await aiApi.reindexRAG();
```

## 🔧 Backend API 엔드포인트

### 세션 관리
```bash
# 세션 생성
POST /api/ai/sessions
{
  "provider": "OPENAI",
  "model": "gpt-4",
  "useRAG": true
}

# 세션 목록
GET /api/ai/sessions

# 세션 조회
GET /api/ai/sessions/:sessionId

# 세션 삭제
DELETE /api/ai/sessions/:sessionId
```

### 채팅
```bash
# 일반 채팅
POST /api/ai/chat
{
  "sessionId": "...",
  "message": "Hello"
}

# 스트리밍 채팅 (SSE)
GET /api/ai/chat/stream
Event stream...
```

### API 키
```bash
# API 키 저장
POST /api/ai/api-keys
{
  "provider": "OPENAI",
  "apiKey": "sk-..."
}
```

### RAG
```bash
# 문서 검색
POST /api/ai/rag/search
{
  "query": "portfolio",
  "topK": 5
}

# 문서 추가
POST /api/ai/rag/documents
{
  "title": "My Doc",
  "content": "...",
  "source": "url"
}

# 재인덱싱
POST /api/ai/rag/reindex
```

### 모델 목록
```bash
# 프로바이더별 사용 가능한 모델
GET /api/ai/models/:provider
```

## 🛠️ Backend 서비스 구조

### LLMProviderService
다양한 AI 프로바이더의 Chat Model을 생성하고 관리합니다.

```typescript
// OpenAI 모델 생성
const model = llmProvider.createChatModel({
  provider: AIProvider.OPENAI,
  model: 'gpt-4',
  apiKey: 'sk-...',
  temperature: 0.7,
  maxTokens: 2000,
});

// 사용 가능한 모델 목록
const models = llmProvider.getAvailableModels(AIProvider.OPENAI);
// ['gpt-4', 'gpt-3.5-turbo', ...]
```

### RAGService
문서 인덱싱, 벡터 검색, 컨텍스트 생성을 담당합니다.

```typescript
// 초기화 (API 키로 Embeddings 설정)
await ragService.initialize(openaiApiKey);

// 문서 추가
await ragService.addDocument('Title', 'Content...', 'source');

// 유사 문서 검색
const results = await ragService.search('query', topK: 5);

// 컨텍스트 생성 (RAG용)
const context = await ragService.generateContext('query');
// "Here is relevant information from the knowledge base: ..."
```

### ChatService
채팅 세션 관리, 메시지 처리, 메모리 관리를 담당합니다.

```typescript
// 세션 생성
const session = await chatService.createSession(
  userId,
  AIProvider.OPENAI,
  'gpt-4',
  { useRAG: true },
);

// 메시지 전송
const response = await chatService.sendMessage(
  userId,
  sessionId,
  'Hello',
);

// 스트리밍
for await (const chunk of chatService.sendMessageStream(userId, sessionId, 'Hi')) {
  console.log(chunk);
}

// API 키 저장 (암호화)
await chatService.saveApiKey(userId, AIProvider.OPENAI, 'sk-...');
```

## 🎨 Frontend 컴포넌트

### Chat Page (`/chat`)
실시간 채팅 인터페이스

**Features**:
- 세션 사이드바
- 메시지 목록 (사용자/AI)
- 스트리밍 응답
- 입력창

**Usage**:
```typescript
import { useChatStore } from '@/store/chat-store';

const {
  sessions,
  currentSession,
  createSession,
  sendMessage,
} = useChatStore();

// 세션 생성
await createSession({
  provider: 'OPENAI',
  model: 'gpt-4',
  useRAG: true,
});

// 메시지 전송 (스트리밍)
await sendMessage('Hello!', true);
```

### Settings Page (`/settings`)
API 키 관리

**Features**:
- 프로바이더 선택 (OpenAI, Anthropic, Google)
- API 키 입력 (암호화 저장)
- 사용 가이드 링크

## 🔐 보안

### API 키 암호화
```typescript
// AES-256-CBC 암호화
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// 암호화
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 복호화
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 환경 변수
```bash
# .env
ENCRYPTION_KEY=your-32-character-encryption-key-here

# OpenAI (사용자가 Settings에서 입력)
# Anthropic (사용자가 Settings에서 입력)
# Google (사용자가 Settings에서 입력)
```

## 📊 RAG 작동 방식

### 1. 문서 인덱싱
```typescript
// 1. 데이터베이스에서 문서 로드
const documents = await prisma.document.findMany({ where: { isIndexed: true } });
const projects = await prisma.project.findMany({ where: { isPublished: true } });
const portfolios = await prisma.portfolio.findMany({ where: { isPublished: true } });

// 2. LangChain Document로 변환
const langChainDocs = documents.map(doc => new Document({
  pageContent: doc.content,
  metadata: { id: doc.id, title: doc.title, type: 'document' },
}));

// 3. 문서 분할 (Chunking)
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const splitDocs = await textSplitter.splitDocuments(langChainDocs);

// 4. 벡터 스토어 생성
const embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
```

### 2. 유사도 검색
```typescript
// 사용자 쿼리
const query = '포트폴리오의 프로젝트들을 알려줘';

// 벡터 검색
const results = await vectorStore.similaritySearch(query, topK: 5);
// [
//   { pageContent: "Title: Project A\nDescription: ...", metadata: {...} },
//   { pageContent: "Title: Project B\nDescription: ...", metadata: {...} },
//   ...
// ]
```

### 3. 컨텍스트 생성
```typescript
const context = results
  .map((doc, index) => `[${index + 1}] Source: ${doc.metadata.title}\n${doc.pageContent}`)
  .join('\n\n---\n\n');

// Context:
// [1] Source: Project A
// Title: Project A
// Description: ...
//
// ---
//
// [2] Source: Project B
// Title: Project B
// Description: ...
```

### 4. AI 응답 생성
```typescript
// 프롬프트에 컨텍스트 추가
const messages = [
  new SystemMessage('You are a helpful assistant.'),
  new SystemMessage(context), // RAG 컨텍스트
  new HumanMessage(query),
];

// LLM 호출
const response = await chatModel.invoke(messages);
```

## 🎯 사용 예시

### 예시 1: 포트폴리오 질문
```
User: "내 포트폴리오에 어떤 프로젝트들이 있어?"

[RAG 검색]
- Portfolio 테이블에서 skills, content 검색
- Project 테이블에서 모든 프로젝트 검색

[AI 응답]
"당신의 포트폴리오에는 다음과 같은 프로젝트들이 있습니다:
1. Portfolio Website - Next.js, TypeScript, Tailwind CSS
2. E-commerce Platform - React, Node.js, MongoDB
3. Real-time Chat - Socket.io, Redis
..."
```

### 예시 2: 기술 스택 질문
```
User: "React와 TypeScript를 사용한 프로젝트는?"

[RAG 검색]
- tags에 'React', 'TypeScript' 포함된 프로젝트

[AI 응답]
"React와 TypeScript를 사용한 프로젝트는:
- Portfolio Website: Next.js 14, TypeScript, Tailwind
- Dashboard: React, TypeScript, Chart.js
..."
```

### 예시 3: 연속 대화
```
User: "포트폴리오의 주요 기술 스택은?"
AI: "주요 기술 스택은 React, TypeScript, Node.js, PostgreSQL입니다."

User: "그 중 백엔드 기술만 알려줘"
AI: "백엔드 기술은 Node.js, NestJS, PostgreSQL, Redis입니다."
```

## 🐛 문제 해결

### Prisma 마이그레이션 실행
```bash
# 1. Prisma 마이그레이션 생성
npx prisma migrate dev --name add-ai-tables

# 2. Prisma Client 재생성
npx prisma generate

# 3. 스키마 포맷
npx prisma format
```

### RAG 재인덱싱
```bash
# API 호출
curl -X POST http://localhost:3001/api/ai/rag/reindex \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### API 키 오류
```
Error: No active API key found for OPENAI

해결: /settings 페이지에서 OpenAI API 키 입력
```

### 스트리밍 오류
```
Error: No response body

해결:
1. CORS 설정 확인
2. SSE 엔드포인트 URL 확인
3. Authorization 헤더 확인
```

## 📚 참고 자료

- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API](https://platform.openai.com/docs/)
- [Anthropic Claude](https://docs.anthropic.com/)
- [Google Gemini](https://ai.google.dev/docs)
- [RAG Tutorial](https://js.langchain.com/docs/modules/data_connection/)
- [Vector Stores](https://js.langchain.com/docs/modules/data_connection/vectorstores/)

## 🚀 향후 개선 사항

- [ ] LangGraph 워크플로우 추가
- [ ] 다중 도구 (Tool Calling) 지원
- [ ] pgvector로 벡터 스토어 업그레이드
- [ ] 대화 요약 (Conversation Summarization)
- [ ] 음성 입력/출력
- [ ] 파일 업로드 및 분석
- [ ] 대화 공유 기능
- [ ] Admin 대시보드 (사용 통계)
