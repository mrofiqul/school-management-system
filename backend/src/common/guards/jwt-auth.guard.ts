import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Verifies the bearer token via JwtStrategy and attaches req.user. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
