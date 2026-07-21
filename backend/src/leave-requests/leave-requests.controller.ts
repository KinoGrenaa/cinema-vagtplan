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
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
  ) {}

  private parsePositiveId(
    value: string | number,
    fieldName: string,
  ) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(
        `${fieldName} skal være et gyldigt ID`,
      );
    }

    return id;
  }

  private parseCinemaId(
    value?: string | number | null,
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    return this.parsePositiveId(value, 'Biograf');
  }

  private parseLeaveRequestId(value: string) {
    return this.parsePositiveId(
      value,
      'Fraværsansøgning',
    );
  }

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
      this.parseCinemaId(cinemaId),
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
      this.parseLeaveRequestId(id),
      body.status,
      this.parseCinemaId(cinemaId),
    );
  }
}
