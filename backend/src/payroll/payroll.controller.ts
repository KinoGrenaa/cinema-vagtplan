import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Buffer } from 'buffer';

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

  @Get('period')
  getPeriod(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payrollService.getPeriod(req.user, startDate, endDate);
  }

  @Get('audit-history')
  getAuditHistory(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payrollService.getPayrollAuditHistory(
      req.user,
      startDate,
      endDate,
    );
  }

  @Post('period/lock')
  lockPeriod(
    @Req() req: any,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.payrollService.lockPeriod(req.user, startDate, endDate);
  }

  @Post('period/:id/unlock')
  unlockPeriod(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.payrollService.unlockPeriod(req.user, Number(id), note);
  }

  @Post('time-entry/:id/unlock')
  unlockTimeEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.payrollService.unlockTimeEntry(req.user, Number(id), note);
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

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportXlsx(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    const buffer = await this.payrollService.exportPayrollXlsx(
      req.user,
      startDate,
      endDate,
      userId,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${startDate}-til-${endDate}.xlsx"`,
    );

    return res.send(Buffer.from(buffer));
  }

  @Get('export/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    const buffer = await this.payrollService.exportPayrollPdf(
      req.user,
      startDate,
      endDate,
      userId,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${startDate}-til-${endDate}.pdf"`,
    );

    return res.send(buffer);
  }
  @Get('export/uniconta')
  async exportUniconta(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Res() res?,
  ) {
    const csv = await this.payrollService.exportUnicontaCsv(
      req.user,
      startDate,
      endDate,
      userId,
    );

    res.setHeader('Content-Type', 'text/csv');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="uniconta-payroll-${startDate}-${endDate}.csv"`,
    );

    return res.send(csv);
  }
}
