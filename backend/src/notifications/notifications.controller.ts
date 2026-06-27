import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @UseGuards(JwtGuard)
  @Get()
  getForUser(@Req() req: any) {
    return this.notificationsService.findForUser(Number(req.user.sub));
  }

  @UseGuards(JwtGuard)
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return {
      count: await this.notificationsService.unreadCount(Number(req.user.sub)),
    };
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(
      this.parseRequiredId(id, 'Notifikation skal være et gyldigt ID'),
      Number(req.user.sub),
    );
  }

  @UseGuards(JwtGuard)
  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(Number(req.user.sub));
  }
}
