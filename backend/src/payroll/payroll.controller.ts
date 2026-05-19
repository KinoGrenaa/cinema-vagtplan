import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Get()
  getPayrollReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payrollService.getPayrollReport(startDate, endDate);
  }
}
