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
import { StaffingRequestsService } from './staffing-requests.service';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';

type AuthRequest = {
  user: {
    sub: number;
    email: string;
    role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
    cinemaId: number | null;
  };
};

@UseGuards(JwtGuard)
@Controller('staffing-requests')
export class StaffingRequestsController {
  constructor(private readonly staffingRequestsService: StaffingRequestsService) {}

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

  private parseRequestId(value: string) {
    const requestId = Number(value);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new BadRequestException(
        'Bemandingsforespørgsel skal være et gyldigt ID',
      );
    }

    return requestId;
  }

  @Get()
  findAll(@Req() req: AuthRequest, @Query('cinemaId') cinemaId?: string) {
    return this.staffingRequestsService.findAll(
      req.user,
      this.parseCinemaId(cinemaId),
    );
  }

  @Get('mine')
  findMine(@Req() req: AuthRequest, @Query('cinemaId') cinemaId?: string) {
    return this.staffingRequestsService.findMine(
      req.user,
      this.parseCinemaId(cinemaId),
    );
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateStaffingRequestDto) {
    return this.staffingRequestsService.create(req.user, {
      ...dto,
      cinemaId: this.parseCinemaId(dto.cinemaId),
    });
  }

  @Patch(':id/accept')
  accept(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.accept(
      req.user,
      this.parseRequestId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @Patch(':id/reject')
  reject(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.reject(
      req.user,
      this.parseRequestId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @Patch(':id/cancel')
  cancel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.cancel(
      req.user,
      this.parseRequestId(id),
      this.parseCinemaId(cinemaId),
    );
  }
}
