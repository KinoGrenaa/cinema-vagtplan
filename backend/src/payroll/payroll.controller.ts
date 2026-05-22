import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { PayrollService } from './payroll.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getPayrollReport(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payrollService.getPayrollReport(req.user, startDate, endDate);
  }
}
