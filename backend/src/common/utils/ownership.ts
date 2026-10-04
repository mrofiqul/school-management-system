import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

/**
 * Enforces per-record ownership on top of RolesGuard's per-route check.
 * A role being allowed on a route (e.g. PARENT on GET /invoices) says
 * nothing about *which* student's records that parent may read — without
 * this, any parent at a school could read any other family's child's
 * attendance, marks, or fees just by knowing a studentId.
 *
 * - STUDENT may only ever access their own studentId.
 * - PARENT may only access a studentId linked via ParentStudent.
 * - Any other role (ADMIN, TEACHER, ...) is assumed already school-scoped
 *   by the caller and is let through here.
 */
export async function assertCanAccessStudent(
  prisma: PrismaService,
  user: AuthenticatedUser,
  studentId: string,
): Promise<void> {
  if (user.role === 'STUDENT') {
    if (user.sub !== studentId) {
      throw new ForbiddenException('Students may only access their own records');
    }
    return;
  }

  if (user.role === 'PARENT') {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: user.sub, studentId },
    });
    if (!link) {
      throw new ForbiddenException('Not a guardian of this student');
    }
  }
}
