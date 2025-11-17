import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';
import {
  AuthenticationException,
  ResourceAlreadyExistsException,
  ErrorCode,
} from '../../common/exceptions/custom-exceptions';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashedPassword';
      const mockUser = {
        id: '1',
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        token: mockToken,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw ResourceAlreadyExistsException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: '1' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ResourceAlreadyExistsException,
      );
    });

    it('should throw ResourceAlreadyExistsException if username exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '1' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ResourceAlreadyExistsException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      const mockUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        username: 'testuser',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        token: mockToken,
      });
    });

    it('should throw AuthenticationException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(AuthenticationException);
    });

    it('should throw AuthenticationException if password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(AuthenticationException);
    });
  });

  describe('logout', () => {
    it('should add token to blacklist', async () => {
      const token = 'jwt-token';
      mockRedisService.set.mockResolvedValue(undefined);

      await service.logout(token);

      expect(redisService.set).toHaveBeenCalledWith(
        `blacklist:${token}`,
        'true',
        60 * 60 * 24 * 7,
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user without password', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser('1');

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw ResourceNotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('1')).rejects.toThrow();
    });
  });
});
