import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailIncludingInactive(email);

    if (!user) {
      throw new UnauthorizedException('Forkert email eller password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Brugeren er deaktiveret. Kontakt en administrator.',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Forkert email eller password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cinemaId: user.cinemaId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        cinemaId: user.cinemaId,
      },
    };
  }
}
