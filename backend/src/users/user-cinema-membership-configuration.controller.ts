import {
  Body,
  Controller,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReplaceUserCinemaMembershipsDto } from './dto/replace-user-cinema-memberships.dto';
import { parseUserControllerId } from './helpers/user-controller-input';
import type { AuthUser } from './helpers/user-service-helpers';
import { UserCinemaMembershipConfigurationService } from './user-cinema-membership-configuration.service';

@Controller('users')
export class UserCinemaMembershipConfigurationController {
  constructor(
    private readonly configurationService:
      UserCinemaMembershipConfigurationService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('MASTER')
  @Put(':id/cinema-memberships/configuration')
  replaceConfiguration(
    @Param('id') id: string,
    @Body() body: ReplaceUserCinemaMembershipsDto,
    @Req() req: any,
  ) {
    return this.configurationService.replace(
      parseUserControllerId(id),
      body.memberships,
      body.defaultCinemaId ?? null,
      req.user as AuthUser,
    );
  }
}
