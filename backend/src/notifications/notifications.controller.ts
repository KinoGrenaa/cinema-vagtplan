import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get()
  getForUser(@Query('userId') userId: string) {
    return this.notificationsService.findForUser(Number(userId));
  }

  @UseGuards(JwtGuard)
@Get('unread-count')
async unreadCount(@Query('userId') userId: string) {
    return {
      count: await this.notificationsService.unreadCount(
        Number(userId),
      ),
    };
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch('read-all')
  markAllAsRead(@Query('userId') userId: string) {
    return this.notificationsService.markAllAsRead(
      Number(userId),
    );
  }
}