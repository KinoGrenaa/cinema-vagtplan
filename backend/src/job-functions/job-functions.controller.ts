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
import { JobFunctionsService } from './job-functions.service';

@Controller('job-functions')
export class JobFunctionsController {
  constructor(private jobFunctionsService: JobFunctionsService) {}

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
    return this.jobFunctionsService.findAll(
      req.user,
      includeArchived === 'true',
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Get('payroll-types')
  findPayrollTypes(@Req() req, @Query('cinemaId') cinemaId?: string) {
    return this.jobFunctionsService.findPayrollTypes(req.user, cinemaId);
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
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
    return this.jobFunctionsService.remove(
      req.user,
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
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
    return this.jobFunctionsService.reactivate(
      req.user,
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      cinemaId,
      includeInactive === 'true',
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      body,
      cinemaId,
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
      this.parseRequiredId(id, 'Jobfunktion skal være et gyldigt ID'),
      this.parseRequiredId(userId, 'Medarbejder skal være et gyldigt ID'),
      cinemaId,
    );
  }
}
