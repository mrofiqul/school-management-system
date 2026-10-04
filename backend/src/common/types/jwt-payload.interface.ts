import { Role } from '@prisma/client';

/**
 * Shape of the access token payload — see docs/specification.html §06 and
 * Campus API Figure A. school_id travels only in here; no handler ever reads
 * it from a request body or query string.
 */
export interface JwtPayload {
  sub: string; // User.id
  schoolId: string | null; // null only for SUPER_ADMIN
  role: Role;
}

export interface AuthenticatedUser extends JwtPayload {}
