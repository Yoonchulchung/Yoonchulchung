# 테스트 가이드

## 개요

이 프로젝트는 Backend와 Frontend 모두에 대해 포괄적인 테스트를 포함하고 있습니다.

## Backend 테스트

### 테스트 종류

1. **Unit Tests**: 개별 서비스와 유틸리티 함수 테스트
2. **Integration Tests**: 여러 컴포넌트 간의 통합 테스트
3. **E2E Tests**: 전체 API 플로우 테스트

### 테스트 실행

```bash
cd backend

# 모든 테스트 실행
npm test

# Watch 모드로 실행
npm run test:watch

# 커버리지 포함 실행
npm run test:cov

# E2E 테스트만 실행
npm run test:e2e

# 특정 파일 테스트
npm test -- auth.service.spec.ts
```

### 테스트 구조

```
backend/
├── src/
│   ├── auth/
│   │   └── __tests__/
│   │       └── auth.service.spec.ts      # Auth 서비스 unit 테스트
│   ├── project/
│   │   └── __tests__/
│   │       └── project.service.spec.ts   # Project 서비스 unit 테스트
│   └── portfolio/
│       └── __tests__/
│           └── portfolio.service.spec.ts # Portfolio 서비스 unit 테스트
└── test/
    ├── jest-e2e.json                     # E2E 테스트 설정
    └── app.e2e-spec.ts                   # API E2E 테스트
```

### 테스트 작성 예시

#### Unit Test 예시

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../config/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a new user', async () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.user.create.mockResolvedValue({
      id: '1',
      ...registerDto,
    });

    const result = await service.register(registerDto);
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
  });
});
```

#### E2E Test 예시

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('token');
      });
  });
});
```

### 모킹 (Mocking)

**PrismaService 모킹**:
```typescript
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

**RedisService 모킹**:
```typescript
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};
```

### 테스트 커버리지 목표

- **Statements**: 80% 이상
- **Branches**: 75% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상

## Frontend 테스트

### 테스트 종류

1. **Component Tests**: React 컴포넌트 테스트
2. **Hook Tests**: Custom Hook 테스트
3. **Utility Tests**: 유틸리티 함수 테스트

### 테스트 실행

```bash
cd frontend

# 모든 테스트 실행
npm test

# Watch 모드로 실행
npm run test:watch

# 커버리지 포함 실행
npm run test:coverage
```

### 테스트 구조

```
frontend/
└── src/
    ├── components/
    │   └── __tests__/
    │       ├── ErrorBoundary.test.tsx
    │       └── LoadingSpinner.test.tsx
    ├── lib/
    │   └── __tests__/
    │       └── utils.test.ts
    └── hooks/
        └── __tests__/
            └── useAsync.test.ts
```

### 테스트 작성 예시

#### Component Test 예시

```typescript
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

#### Utility Test 예시

```typescript
import { cn, formatDate } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('2024');
    });
  });
});
```

### Testing Library 모범 사례

1. **Query 우선순위**:
   - `getByRole` (가장 선호)
   - `getByLabelText`
   - `getByPlaceholderText`
   - `getByText`
   - `getByTestId` (최후의 수단)

2. **User Interaction**:
```typescript
import userEvent from '@testing-library/user-event';

it('should handle click event', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();

  render(<button onClick={handleClick}>Click me</button>);
  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

3. **Async Testing**:
```typescript
it('should load data', async () => {
  render(<DataComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  const data = await screen.findByText('Data loaded');
  expect(data).toBeInTheDocument();
});
```

## 지속적인 통합 (CI)

### GitHub Actions 설정

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run tests
        run: cd backend && npm test
      - name: Run E2E tests
        run: cd backend && npm run test:e2e

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test
```

## 디버깅 팁

### Backend
```bash
# Debug 모드로 테스트 실행
npm run test:debug

# 특정 테스트만 실행
npm test -- --testNamePattern="should register"
```

### Frontend
```bash
# Debug 모드
npm test -- --runInBand --no-cache

# 특정 파일만 실행
npm test -- ErrorBoundary.test.tsx
```

## 모범 사례

1. **테스트는 독립적이어야 함**: 각 테스트는 다른 테스트에 의존하지 않아야 합니다.
2. **AAA 패턴 사용**: Arrange, Act, Assert
3. **명확한 테스트 이름**: `should [expected behavior] when [condition]`
4. **Edge Case 테스트**: 정상 케이스뿐만 아니라 엣지 케이스도 테스트
5. **Mock 최소화**: 필요한 경우에만 Mock 사용

## 참고 자료

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)
