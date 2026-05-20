import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { MessagesService } from './messages.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(
    @Query('userId') userId: string,
    @Query('cinemaId') cinemaId: string,
  ) {
    return this.messagesService.getUnreadCount(
      Number(userId),
      Number(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(
    @Query('userId') userId: string,
    @Query('cinemaId') cinemaId: string,
  ) {
    return this.messagesService.findArchivedForUser(
      Number(userId),
      Number(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
@Get('sent')
getSentMessages(
  @Query('userId') userId: string,
  @Query('cinemaId') cinemaId: string,
) {
  return this.messagesService.findSentForUser(
    Number(userId),
    Number(cinemaId),
  );
}

  @UseGuards(JwtGuard)
  @Get()
  getMessages(
    @Query('userId') userId: string,
    @Query('cinemaId') cinemaId: string,
  ) {
    return this.messagesService.findAllForUser(
      Number(userId),
      Number(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(@Body() body: CreateMessageDto) {
    return this.messagesService.create(body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch(':id/archive')
  archiveMessage(
    @Param('id') id: string,
    @Body() body: { userId: number },
  ) {
    return this.messagesService.archiveMessage(
      Number(id),
      body.userId,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/unarchive')
  unarchiveMessage(@Param('id') id: string) {
    return this.messagesService.unarchiveMessage(Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch(':id/recall')
  recallMessage(
    @Param('id') id: string,
    @Body() body: { userId: number },
  ) {
    return this.messagesService.recallMessage(
      Number(id),
      body.userId,
    );
  }
}