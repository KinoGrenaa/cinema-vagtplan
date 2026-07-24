import {
  Controller,
  Delete,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  parseOptionalUserCinemaId,
  parseUserControllerId,
} from './helpers/user-controller-input';
import type { AuthUser } from './helpers/user-service-helpers';
import { UserCinemaMembershipStatusService } from './user-cinema-membership-status.service';

@Controller('users')
export class UserCinemaMembershipStatusController {
  constructor(
    private readonly statusService:
      UserCinemaMembershipStatusService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id/cinema-membership')
  deactivateMembership(
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Req() req: any,
  ) {
    return this.statusService.deactivate(
      parseUserControllerId(id),
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/cinema-membership/reactivate')
  reactivateMembership(
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Req() req: any,
  ) {
    return this.statusService.reactivate(
      parseUserControllerId(id),
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }
}
