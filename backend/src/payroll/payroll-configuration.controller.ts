import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { PayrollVersioningService } from './payroll-versioning.service';

function id(value: string, label = 'ID') {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${label} skal være et gyldigt ID.`);
  }
  return parsed;
}

@Controller()
@UseGuards(JwtGuard)
export class PayrollConfigurationController {
  constructor(private readonly versioning: PayrollVersioningService) {}

  @Get('cinemas/:cinemaId/payroll-configuration')
  getConfiguration(@Req() req: any, @Param('cinemaId') cinemaId: string) {
    return this.versioning.getPayrollConfiguration(req.user, id(cinemaId));
  }

  @Get('cinemas/:cinemaId/payroll-configuration/history')
  getConfigurationHistory(@Req() req: any, @Param('cinemaId') cinemaId: string) {
    return this.versioning.getPayrollConfiguration(req.user, id(cinemaId));
  }

  @Post('cinemas/:cinemaId/payroll-configuration/impact-preview')
  previewConfiguration(
    @Req() req: any,
    @Param('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.previewPayrollMode(req.user, id(cinemaId), body);
  }

  @Post('cinemas/:cinemaId/payroll-configuration/versions')
  createConfigurationVersion(
    @Req() req: any,
    @Param('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.createPayrollModeVersion(req.user, id(cinemaId), body);
  }

  @Get('users/:userId/cinemas/:cinemaId/pay-rates')
  getPayRates(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('cinemaId') cinemaId: string,
  ) {
    return this.versioning.getPayRates(req.user, id(userId), id(cinemaId));
  }

  @Post('users/:userId/cinemas/:cinemaId/pay-rates/impact-preview')
  previewPayRate(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.previewPayRate(
      req.user,
      id(userId),
      id(cinemaId),
      body,
    );
  }

  @Post('users/:userId/cinemas/:cinemaId/pay-rates')
  createPayRate(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.createPayRateVersion(
      req.user,
      id(userId),
      id(cinemaId),
      body,
    );
  }

  @Post('users/:userId/cinemas/:cinemaId/pay-rates/:versionId/cancel')
  cancelPayRate(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('cinemaId') cinemaId: string,
    @Param('versionId') versionId: string,
    @Body() body: any,
  ) {
    return this.versioning.cancelFuturePayRate(
      req.user,
      id(userId),
      id(cinemaId),
      id(versionId),
      body,
    );
  }
}

@Controller('pay-rules')
@UseGuards(JwtGuard)
export class PayRulesController {
  constructor(private readonly versioning: PayrollVersioningService) {}

  @Get()
  list(@Req() req: any, @Query('cinemaId') cinemaId: string) {
    return this.versioning.listPayRules(req.user, id(cinemaId));
  }

  @Post('impact-preview')
  previewCreate(
    @Req() req: any,
    @Query('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.previewInitialPayRule(req.user, id(cinemaId), body);
  }

  @Post()
  create(
    @Req() req: any,
    @Query('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.createPayRule(req.user, id(cinemaId), body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') ruleId: string, @Body() body: any) {
    return this.versioning.updatePayRule(req.user, id(ruleId), body);
  }

  @Post(':id/copy')
  copy(@Req() req: any, @Param('id') ruleId: string, @Body() body: any) {
    return this.versioning.copyPayRule(req.user, id(ruleId), body);
  }

  @Post(':id/versions/impact-preview')
  previewVersion(@Req() req: any, @Param('id') ruleId: string, @Body() body: any) {
    return this.versioning.previewPayRuleVersion(req.user, id(ruleId), body);
  }

  @Post(':id/versions')
  createVersion(@Req() req: any, @Param('id') ruleId: string, @Body() body: any) {
    return this.versioning.createPayRuleVersion(req.user, id(ruleId), body);
  }

  @Post(':id/deactivation/impact-preview')
  previewDeactivation(
    @Req() req: any,
    @Param('id') ruleId: string,
    @Body() body: any,
  ) {
    return this.versioning.previewPayRuleDeactivation(
      req.user,
      id(ruleId),
      body,
    );
  }

  @Post(':id/deactivate')
  deactivate(
    @Req() req: any,
    @Param('id') ruleId: string,
    @Body() body: any,
  ) {
    return this.versioning.deactivatePayRule(req.user, id(ruleId), body);
  }

  @Post(':id/versions/:versionId/cancel')
  cancelVersion(
    @Req() req: any,
    @Param('id') ruleId: string,
    @Param('versionId') versionId: string,
    @Body() body: any,
  ) {
    return this.versioning.cancelFuturePayRuleVersion(
      req.user,
      id(ruleId),
      id(versionId),
      body,
    );
  }

  @Delete(':id')
  archive(@Req() req: any, @Param('id') ruleId: string) {
    return this.versioning.archivePayRule(req.user, id(ruleId));
  }
}

@Controller('payroll-special-days')
@UseGuards(JwtGuard)
export class PayrollSpecialDaysController {
  constructor(private readonly versioning: PayrollVersioningService) {}

  @Get()
  list(@Req() req: any, @Query('cinemaId') cinemaId: string) {
    return this.versioning.listSpecialDays(req.user, id(cinemaId));
  }

  @Post('impact-preview')
  preview(
    @Req() req: any,
    @Query('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.previewSpecialDay(req.user, id(cinemaId), body);
  }

  @Post()
  create(
    @Req() req: any,
    @Query('cinemaId') cinemaId: string,
    @Body() body: any,
  ) {
    return this.versioning.createSpecialDay(req.user, id(cinemaId), body);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') specialDayId: string,
    @Body() body: any,
  ) {
    return this.versioning.updateSpecialDay(req.user, id(specialDayId), body);
  }

  @Delete(':id')
  archive(
    @Req() req: any,
    @Param('id') specialDayId: string,
    @Body() body: any,
  ) {
    return this.versioning.archiveSpecialDay(req.user, id(specialDayId), body);
  }
}
