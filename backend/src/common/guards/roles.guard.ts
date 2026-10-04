import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

/**
 * Runs after JwtAuthGuard. A route with no @Roles() is open to any
 * authenticated user; one with @Roles(...) requires the token's role to be
 * in that list. This is the only place "who can call it" is enforced —
 * see the role columns in Campus API / docs/specification.html §06.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return !!user && required.includes(user.role);
  }
}
