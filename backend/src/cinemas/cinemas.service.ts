import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CinemasService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return cinema;
  }

  async updateSettings(
    id: number,
    data: {
      allowShiftTradePool?: boolean;
      allowShiftTradeDirect?: boolean;
      payrollRulesEnabled?: boolean;
    },
  ) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return this.prisma.cinema.update({
      where: { id },
      data: {
        allowShiftTradePool: data.allowShiftTradePool,
        allowShiftTradeDirect: data.allowShiftTradeDirect,
        payrollRulesEnabled: data.payrollRulesEnabled,
      },
    });
  }
}
