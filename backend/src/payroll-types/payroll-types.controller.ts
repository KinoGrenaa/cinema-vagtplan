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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PayrollTypesService } from './payroll-types.service';

@Controller('payroll-types')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MASTER')
export class PayrollTypesController {
  constructor(private payrollTypesService: PayrollTypesService) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @Get()
  findAll(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.payrollTypesService.findAll(req.user, cinemaId);
  }

  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      payrollCode: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      cinemaId?: number | string | null;
    },
  ) {
    return this.payrollTypesService.create(req.user, body);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      payrollCode?: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      isActive?: boolean;
      cinemaId?: number | string | null;
    },
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.payrollTypesService.update(
      req.user,
      this.parseRequiredId(id, 'Lønart skal være et gyldigt ID'),
      body,
      cinemaId,
    );
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string, @Query('cinemaId') cinemaId?: string) {
    return this.payrollTypesService.remove(
      req.user,
      this.parseRequiredId(id, 'Lønart skal være et gyldigt ID'),
      cinemaId,
    );
  }
}
