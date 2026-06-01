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
import { LeaveRequestsService } from './leave-requests.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leaveRequestsService: LeaveRequestsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllLeaveRequests(@Req() req: any) {
    return this.leaveRequestsService.findAll(req.user);
  }

  @UseGuards(JwtGuard)
  @Post()
  createLeaveRequest(@Req() req: any, @Body() body: CreateLeaveRequestDto) {
    return this.leaveRequestsService.create(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateLeaveStatusDto,
  ) {
    return this.leaveRequestsService.updateStatus(
      req.user,
      Number(id),
      body.status,
    );
  }
}
