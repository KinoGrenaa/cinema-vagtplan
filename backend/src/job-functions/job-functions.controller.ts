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
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { JobFunctionsService } from './job-functions.service';

@Controller('job-functions')
export class JobFunctionsController {
  constructor(private jobFunctionsService: JobFunctionsService) {}

  private parseCinemaId(cinemaId?: string) {
    return parseOptionalPositiveIntegerQuery(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
  }

  private parseJobFunctionId(id: string) {
    return parseRequiredPositiveInteger(
      id,
      'Jobfunktion skal være et gyldigt ID',
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(
    @Req() req,
    @Query('includeArchived') includeArchived?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.findAll(
      req.user,
      parseOptionalBooleanQuery(
        includeArchived,
        'Parameteren includeArchived skal være true eller false.',
      ),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('payroll-types')
  findPayrollTypes(@Req() req, @Query('cinemaId') cinemaId?: string) {
    return this.jobFunctionsService.findPayrollTypes(
      req.user,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Req() req, @Body() body) {
    return this.jobFunctionsService.create(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.update(
      req.user,
      this.parseJobFunctionId(id),
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
    return this.jobFunctionsService.remove(
      req.user,
      this.parseJobFunctionId(id),
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
    return this.jobFunctionsService.reactivate(
      req.user,
      this.parseJobFunctionId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/timing-rule')
  getTimingRule(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.jobFunctionsService.getTimingRule(
      req.user,
      this.parseJobFunctionId(id),
      this.parseCinemaId(cinemaId),
      parseOptionalBooleanQuery(
        includeInactive,
        'Parameteren includeInactive skal være true eller false.',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/timing-rule')
  upsertTimingRule(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.upsertTimingRule(
      req.user,
      this.parseJobFunctionId(id),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id/timing-rule')
  removeTimingRule(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.removeTimingRule(
      req.user,
      this.parseJobFunctionId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/users')
  getUsers(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.getUsers(
      req.user,
      this.parseJobFunctionId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/users')
  assignUser(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.assignUser(
      req.user,
      this.parseJobFunctionId(id),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id/users/:userId')
  removeUser(
    @Req() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.jobFunctionsService.removeUser(
      req.user,
      this.parseJobFunctionId(id),
      parseRequiredPositiveInteger(
        userId,
        'Medarbejder skal være et gyldigt ID',
      ),
      this.parseCinemaId(cinemaId),
    );
  }
}
