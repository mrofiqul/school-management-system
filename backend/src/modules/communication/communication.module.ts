import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { NoticesService } from './notices.service';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [CommunicationController],
  providers: [NoticesService, MessagesService, NotificationsService],
})
export class CommunicationModule {}
