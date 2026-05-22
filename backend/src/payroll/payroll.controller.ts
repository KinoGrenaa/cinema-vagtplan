import {
  Controller,
  Get,
  Header,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { PayrollService } from './payroll.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('payroll')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MASTER')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get()
  getPayrollReport(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    return this.payrollService.getPayrollReport(
      req.user,
      startDate,
      endDate,
      userId,
    );
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    const csv = await this.payrollService.exportPayrollCsv(
      req.user,
      startDate,
      endDate,
      userId,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${startDate}-til-${endDate}.csv"`,
    );

    return res.send('\uFEFF' + csv);
  }
}
