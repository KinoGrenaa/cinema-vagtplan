import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MovieShowingsService {
  constructor(private prisma: PrismaService) {}

  findAll(date?: string) {
    const where: any = {};

    if (date) {
      where.startTime = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }

    return this.prisma.movieShowing.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}