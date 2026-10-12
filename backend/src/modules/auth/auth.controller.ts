import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Matches Campus API Table 00 — Auth & Session.
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { data: { ok: true } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@CurrentUser() current: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(current.sub, dto.currentPassword, dto.newPassword);
    return { data: { ok: true } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: current.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        school: { select: { id: true, name: true, status: true } },
      },
    });
    return { data: user };
  }
}
