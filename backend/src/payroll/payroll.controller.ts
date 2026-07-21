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
import {
  normalizePayrollDate,
  normalizePayrollPeriod,
  parsePayrollOptionalBodyId,
  parsePayrollOptionalQueryId,
  parsePayrollRequiredId,
} from './helpers/payroll-input';

@Controller('payroll')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MASTER')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  private parseQueryCinemaId(value: unknown) {
    return parsePayrollOptionalQueryId(
      value,
      'Biograf skal være et gyldigt ID',
    );
  }

  private parseBodyCinemaId(value: unknown) {
    return parsePayrollOptionalBodyId(
      value,
      'Biograf skal være et gyldigt ID',
    );
  }

  private parseQueryUserId(value: unknown) {
    return parsePayrollOptionalQueryId(
      value,
      'Bruger skal være et gyldigt ID',
    )?.toString();
  }

  @Get()
  getPayrollReport(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);

    return this.payrollService.getPayrollReport(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryUserId(userId),
      this.parseQueryCinemaId(cinemaId),
    );
  }

  @Get('period')
  getPeriod(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);

    return this.payrollService.getPeriod(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryCinemaId(cinemaId),
    );
  }

  @Get('period-for-date')
  @Roles('EMPLOYEE', 'ADMIN', 'MASTER')
  getPeriodForDate(
    @Req() req: any,
    @Query('date') date: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.payrollService.getPayrollPeriodForDate(
      req.user,
      normalizePayrollDate(date, 'Dato skal være gyldig'),
      this.parseQueryCinemaId(cinemaId),
    );
  }

  @Get('audit-history')
  getAuditHistory(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);

    return this.payrollService.getPayrollAuditHistory(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryCinemaId(cinemaId),
    );
  }

  @Post('period/lock')
  lockPeriod(
    @Req() req: any,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('cinemaId') cinemaId?: number | string | null,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);

    return this.payrollService.lockPeriod(
      req.user,
      period.startDate,
      period.endDate,
      this.parseBodyCinemaId(cinemaId),
    );
  }

  @Post('period/:id/unlock')
  unlockPeriod(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
    @Body('cinemaId') cinemaId?: number | string | null,
  ) {
    return this.payrollService.unlockPeriod(
      req.user,
      parsePayrollRequiredId(
        id,
        'Lønperiode skal være et gyldigt ID',
      ),
      note,
      this.parseBodyCinemaId(cinemaId),
    );
  }

  @Post('time-entry/:id/unlock')
  unlockTimeEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
    @Body('cinemaId') cinemaId?: number | string | null,
  ) {
    return this.payrollService.unlockTimeEntry(
      req.user,
      parsePayrollRequiredId(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      note,
      this.parseBodyCinemaId(cinemaId),
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
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);
    const csv = await this.payrollService.exportPayrollCsv(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryUserId(userId),
      this.parseQueryCinemaId(cinemaId),
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${period.startDate}-til-${period.endDate}.csv"`,
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
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);
    const buffer = await this.payrollService.exportPayrollXlsx(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryUserId(userId),
      this.parseQueryCinemaId(cinemaId),
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${period.startDate}-til-${period.endDate}.xlsx"`,
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
    @Query('cinemaId') cinemaId?: string,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);
    const buffer = await this.payrollService.exportPayrollPdf(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryUserId(userId),
      this.parseQueryCinemaId(cinemaId),
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${period.startDate}-til-${period.endDate}.pdf"`,
    );

    return res.send(buffer);
  }

  @Get('export/uniconta')
  async exportUniconta(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId: string | undefined,
    @Query('cinemaId') cinemaId: string | undefined,
    @Res() res: Response,
  ) {
    const period = normalizePayrollPeriod(startDate, endDate);
    const csv = await this.payrollService.exportUnicontaCsv(
      req.user,
      period.startDate,
      period.endDate,
      this.parseQueryUserId(userId),
      this.parseQueryCinemaId(cinemaId),
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="uniconta-payroll-${period.startDate}-${period.endDate}.csv"`,
    );

    return res.send(csv);
  }
}
