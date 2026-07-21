import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from './jwt/jwt.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SwitchCinemaDto } from './dto/switch-cinema.dto';
import { UpdateDefaultCinemaDto } from './dto/update-default-cinema.dto';
import {
  getAuthenticatedAuthUserId,
  parseAuthCinemaId,
  parseOptionalAuthCinemaId,
} from './helpers/auth-controller-input';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCurrentUserId(req: any) {
    return getAuthenticatedAuthUserId(
      req.user?.sub ?? req.user?.id,
    );
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(
      body.email,
      body.password,
    );
  }

  @UseGuards(JwtGuard)
  @Post('switch-cinema')
  switchCinema(
    @Req() req: any,
    @Body() body: SwitchCinemaDto,
  ) {
    return this.authService.switchCinema(
      this.getCurrentUserId(req),
      parseAuthCinemaId(body?.cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('default-cinema-options')
  getDefaultCinemaOptions(@Req() req: any) {
    return this.authService.getDefaultCinemaOptions(
      this.getCurrentUserId(req),
    );
  }

  @UseGuards(JwtGuard)
  @Patch('default-cinema')
  updateDefaultCinema(
    @Req() req: any,
    @Body() body: UpdateDefaultCinemaDto,
  ) {
    return this.authService.updateDefaultCinema(
      this.getCurrentUserId(req),
      parseOptionalAuthCinemaId(body?.cinemaId),
    );
  }
}
