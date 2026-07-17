import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  MovieShowingsRequestUser,
  resolveMovieShowingsCinemaId,
} from './helpers/movie-showing-cinema-access';
import { getCopenhagenDayRange } from './helpers/movie-showing-date-range';

type FindMovieShowingsOptions = {
  date?: string;
  user: MovieShowingsRequestUser;
  selectedCinemaId?: number | null;
};

function parseMovieShowingDate(date?: string) {
  if (!date) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  const [year, month, day] = date
    .split('-')
    .map(Number);
  const parsedDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(
      'Dato skal være en gyldig dato',
    );
  }

  return date;
}

@Injectable()
export class MovieShowingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    options: FindMovieShowingsOptions,
  ) {
    const cinemaId =
      await resolveMovieShowingsCinemaId(
        this.prisma,
        options.user,
        options.selectedCinemaId,
      );
    const movieDate = parseMovieShowingDate(
      options.date,
    );

    const where: any = {
      cinemaId,
    };

    if (movieDate) {
      const { start, end } =
        getCopenhagenDayRange(movieDate);

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
