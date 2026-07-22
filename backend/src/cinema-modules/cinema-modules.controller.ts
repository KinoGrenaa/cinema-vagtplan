import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
