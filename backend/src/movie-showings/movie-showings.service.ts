import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCopenhagenDayRange } from './helpers/movie-showing-date-range';

type MovieShowingsRequestUser = {
  role?: string;
  cinemaId?: number | string | null;
};

type FindMovieShowingsOptions = {
  date?: string;
  user: MovieShowingsRequestUser;
  selectedCinemaId?: number | null;
};

function parsePositiveInteger(value: number | string | null | undefined) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function parseMovieShowingDate(date?: string) {
  if (!date) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Dato skal være en gyldig dato');
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new BadRequestException('Dato skal være en gyldig dato');
  }

  return date;
}

function resolveMovieShowingsCinemaId({
  user,
  selectedCinemaId,
}: Pick<FindMovieShowingsOptions, 'user' | 'selectedCinemaId'>) {
  const selectedCinema = parsePositiveInteger(selectedCinemaId);

  if (selectedCinemaId != null && !selectedCinema) {
    throw new BadRequestException('Ugyldigt biografvalg.');
  }

  if (user.role === 'MASTER') {
    if (!selectedCinema) {
      throw new BadRequestException('Biograf skal vælges.');
    }

    return selectedCinema;
  }

  const userCinemaId = parsePositiveInteger(user.cinemaId);

  if (!userCinemaId) {
    throw new ForbiddenException('Brugeren er ikke tilknyttet en biograf.');
  }

  if (selectedCinema && selectedCinema !== userCinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne biograf.');
  }

  return userCinemaId;
}

@Injectable()
export class MovieShowingsService {
  constructor(private prisma: PrismaService) {}

  findAll(options: FindMovieShowingsOptions) {
    const cinemaId = resolveMovieShowingsCinemaId(options);
    const movieDate = parseMovieShowingDate(options.date);
    const where: any = {
      cinemaId,
    };

    if (movieDate) {
      const { start, end } = getCopenhagenDayRange(movieDate);
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
