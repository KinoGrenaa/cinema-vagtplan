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
import {
  LeaveStatus,
} from '@prisma/client';

import {
  JwtGuard,
} from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import {
  CreateLeaveRequestDto,
} from './dto/create-leave-request.dto';
import {
  LEAVE_REQUEST_STATUSES,
} from './helpers/leave-request-page';
import {
  UpdateLeaveStatusDto,
} from './dto/update-leave-status.dto';
import {
  LeaveRequestsService,
} from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService:
      LeaveRequestsService,
  ) {}

  private parseIncludeAll(
    value?: string,
  ) {
    if (
      value === undefined ||
      value === ''
    ) {
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

  private parseStatuses(
    value?: string,
  ): LeaveStatus[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === '') {
      return [];
    }

    const statuses =
      value
        .split(',')
        .filter(Boolean) as
        LeaveStatus[];

    if (
      statuses.some(
        (status) =>
          !LEAVE_REQUEST_STATUSES.includes(
            status,
          ),
      )
    ) {
      throw new BadRequestException(
        'Fraværsstatusfilter er ugyldigt',
      );
    }

    return [
      ...new Set(
        statuses,
      ),
    ];
  }

  @UseGuards(JwtGuard)
  @Get('page')
  getLeaveRequestPage(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('includeAll')
    includeAll?: string,
    @Query('limit')
    limit?: string,
    @Query('beforeId')
    beforeId?: string,
    @Query('targetId')
    targetId?: string,
    @Query('statuses')
    statuses?: string,
    @Query('startDate')
    startDate?: string,
    @Query('endDate')
    endDate?: string,
  ) {
    return this.leaveRequestsService.findPage(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        includeAll:
          this.parseIncludeAll(
            includeAll,
          ),
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal fraværsansøgninger skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Fraværscursor skal være et gyldigt ID',
          ),
        targetId:
          parseOptionalPositiveIntegerQuery(
            targetId,
            'Målrettet fraværsansøgning skal være et gyldigt ID',
          ),
        statuses:
          this.parseStatuses(
            statuses,
          ),
        startDate,
        endDate,
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllLeaveRequests(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('includeAll')
    includeAll?: string,
  ) {
    return this.leaveRequestsService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      this.parseIncludeAll(
        includeAll,
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  createLeaveRequest(
    @Req() req: any,
    @Body()
    body:
      CreateLeaveRequestDto,
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
    @Param('id')
    id: string,
    @Body()
    body:
      UpdateLeaveStatusDto,
    @Query('cinemaId')
    cinemaId?: string,
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
