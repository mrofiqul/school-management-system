import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AudienceScope, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { assertCanAccessStudent } from '../../common/utils/ownership';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fan-out happens here, at read time, rather than as a write per
   * recipient (see Campus Schema §05). Staff see every notice for the
   * school; a Student or Parent sees ALL-scope notices plus whatever is
   * targeted at their own role, class, or section.
   */
  async list(schoolId: string, user: AuthenticatedUser, studentId?: string) {
    if (user.role === Role.ADMIN || user.role === Role.TEACHER) {
      const notices = await this.prisma.notice.findMany({
        where: { schoolId },
        orderBy: { postedAt: 'desc' },
      });
      return { data: notices };
    }

    let classId: string | undefined;
    let sectionId: string | undefined;

    if (user.role === Role.STUDENT) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: user.sub },
        select: { sectionId: true, section: { select: { classId: true } } },
      });
      sectionId = profile?.sectionId ?? undefined;
      classId = profile?.section?.classId;
    } else if (user.role === Role.PARENT && studentId) {
      await assertCanAccessStudent(this.prisma, user, studentId);
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: studentId },
        select: { sectionId: true, section: { select: { classId: true } } },
      });
      sectionId = profile?.sectionId ?? undefined;
      classId = profile?.section?.classId;
    }

    const or: Prisma.NoticeWhereInput[] = [
      { audienceScope: AudienceScope.ALL },
      { audienceScope: AudienceScope.ROLE, targetRole: user.role },
    ];
    if (classId) or.push({ audienceScope: AudienceScope.CLASS, targetClassId: classId });
    if (sectionId) or.push({ audienceScope: AudienceScope.SECTION, targetSectionId: sectionId });

    const notices = await this.prisma.notice.findMany({
      where: { schoolId, OR: or },
      orderBy: { postedAt: 'desc' },
    });
    return { data: notices };
  }

  async create(schoolId: string, authorId: string, dto: CreateNoticeDto) {
    if (dto.audienceScope === AudienceScope.CLASS) {
      if (!dto.targetClassId) throw new BadRequestException('targetClassId is required for CLASS scope');
      const klass = await this.prisma.class.findFirst({
        where: { id: dto.targetClassId, academicYear: { schoolId } },
      });
      if (!klass) throw new NotFoundException('Target class not found');
    }
    if (dto.audienceScope === AudienceScope.SECTION) {
      if (!dto.targetSectionId) throw new BadRequestException('targetSectionId is required for SECTION scope');
      const section = await this.prisma.section.findFirst({
        where: { id: dto.targetSectionId, class: { academicYear: { schoolId } } },
      });
      if (!section) throw new NotFoundException('Target section not found');
    }
    if (dto.audienceScope === AudienceScope.ROLE && !dto.targetRole) {
      throw new BadRequestException('targetRole is required for ROLE scope');
    }

    const notice = await this.prisma.notice.create({
      data: {
        schoolId,
        title: dto.title,
        body: dto.body,
        audienceScope: dto.audienceScope,
        targetClassId: dto.audienceScope === AudienceScope.CLASS ? dto.targetClassId : null,
        targetSectionId: dto.audienceScope === AudienceScope.SECTION ? dto.targetSectionId : null,
        targetRole: dto.audienceScope === AudienceScope.ROLE ? dto.targetRole : null,
        postedBy: authorId,
      },
    });
    return { data: notice };
  }
}
