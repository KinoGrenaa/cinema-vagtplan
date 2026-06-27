import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MovieShowingsService } from './movie-showings.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

function parseOptionalCinemaId(value?: string) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const cinemaId = Number(value);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new BadRequestException('Biograf skal være et gyldigt ID');
  }

  return cinemaId;
}

@Controller('movie-showings')
export class MovieShowingsController {
  constructor(private movieShowingsService: MovieShowingsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllMovieShowings(
    @Req() req,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.movieShowingsService.findAll({
      date,
      user: req.user,
      selectedCinemaId: parseOptionalCinemaId(cinemaId),
    });
  }
}
