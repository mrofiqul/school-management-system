import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async findOne(schoolId: string, user: AuthenticatedUser, parentId: string) {
    // A parent may read their own profile; an admin may read any parent at their school.
    if (user.role === 'PARENT' && user.sub !== parentId) {
      throw new ForbiddenException('Parents may only view their own profile');
    }

    const parent = await this.prisma.parentProfile.findFirst({
      where: { userId: parentId, user: { schoolId } },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        children: {
          include: { student: { select: { user: { select: { fullName: true } }, admissionNo: true } } },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    return { data: parent };
  }
}
