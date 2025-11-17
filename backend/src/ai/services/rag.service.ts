import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Project, Portfolio } from '@prisma/client';

/**
 * RAG (Retrieval-Augmented Generation) Service
 * 문서 인덱싱, 검색, Context 생성을 담당
 */
@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(private readonly prisma: PrismaService) {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  /**
   * RAG 시스템 초기화 (API 키로 Embeddings 설정)
   */
  async initialize(apiKey: string): Promise<void> {
    try {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
      });

      // 기존 문서들을 벡터 스토어에 로드
      await this.loadExistingDocuments();

      this.logger.log('RAG system initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize RAG: ${error.message}`);
      throw error;
    }
  }

  /**
   * 데이터베이스의 기존 문서들을 벡터 스토어에 로드
   */
  private async loadExistingDocuments(): Promise<void> {
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized');
    }

    try {
      // 1. Documents 테이블에서 문서 가져오기
      const documents = await this.prisma.document.findMany({
        where: { isIndexed: true },
      });

      // 2. Projects 테이블에서 프로젝트 가져오기
      const projects = await this.prisma.project.findMany({
        where: { isPublished: true },
      });

      // 3. Portfolio 테이블에서 포트폴리오 가져오기
      const portfolios = await this.prisma.portfolio.findMany({
        where: { isPublished: true },
      });

      // LangChain Document 형식으로 변환
      const langChainDocs: LangChainDocument[] = [
        ...documents.map((doc) => new LangChainDocument({
          pageContent: doc.content,
          metadata: {
            id: doc.id,
            title: doc.title,
            source: doc.source,
            sourceType: doc.sourceType,
            type: 'document',
          },
        })),
        ...projects.map((project) => this.projectToDocument(project)),
        ...portfolios.map((portfolio) => this.portfolioToDocument(portfolio)),
      ];

      // 문서 분할
      const splitDocs = await this.textSplitter.splitDocuments(langChainDocs);

      // 벡터 스토어 생성
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        this.embeddings,
      );

      this.logger.log(`Loaded ${splitDocs.length} document chunks into vector store`);
    } catch (error) {
      this.logger.error(`Failed to load existing documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Project를 LangChain Document로 변환
   */
  private projectToDocument(project: Project): LangChainDocument {
    const content = `
Title: ${project.title}
Description: ${project.description}
Content: ${project.content}
Tags: ${project.tags.join(', ')}
Demo URL: ${project.demoUrl || 'N/A'}
GitHub URL: ${project.githubUrl || 'N/A'}
Start Date: ${project.startDate.toISOString()}
End Date: ${project.endDate?.toISOString() || 'Ongoing'}
    `.trim();

    return new LangChainDocument({
      pageContent: content,
      metadata: {
        id: project.id,
        title: project.title,
        tags: project.tags,
        type: 'project',
        demoUrl: project.demoUrl,
        githubUrl: project.githubUrl,
      },
    });
  }

  /**
   * Portfolio를 LangChain Document로 변환
   */
  private portfolioToDocument(portfolio: Portfolio): LangChainDocument {
    const content = `
Title: ${portfolio.title}
Subtitle: ${portfolio.subtitle || ''}
Description: ${portfolio.description}
Content: ${portfolio.content}
Skills: ${portfolio.skills.join(', ')}
Email: ${portfolio.email || 'N/A'}
GitHub: ${portfolio.github || 'N/A'}
LinkedIn: ${portfolio.linkedin || 'N/A'}
Website: ${portfolio.website || 'N/A'}
    `.trim();

    return new LangChainDocument({
      pageContent: content,
      metadata: {
        id: portfolio.id,
        title: portfolio.title,
        skills: portfolio.skills,
        type: 'portfolio',
        email: portfolio.email,
        github: portfolio.github,
      },
    });
  }

  /**
   * 새 문서 추가 및 인덱싱
   */
  async addDocument(title: string, content: string, source?: string): Promise<string> {
    if (!this.vectorStore || !this.embeddings) {
      throw new Error('RAG system not initialized');
    }

    try {
      // 1. 데이터베이스에 문서 저장
      const document = await this.prisma.document.create({
        data: {
          title,
          content,
          source,
          sourceType: 'manual',
          isIndexed: true,
        },
      });

      // 2. LangChain Document로 변환
      const langChainDoc = new LangChainDocument({
        pageContent: content,
        metadata: {
          id: document.id,
          title,
          source,
          type: 'document',
        },
      });

      // 3. 문서 분할
      const splitDocs = await this.textSplitter.splitDocuments([langChainDoc]);

      // 4. 벡터 스토어에 추가
      await this.vectorStore.addDocuments(splitDocs);

      this.logger.log(`Document ${document.id} added and indexed`);
      return document.id;
    } catch (error) {
      this.logger.error(`Failed to add document: ${error.message}`);
      throw error;
    }
  }

  /**
   * 유사 문서 검색
   */
  async search(query: string, topK: number = 5): Promise<LangChainDocument[]> {
    if (!this.vectorStore) {
      throw new Error('RAG system not initialized');
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, topK);
      this.logger.log(`Found ${results.length} similar documents for query: "${query}"`);
      return results;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Context 생성 (RAG에서 검색된 문서들을 컨텍스트로 조합)
   */
  async generateContext(query: string, topK: number = 5): Promise<string> {
    const documents = await this.search(query, topK);

    if (documents.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }

    const context = documents
      .map((doc, index) => {
        const source = doc.metadata.title || doc.metadata.source || 'Unknown';
        return `[${index + 1}] Source: ${source}\n${doc.pageContent}`;
      })
      .join('\n\n---\n\n');

    return `Here is relevant information from the knowledge base:\n\n${context}`;
  }

  /**
   * 벡터 스토어 재인덱싱 (데이터베이스 변경 시)
   */
  async reindex(apiKey: string): Promise<void> {
    this.logger.log('Starting reindexing...');
    await this.initialize(apiKey);
    this.logger.log('Reindexing completed');
  }

  /**
   * RAG 시스템 상태 확인
   */
  isInitialized(): boolean {
    return this.vectorStore !== null && this.embeddings !== null;
  }
}
