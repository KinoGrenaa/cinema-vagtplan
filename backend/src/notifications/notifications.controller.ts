import {
  BadRequestException,
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
  constructor(
    private notificationsService: NotificationsService,
  ) {}

  private parseRequiredId(
    value: string | number,
    message: string,
  ) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  private parseOptionalId(
    value: string | number | null | undefined,
    message: string,
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    return this.parseRequiredId(value, message);
  }

  @UseGuards(JwtGuard)
  @Get()
  getForUser(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.notificationsService.findForUser(
      req.user,
      this.parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('unread-count')
  async unreadCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return {
      count:
        await this.notificationsService.unreadCount(
          req.user,
          this.parseOptionalId(
            cinemaId,
            'Biograf skal være et gyldigt ID',
          ),
        ),
    };
  }

  @UseGuards(JwtGuard)
  @Patch('read-all')
  markAllAsRead(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.notificationsService.markAllAsRead(
      req.user,
      this.parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.notificationsService.markAsRead(
      this.parseRequiredId(
        id,
        'Notifikation skal være et gyldigt ID',
      ),
      req.user,
      this.parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
