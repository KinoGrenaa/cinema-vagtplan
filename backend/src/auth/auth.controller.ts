import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { JwtGuard } from './jwt/jwt.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SwitchCinemaDto } from './dto/switch-cinema.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    const userId = req.user?.sub ?? req.user?.id;

    if (!userId) {
      throw new ForbiddenException(
        'Brugeren kunne ikke identificeres',
      );
    }

    return this.authService.switchCinema(
      Number(userId),
      body.cinemaId,
    );
  }
}
