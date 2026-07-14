import {
  BadRequestException,
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

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

function parseRequiredId(
  value: string | number,
  message: string,
) {
  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new BadRequestException(message);
  }

  return parsedId;
}

function parseOptionalId(
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

  return parseRequiredId(value, message);
}

@Controller('messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.getUnreadCount(
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.findArchivedForUser(
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent')
  getSentMessages(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.findSentForUser(
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getMessages(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.findAllForUser(
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(
    @Req() req: any,
    @Body() body: CreateMessageDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.create(
      req.user,
      body,
      parseOptionalId(
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
    return this.messagesService.markAsRead(
      parseRequiredId(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/archive')
  archiveMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.archiveMessage(
      parseRequiredId(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/unarchive')
  unarchiveMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.unarchiveMessage(
      parseRequiredId(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/recall')
  recallMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.recallMessage(
      parseRequiredId(
        id,
        'Besked skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
