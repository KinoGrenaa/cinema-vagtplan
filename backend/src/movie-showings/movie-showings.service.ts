import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCopenhagenDayRange } from './helpers/movie-showing-date-range';

@Injectable()
export class MovieShowingsService {
  constructor(private prisma: PrismaService) {}

  findAll(date?: string) {
    const where: any = {};

    if (date) {
      const { start, end } = getCopenhagenDayRange(date);

      where.AND = [
        {
          startTime: {
            lte: end,
          },
        },
        {
          endTime: {
            gte: start,
          },
        },
      ];
    }

    return this.prisma.movieShowing.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}
