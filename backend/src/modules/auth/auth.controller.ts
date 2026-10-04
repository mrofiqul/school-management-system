import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
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
