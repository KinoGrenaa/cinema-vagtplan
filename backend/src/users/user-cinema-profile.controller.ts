import {
  Body,
  Controller,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateCinemaUserDto } from './dto/update-cinema-user.dto';
import {
  parseOptionalUserCinemaId,
  parseUserControllerId,
} from './helpers/user-controller-input';
import type { AuthUser } from './helpers/user-service-helpers';
import { UserCinemaProfileService } from './user-cinema-profile.service';

@Controller('users')
export class UserCinemaProfileController {
  constructor(
    private readonly profileService:
      UserCinemaProfileService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/cinema-profile')
  updateCinemaProfile(
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Body() body: UpdateCinemaUserDto,
    @Req() req: any,
  ) {
    return this.profileService.update(
      parseUserControllerId(id),
      body,
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }
}
