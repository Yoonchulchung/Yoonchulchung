import { Controller, Post, Body, Get, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.split(' ')[1];
    if (token) {
      await this.authService.logout(token);
    }
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(user.userId);
  }
}
