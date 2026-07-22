import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  ensureCinemaMaster,
  type CinemaControllerUser,
} from '../cinemas/helpers/cinema-controller-access';
import {
  parseCinemaControllerId,
} from '../cinemas/helpers/cinema-controller-input';
import {
  normalizeCinemaModuleUpdateBody,
} from './cinema-module-input';
import { CinemaModulesService } from './cinema-modules.service';

@Controller('cinema-modules')
export class CinemaModulesController {
  constructor(
    private readonly cinemaModulesService: CinemaModulesService,
  ) {}

  private resolveCurrentCinemaId(
    user: CinemaControllerUser,
    headerCinemaId?: string,
    queryCinemaId?: string,
  ) {
    if (user.role === 'MASTER') {
      const selectedCinemaId =
        headerCinemaId ??
        queryCinemaId;

      if (!selectedCinemaId) {
        throw new BadRequestException(
          'Vælg en aktiv biograf i MASTER-panelet',
        );
      }

      return parseCinemaControllerId(
        selectedCinemaId,
      );
    }

    if (!user.cinemaId) {
      throw new BadRequestException(
        'Din session mangler en aktiv biograf',
      );
    }

    return user.cinemaId;
  }

  @UseGuards(JwtGuard)
  @Get('current')
  findCurrentCinemaModules(
    @Req() req: any,
    @Headers('x-cinema-id')
    headerCinemaId?: string,
    @Query('cinemaId')
    queryCinemaId?: string,
  ) {
    const user =
      req.user as CinemaControllerUser;
    const cinemaId =
      this.resolveCurrentCinemaId(
        user,
        headerCinemaId,
        queryCinemaId,
      );

    return this.cinemaModulesService.findForCinema(
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':cinemaId')
  findForCinema(
    @Param('cinemaId')
    cinemaIdValue: string,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;

    ensureCinemaMaster(user);

    return this.cinemaModulesService.findForCinema(
      parseCinemaControllerId(
        cinemaIdValue,
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':cinemaId')
  updateForCinema(
    @Param('cinemaId')
    cinemaIdValue: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;

    ensureCinemaMaster(user);

    const cinemaId =
      parseCinemaControllerId(
        cinemaIdValue,
      );
    const normalized =
      normalizeCinemaModuleUpdateBody(
        body,
      );

    return this.cinemaModulesService.updateForCinema(
      cinemaId,
      normalized.modules,
      user.sub,
    );
  }
}
