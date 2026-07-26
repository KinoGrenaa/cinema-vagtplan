import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  JwtGuard,
} from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import {
  CreateMessageDto,
} from './dto/create-message.dto';
import {
  MessagesService,
} from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService:
      MessagesService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.getUnreadCount(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('page')
  getInboxPage(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('limit')
    limit?: string,
    @Query('beforeId')
    beforeId?: string,
    @Query('targetId')
    targetId?: string,
  ) {
    return this.messagesService.findInboxPageForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal beskeder skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Beskedcursor skal være et gyldigt ID',
          ),
        targetId:
          parseOptionalPositiveIntegerQuery(
            targetId,
            'Målbesked skal være et gyldigt ID',
          ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive/page')
  getArchivedMessagePage(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('section')
    section?: string,
    @Query('limit')
    limit?: string,
    @Query('beforeId')
    beforeId?: string,
  ) {
    const normalizedSection =
      section === 'sent'
        ? 'sent'
        : 'received';

    return this.messagesService.findArchivedPageForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        section:
          normalizedSection,
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal beskeder skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Beskedcursor skal være et gyldigt ID',
          ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.findArchivedForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent/page')
  getSentMessagePage(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('limit')
    limit?: string,
    @Query('beforeId')
    beforeId?: string,
  ) {
    return this.messagesService.findSentPageForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal beskeder skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Beskedcursor skal være et gyldigt ID',
          ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent')
  getSentMessages(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.findSentForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getMessages(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.findAllForUser(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(
    @Req() req: any,
    @Body()
    body: CreateMessageDto,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.create(
      req.user,
      body,
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
    @Param('id')
    id: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.markAsRead(
      parseRequiredPositiveInteger(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/archive')
  archiveMessage(
    @Req() req: any,
    @Param('id')
    id: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.archiveMessage(
      parseRequiredPositiveInteger(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/unarchive')
  unarchiveMessage(
    @Req() req: any,
    @Param('id')
    id: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.unarchiveMessage(
      parseRequiredPositiveInteger(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/recall')
  recallMessage(
    @Req() req: any,
    @Param('id')
    id: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.messagesService.recallMessage(
      parseRequiredPositiveInteger(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
