import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MovieShowingsService } from './movie-showings.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('movie-showings')
export class MovieShowingsController {
  constructor(private movieShowingsService: MovieShowingsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllMovieShowings(@Query('date') date?: string) {
    return this.movieShowingsService.findAll(date);
  }
}
