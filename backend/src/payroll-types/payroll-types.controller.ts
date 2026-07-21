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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { PayrollTypesService } from './payroll-types.service';

type PayrollTypeCreateBody = {
  name: string;
  payrollCode: string;
  exportCode?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  cinemaId?: number | string | null;
};

type PayrollTypeUpdateBody = {
  name?: string;
  payrollCode?: string;
  exportCode?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  isActive?: boolean;
  cinemaId?: number | string | null;
};

@Controller('payroll-types')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MASTER')
export class PayrollTypesController {
  constructor(private payrollTypesService: PayrollTypesService) {}

  private parseOptionalBodyCinemaId(value: unknown) {
    if (value === undefined || value === null) {
      return value;
    }

    return parseRequiredPositiveInteger(
      value,
      'Biograf skal være et gyldigt ID',
    );
  }

  @Get()
  findAll(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    return this.payrollTypesService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Post()
  create(@Req() req: any, @Body() body: PayrollTypeCreateBody) {
    return this.payrollTypesService.create(req.user, {
      ...body,
      cinemaId: this.parseOptionalBodyCinemaId(body.cinemaId),
    });
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: PayrollTypeUpdateBody,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.payrollTypesService.update(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Lønart skal være et gyldigt ID',
      ),
      {
        ...body,
        cinemaId: this.parseOptionalBodyCinemaId(body.cinemaId),
      },
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.payrollTypesService.remove(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Lønart skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
