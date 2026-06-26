import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MovieShowingsService } from './movie-showings.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

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
    const selectedCinemaId = cinemaId ? Number(cinemaId) : undefined;

    return this.movieShowingsService.findAll({
      date,
      user: req.user,
      selectedCinemaId,
    });
  }
}
