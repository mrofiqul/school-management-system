import { randomBytes, randomUUID, createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function refreshTtlMs(): number {
  const raw = process.env.JWT_REFRESH_TTL ?? '30d';
  const match = /^(\d+)([dhm])$/.exec(raw);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unitMs = { d: 24 * 60 * 60 * 1000, h: 60 * 60 * 1000, m: 60 * 1000 }[match[2] as 'd' | 'h' | 'm'];
  return n * unitMs;
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

    return this.issueTokens(user.id, { sub: user.id, schoolId: user.schoolId, role: user.role }, randomUUID());
  }

  /**
   * Rotates a refresh token: the presented token is single-use. Each call
   * revokes it and issues a new access/refresh pair in the same "family"
   * (familyId traces back to the original login). Presenting a token that
   * was already revoked — i.e. one that was already rotated past, which
   * only happens if a stolen token is replayed after the legitimate client
   * moved on — revokes every other token in that family, logging out
   * whoever holds any of them.
   */
  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token already used — session revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      user.id,
      { sub: user.id, schoolId: user.schoolId, role: user.role },
      stored.familyId,
    );
  }

  /** Revokes every live token in the presented token's family (logs out that session). */
  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, payload: JwtPayload, familyId: string): Promise<TokenPair> {
    const rawRefreshToken = randomBytes(48).toString('base64url');
    const [accessToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me',
        expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          familyId,
          tokenHash: hashToken(rawRefreshToken),
          expiresAt: new Date(Date.now() + refreshTtlMs()),
        },
      }),
    ]);
    return { accessToken, refreshToken: rawRefreshToken };
  }
}
