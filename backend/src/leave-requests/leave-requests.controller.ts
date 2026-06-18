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

import { LeaveRequestsService } from './leave-requests.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leaveRequestsService: LeaveRequestsService) {}

  private parseCinemaId(value?: string | number | null) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const cinemaId = Number(value);

    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException('Biograf skal være et gyldigt ID');
    }

    return cinemaId;
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllLeaveRequests(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.leaveRequestsService.findAll(
      req.user,
      this.parseCinemaId(cinemaId),
    );
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
