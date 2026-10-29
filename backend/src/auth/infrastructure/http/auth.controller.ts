import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { loginSchema, registerSchema, type LoginDto, type RegisterDto, type UserDto } from '@casino/shared';
import type { Request, Response } from 'express';
import type { PlayerRequest } from '../../../common/infrastructure/http/player.js';
import { ZodValidationPipe } from '../../../common/infrastructure/http/zod-validation.pipe.js';
import { AuthService } from '../../application/auth.service.js';
import { clearSessionCookie, sessionToken, setSessionCookie } from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Le joueur connecté, null sinon (le front s'en sert pour envoyer vers /login).
  @Get('me')
  me(@Req() req: PlayerRequest): UserDto | null {
    return req.user ?? null;
  }

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.auth.register(dto);
    setSessionCookie(req, res, token);
    return user;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.auth.login(dto);
    setSessionCookie(req, res, token);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = sessionToken(req);
    if (token) await this.auth.logout(token);
    clearSessionCookie(res);
  }
}
