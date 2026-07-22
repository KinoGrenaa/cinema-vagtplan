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
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
  ) {}

  private parseIncludeAll(value?: string) {
    if (value === undefined || value === '') {
      return false;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new BadRequestException(
      'includeAll skal være true eller false',
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllLeaveRequests(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
    @Query('includeAll') includeAll?: string,
  ) {
    return this.leaveRequestsService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      this.parseIncludeAll(includeAll),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createLeaveRequest(
    @Req() req: any,
    @Body() body: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.create(
      req.user,
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateLeaveStatusDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.leaveRequestsService.updateStatus(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Fraværsansøgning skal være et gyldigt ID',
      ),
      body.status,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
