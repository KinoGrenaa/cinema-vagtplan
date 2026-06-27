import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { MessagesService } from './messages.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateMessageDto } from './dto/create-message.dto';

function parseRequiredId(value: string | number, message: string) {
  const parsedId = Number(value);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new BadRequestException(message);
  }

  return parsedId;
}

function getRequiredUserId(req: any) {
  return parseRequiredId(req.user?.sub, 'Bruger skal være et gyldigt ID');
}

function getRequiredCinemaId(req: any) {
  return parseRequiredId(
    req.user?.cinemaId,
    'Vælg en biograf, før du bruger beskeder.',
  );
}

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.messagesService.getUnreadCount(
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(@Req() req: any) {
    return this.messagesService.findArchivedForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent')
  getSentMessages(@Req() req: any) {
    return this.messagesService.findSentForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getMessages(@Req() req: any) {
    return this.messagesService.findAllForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(@Req() req: any, @Body() body: CreateMessageDto) {
    return this.messagesService.create({
      ...body,
      senderId: getRequiredUserId(req),
      cinemaId: getRequiredCinemaId(req),
    });
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.markAsRead(
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/archive')
  archiveMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.archiveMessage(
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/unarchive')
  unarchiveMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.unarchiveMessage(
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/recall')
  recallMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.recallMessage(
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req),
    );
  }
}
