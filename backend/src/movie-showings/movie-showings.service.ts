import { findMovieShowingsForRange } from './helpers/movie-showing-range-read';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MovieShowingsRequestUser,
  resolveMovieShowingsCinemaId,
} from './helpers/movie-showing-cinema-access';
import {
  getCopenhagenDayRange,
  parseMovieShowingDate,
} from './helpers/movie-showing-date-range';

type FindMovieShowingsOptions = {
  date?: string;
  user: MovieShowingsRequestUser;
  selectedCinemaId?: number | null;
};

@Injectable()
export class MovieShowingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    options: FindMovieShowingsOptions,
  ) {
    const cinemaId =
      await resolveMovieShowingsCinemaId(
        this.prisma,
        options.user,
        options.selectedCinemaId,
      );
    const movieDate =
      parseMovieShowingDate(options.date);
    const where: Prisma.MovieShowingWhereInput =
      {
        cinemaId,
      };

    if (movieDate) {
      const {
        start,
        endExclusive,
      } = getCopenhagenDayRange(movieDate);

      where.startTime = {
        lt: endExclusive,
      };
      where.endTime = {
        gt: start,
      };
    }

    return this.prisma.movieShowing.findMany({
      where,
      orderBy: [
        {
          startTime: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }


  async findRange(
    options: {
      startDate: string;
      endDate: string;
      user: MovieShowingsRequestUser;
      selectedCinemaId?: number | null;
    },
  ) {
    const cinemaId =
      await resolveMovieShowingsCinemaId(
        this.prisma,
        options.user,
        options.selectedCinemaId,
      );

    return findMovieShowingsForRange(
      this.prisma,
      cinemaId,
      options.startDate,
      options.endDate,
    );
  }
}
