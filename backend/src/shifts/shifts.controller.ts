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
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly shiftsService: ShiftsService,
  ) {}

  private parseRequiredId(
    value: string | number,
    message: string,
  ) {
    const parsedId = Number(value);

    if (
      !Number.isInteger(parsedId) ||
      parsedId <= 0
    ) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  private parseCinemaId(
    value?: string | number | null,
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    return this.parseRequiredId(
      value,
      'Biograf skal være et gyldigt ID',
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllShifts(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.findAll(
      req.user,
      date,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createShift(
    @Req() req: any,
    @Body() body: CreateShiftDto,
  ) {
    return this.shiftsService.createShift(
      req.user,
      body,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateShift(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(
      req.user,
      this.parseRequiredId(
        id,
        'Vagt skal være et gyldigt ID',
      ),
      body,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id')
  deleteShift(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.deleteShift(
      req.user,
      this.parseRequiredId(
        id,
        'Vagt skal være et gyldigt ID',
      ),
      this.parseCinemaId(cinemaId),
    );
  }
}
