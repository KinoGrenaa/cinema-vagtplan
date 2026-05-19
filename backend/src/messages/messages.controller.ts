import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

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
  createMessage(
    @Body()
    body: {
      subject: string;
      body: string;
      cinemaId: number;
      senderId: number;
      receiverId?: number | null;
      isBroadcast: boolean;
    },
  ) {
    return this.messagesService.create(body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(Number(id));
  }
}