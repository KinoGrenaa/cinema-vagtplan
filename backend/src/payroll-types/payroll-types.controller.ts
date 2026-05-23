import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

  @Get()
  findAll(@Req() req: any) {
    return this.payrollTypesService.findAll(req.user);
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
    },
  ) {
    return this.payrollTypesService.update(req.user, Number(id), body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.payrollTypesService.remove(req.user, Number(id));
  }
}
