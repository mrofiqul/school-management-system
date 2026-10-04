import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /** Optionally scoped to one thread via `withUserId` — otherwise every message touching the caller. */
  async list(currentUserId: string, withUserId?: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, recipientId: withUserId },
          { recipientId: currentUserId, senderId: withUserId },
        ],
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { sentAt: 'asc' },
    });
    return { data: messages };
  }

  async send(schoolId: string, senderId: string, dto: SendMessageDto) {
    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientId, schoolId },
    });
    if (!recipient) throw new BadRequestException('recipientId must be a user at the same school');

    const message = await this.prisma.message.create({
      data: { senderId, recipientId: dto.recipientId, body: dto.body },
    });
    return { data: message };
  }
}
