import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leaveRequestsService: LeaveRequestsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllLeaveRequests() {
    return this.leaveRequestsService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  createLeaveRequest(
    @Body() body: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.create(body);
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
@Patch(':id/status')
updateStatus(
  @Param('id') id: string,
  @Body() body: UpdateLeaveStatusDto,
) {
  return this.leaveRequestsService.updateStatus(
    Number(id),
    body.status,
  );
}
}
