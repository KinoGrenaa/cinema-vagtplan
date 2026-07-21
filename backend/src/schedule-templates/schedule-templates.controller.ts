import {
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
import {
  parseOptionalBooleanQuery,
  parseOptionalPositiveIntegerQuery,
  parseRequiredIntegerInRange,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { ScheduleTemplatesService } from './schedule-templates.service';

@Controller('schedule-templates')
export class ScheduleTemplatesController {
  constructor(private scheduleTemplatesService: ScheduleTemplatesService) {}

  private parseCinemaId(cinemaId?: string) {
    return parseOptionalPositiveIntegerQuery(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
  }

  private parseTemplateId(id: string) {
    return parseRequiredPositiveInteger(
      id,
      'Vagtsskabelon skal være et gyldigt ID',
    );
  }

  private parseWeekday(weekday: string) {
    return parseRequiredIntegerInRange(
      weekday,
      1,
      7,
      'Ugedag skal være et gyldigt tal fra 1 til 7.',
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(
    @Req() req,
    @Query('includeArchived') includeArchived?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.findAll(
      req.user,
      parseOptionalBooleanQuery(
        includeArchived,
        'Parameteren includeArchived skal være true eller false.',
      ),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Req() req, @Body() body) {
    return this.scheduleTemplatesService.create(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.findOne(
      req.user,
      this.parseTemplateId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.update(
      req.user,
      this.parseTemplateId(id),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.remove(
      req.user,
      this.parseTemplateId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/reactivate')
  reactivate(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.reactivate(
      req.user,
      this.parseTemplateId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/days')
  findDays(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.findDays(
      req.user,
      this.parseTemplateId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/days/:weekday')
  upsertDay(
    @Req() req,
    @Param('id') id: string,
    @Param('weekday') weekday: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.upsertDay(
      req.user,
      this.parseTemplateId(id),
      this.parseWeekday(weekday),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/days/:weekday/job-functions')
  addJobFunction(
    @Req() req,
    @Param('id') id: string,
    @Param('weekday') weekday: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.addJobFunction(
      req.user,
      this.parseTemplateId(id),
      this.parseWeekday(weekday),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/day-job-functions/:templateJobFunctionId')
  updateJobFunction(
    @Req() req,
    @Param('id') id: string,
    @Param('templateJobFunctionId') templateJobFunctionId: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.updateJobFunction(
      req.user,
      this.parseTemplateId(id),
      parseRequiredPositiveInteger(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id/day-job-functions/:templateJobFunctionId')
  removeJobFunction(
    @Req() req,
    @Param('id') id: string,
    @Param('templateJobFunctionId') templateJobFunctionId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.removeJobFunction(
      req.user,
      this.parseTemplateId(id),
      parseRequiredPositiveInteger(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/day-job-functions/:templateJobFunctionId/assignments')
  addAssignment(
    @Req() req,
    @Param('id') id: string,
    @Param('templateJobFunctionId') templateJobFunctionId: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.addAssignment(
      req.user,
      this.parseTemplateId(id),
      parseRequiredPositiveInteger(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(
    ':id/day-job-functions/:templateJobFunctionId/assignments/:assignmentId',
  )
  removeAssignment(
    @Req() req,
    @Param('id') id: string,
    @Param('templateJobFunctionId') templateJobFunctionId: string,
    @Param('assignmentId') assignmentId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.removeAssignment(
      req.user,
      this.parseTemplateId(id),
      parseRequiredPositiveInteger(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      parseRequiredPositiveInteger(
        assignmentId,
        'Standardmedarbejder skal være et gyldigt ID',
      ),
      this.parseCinemaId(cinemaId),
    );
  }
}
