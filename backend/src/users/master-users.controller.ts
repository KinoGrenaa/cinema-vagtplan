import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MasterUsersService } from './master-users.service';

@Controller('users')
export class MasterUsersController {
  constructor(
    private readonly masterUsersService: MasterUsersService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('MASTER')
  @Get('masters')
  findAll() {
    return this.masterUsersService.findAll();
  }
}
