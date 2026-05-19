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
}
