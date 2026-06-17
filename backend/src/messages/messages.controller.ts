import {
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

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtGuard)
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.messagesService.getUnreadCount(
      Number(req.user.sub),
      Number(req.user.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('archive')
  getArchivedMessages(@Req() req: any) {
    return this.messagesService.findArchivedForUser(
      Number(req.user.sub),
      Number(req.user.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('sent')
  getSentMessages(@Req() req: any) {
    return this.messagesService.findSentForUser(
      Number(req.user.sub),
      Number(req.user.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getMessages(@Req() req: any) {
    return this.messagesService.findAllForUser(
      Number(req.user.sub),
      Number(req.user.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createMessage(@Req() req: any, @Body() body: CreateMessageDto) {
    return this.messagesService.create({
      ...body,
      senderId: Number(req.user.sub),
      cinemaId: Number(req.user.cinemaId),
    });
  }

  @UseGuards(JwtGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch(':id/archive')
  archiveMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.archiveMessage(
      Number(id),
      Number(req.user.sub),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/unarchive')
  unarchiveMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.unarchiveMessage(
      Number(id),
      Number(req.user.sub),
      Number(req.user.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/recall')
  recallMessage(@Req() req: any, @Param('id') id: string) {
    return this.messagesService.recallMessage(Number(id), Number(req.user.sub));
  }
}
