import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /** Always the caller's own log — see Campus API Table 07. */
  async list(userId: string) {
    const notifications = await this.prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
    });
    return { data: notifications };
  }
}
