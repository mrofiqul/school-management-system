import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { NoticesService } from './notices.service';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { SendMessageDto } from './dto/send-message.dto';

// Campus API Table 07 — Communication.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CommunicationController {
  constructor(
    private noticesService: NoticesService,
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
  ) {}

  @Get('notices')
  listNotices(@CurrentUser() user: AuthenticatedUser, @Query('studentId') studentId?: string) {
    return this.noticesService.list(user.schoolId!, user, studentId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('notices')
  createNotice(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoticeDto) {
    return this.noticesService.create(user.schoolId!, user.sub, dto);
  }

  @Roles(Role.TEACHER, Role.PARENT)
  @Get('messages')
  listMessages(@CurrentUser() user: AuthenticatedUser, @Query('with') withUserId?: string) {
    return this.messagesService.list(user.sub, withUserId);
  }

  @Roles(Role.TEACHER, Role.PARENT)
  @Post('messages')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.messagesService.send(user.schoolId!, user.sub, dto);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user.sub);
  }
}
