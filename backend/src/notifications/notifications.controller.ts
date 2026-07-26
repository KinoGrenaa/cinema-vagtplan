import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalBooleanQuery,
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
} from './helpers/notification-page';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('page')
  getPageForUser(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findPageForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal notifikationer skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Notifikationscursor skal være et gyldigt ID',
          ),
        unreadOnly:
          parseOptionalBooleanQuery(
            unreadOnly,
            'Ulæst-filter skal være true eller false',
          ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getForUser(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId =
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      );

    return this.notificationsService
      .findPageForUser(
        req.user,
        selectedCinemaId,
        {
          limit:
            DEFAULT_NOTIFICATION_PAGE_SIZE,
        },
      )
      .then((page) => page.items);
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
          parseOptionalPositiveIntegerQuery(
            cinemaId,
            'Biograf skal være et gyldigt ID',
          ),
        ),
    };
  }

  @UseGuards(JwtGuard)
  @Delete('read')
  clearRead(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.notificationsService.clearRead(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch('read-all')
  markAllAsRead(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.notificationsService.markAllAsRead(
      req.user,
      parseOptionalPositiveIntegerQuery(
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
      parseRequiredPositiveInteger(
        id,
        'Notifikation skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
