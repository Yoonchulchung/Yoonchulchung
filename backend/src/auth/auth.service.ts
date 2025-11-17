import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../config/prisma.service';
import { RedisService } from '../config/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthenticationException,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
  ErrorCode,
} from '../common/exceptions/custom-exceptions';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, username } = registerDto;

    try {
      // Check if user already exists
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new ResourceAlreadyExistsException('User', 'email', email);
      }

      const existingUsername = await this.prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        throw new ResourceAlreadyExistsException('User', 'username', username);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
      });

      // Generate token
      const token = this.generateToken(user.id, user.email, user.role);

      // Store session in Redis
      await this.redisService.set(`session:${user.id}`, token, 60 * 60 * 24 * 7);

      this.logger.log(`User registered successfully: ${user.id}`);

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      // Find user
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AuthenticationException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
      }

      // Generate token
      const token = this.generateToken(user.id, user.email, user.role);

      // Store session in Redis
      await this.redisService.set(`session:${user.id}`, token, 60 * 60 * 24 * 7);

      this.logger.log(`User logged in successfully: ${user.id}`);

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } catch (error) {
      this.logger.error(`Login failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async logout(token: string) {
    try {
      // Add token to blacklist
      await this.redisService.set(`blacklist:${token}`, 'true', 60 * 60 * 24 * 7);
      this.logger.log('User logged out successfully');
    } catch (error) {
      this.logger.error('Logout failed', error.stack);
      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new ResourceNotFoundException('User', userId);
      }

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`Get current user failed for userId: ${userId}`, error.stack);
      throw error;
    }
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
