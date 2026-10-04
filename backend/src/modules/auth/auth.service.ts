import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens({ sub: user.id, schoolId: user.schoolId, role: user.role });
  }

  /**
   * Re-issues an access token from a valid refresh token.
   *
   * NOTE — scaffold limitation: refresh tokens are stateless JWTs, not
   * tracked in the database, so there is no way to revoke one before it
   * expires (e.g. on logout from another device, or a suspended account).
   * Before production, swap this for a stored, rotating refresh-token
   * record — see docs/specification.html §08, "Rate limiting" / security row.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueTokens({ sub: user.id, schoolId: user.schoolId, role: user.role });
  }

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me',
        expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
        expiresIn: process.env.JWT_REFRESH_TTL ?? '30d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
