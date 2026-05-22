import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getForUser(@Query('userId') userId: string) {
    return this.notificationsService.findForUser(Number(userId));
  }

  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard)
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return {
      count: await this.notificationsService.unreadCount(req.user.sub),
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
    return this.notificationsService.markAllAsRead(Number(userId));
  }
}
