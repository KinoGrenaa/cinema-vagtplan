import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { parseRequiredPositiveInteger } from '../common/query-validation';
import { UpdateUserDefaultCinemaDto } from './dto/update-user-default-cinema.dto';
import { parseUserControllerId } from './helpers/user-controller-input';
import type { AuthUser } from './helpers/user-service-helpers';
import { UsersService } from './users.service';

@Controller('users')
export class UserCinemaDefaultController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('MASTER')
  @Patch(':id/default-cinema')
  updateUserDefaultCinema(
    @Param('id') id: string,
    @Body() body: UpdateUserDefaultCinemaDto,
    @Req() req: any,
  ) {
    return this.usersService.updateManagedDefaultCinema(
      parseUserControllerId(id),
      parseRequiredPositiveInteger(
        body?.cinemaId,
        'Standardbiograf skal være et gyldigt ID',
      ),
      req.user as AuthUser,
    );
  }
}
