import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me',
    });
  }

  // Whatever is returned here becomes request.user — see CurrentUser decorator.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return { sub: payload.sub, schoolId: payload.schoolId, role: payload.role };
  }
}
