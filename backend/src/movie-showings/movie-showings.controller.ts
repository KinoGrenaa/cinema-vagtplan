import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { MovieShowingsService } from './movie-showings.service';

@Controller('movie-showings')
export class MovieShowingsController {
  constructor(
    private readonly movieShowingsService:
      MovieShowingsService,
  ) {}

  private parseOptionalCinemaId(
    value?: string,
  ) {
    if (value === undefined || value === '') {
      return undefined;
    }

    const cinemaId = Number(value);

    if (
      !Number.isInteger(cinemaId) ||
      cinemaId <= 0
    ) {
      throw new BadRequestException(
        'Biograf skal være et gyldigt ID',
      );
    }

    return cinemaId;
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllMovieShowings(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.movieShowingsService.findAll({
      date,
      user: req.user,
      selectedCinemaId:
        this.parseOptionalCinemaId(cinemaId),
    });
  }
}
