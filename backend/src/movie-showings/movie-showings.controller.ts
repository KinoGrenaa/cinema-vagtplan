import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { parseOptionalPositiveIntegerQuery } from '../common/query-validation';
import { MovieShowingsService } from './movie-showings.service';

@Controller('movie-showings')
export class MovieShowingsController {
  constructor(
    private readonly movieShowingsService: MovieShowingsService,
  ) {}

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
        parseOptionalPositiveIntegerQuery(
          cinemaId,
          'Biograf skal være et gyldigt ID',
        ),
    });
  }
}
