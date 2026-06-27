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

function parseOptionalId(value: string | number | null | undefined, message: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return parseRequiredId(value, message);
}

function getRequiredUserId(req: any) {
  return parseRequiredId(req.user?.sub, 'Bruger skal være et gyldigt ID');
}

function getRequiredCinemaId(req: any, selectedCinemaId?: string | number) {
  const userCinemaId = parseOptionalId(
    req.user?.cinemaId,
    'Brugerens biograf skal være et gyldigt ID',
  );

  if (userCinemaId) {
    return userCinemaId;
  }

  if (req.user?.role === 'MASTER') {
    return parseRequiredId(
      selectedCinemaId as string | number,
      'Vælg en biograf, før du bruger beskeder.',
    );
  }

  throw new BadRequestException('Vælg en biograf, før du bruger beskeder.');
}

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.messagesService.getUnreadCount(
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.messagesService.findArchivedForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent')
  getSentMessages(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.messagesService.findSentForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getMessages(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.messagesService.findAllForUser(
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(
    @Req() req: any,
    @Body() body: CreateMessageDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.create({
      ...body,
      senderId: getRequiredUserId(req),
      cinemaId: getRequiredCinemaId(req, cinemaId),
    });
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.messagesService.markAsRead(
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
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
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
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
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
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
      parseRequiredId(id, 'Besked skal være et gyldigt ID'),
      getRequiredUserId(req),
      getRequiredCinemaId(req, cinemaId),
    );
  }
}
