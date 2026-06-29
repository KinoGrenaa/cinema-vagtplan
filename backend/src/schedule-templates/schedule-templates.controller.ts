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
import { ScheduleTemplatesService } from './schedule-templates.service';

@Controller('schedule-templates')
export class ScheduleTemplatesController {
  constructor(private scheduleTemplatesService: ScheduleTemplatesService) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }
    return parsedId;
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
      includeArchived === 'true',
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(weekday, 'Ugedag skal være et gyldigt tal fra 1 til 7.'),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(weekday, 'Ugedag skal være et gyldigt tal fra 1 til 7.'),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      body,
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id/day-job-functions/:templateJobFunctionId/assignments/:assignmentId')
  removeAssignment(
    @Req() req,
    @Param('id') id: string,
    @Param('templateJobFunctionId') templateJobFunctionId: string,
    @Param('assignmentId') assignmentId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.scheduleTemplatesService.removeAssignment(
      req.user,
      this.parseRequiredId(id, 'Vagtsskabelon skal være et gyldigt ID'),
      this.parseRequiredId(
        templateJobFunctionId,
        'Skabelonlinje skal være et gyldigt ID',
      ),
      this.parseRequiredId(
        assignmentId,
        'Standardmedarbejder skal være et gyldigt ID',
      ),
      cinemaId,
    );
  }
}
