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
import { JwtGuard } from '../auth/jwt.guard';
import { StaffingRequestsService } from './staffing-requests.service';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';

type AuthRequest = {
  user: {
    sub: number;
    email: string;
    role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
    cinemaId: number;
  };
};

@UseGuards(JwtGuard)
@Controller('staffing-requests')
export class StaffingRequestsController {
  constructor(
    private readonly staffingRequestsService: StaffingRequestsService,
  ) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.staffingRequestsService.findAll(req.user);
  }

  @Get('mine')
  findMine(@Req() req: AuthRequest) {
    return this.staffingRequestsService.findMine(req.user);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateStaffingRequestDto) {
    return this.staffingRequestsService.create(req.user, dto);
  }

  @Patch(':id/accept')
  accept(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.staffingRequestsService.accept(req.user, Number(id));
  }

  @Patch(':id/reject')
  reject(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.staffingRequestsService.reject(req.user, Number(id));
  }

  @Patch(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.staffingRequestsService.cancel(req.user, Number(id));
  }
}
