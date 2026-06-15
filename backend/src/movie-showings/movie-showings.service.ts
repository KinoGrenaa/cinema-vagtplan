import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MovieShowingsService {
  constructor(private prisma: PrismaService) {}

  private copenhagenDateTimeToUtc(
    date: string,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ) {
    const [year, month, day] = date.split('-').map(Number);

    const utcGuess = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
    );

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(utcGuess);

    const getPart = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    const localAsUtc = Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour'),
      getPart('minute'),
      getPart('second'),
      millisecond,
    );

    const wantedAsUtc = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    );

    const offset = localAsUtc - utcGuess.getTime();

    return new Date(wantedAsUtc - offset);
  }

  private getCopenhagenDayRange(date: string) {
    return {
      start: this.copenhagenDateTimeToUtc(date, 0, 0, 0, 0),
      end: this.copenhagenDateTimeToUtc(date, 23, 59, 59, 999),
    };
  }

  findAll(date?: string) {
    const where: any = {};

    if (date) {
      const { start, end } = this.getCopenhagenDayRange(date);

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
