import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('cinemas')
export class CinemasController {
  constructor(private cinemasService: CinemasService) {}

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cinemasService.findOne(Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  updateSettings(
    @Param('id') id: string,
    @Body()
    body: {
      allowShiftTradePool?: boolean;
      allowShiftTradeDirect?: boolean;
    },
  ) {
    return this.cinemasService.updateSettings(Number(id), body);
  }
}