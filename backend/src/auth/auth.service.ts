import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number | null;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private async createSession(
    user: SessionUser,
    cinemaId: number | null,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cinemaId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        cinemaId,
      },
    };
  }

  async login(email: string, password: string) {
    const user =
      await this.usersService.findByEmailIncludingInactive(
        email,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Forkert email eller password',
      );
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Brugeren er deaktiveret. Kontakt en administrator.',
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Forkert email eller password',
      );
    }

    return this.createSession(user, user.cinemaId);
  }

  async switchCinema(userId: number, cinemaId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        cinemaId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Brugeren er deaktiveret eller findes ikke',
      );
    }

    if (user.role === 'MASTER') {
      throw new ForbiddenException(
        'MASTER vælger fortsat biograf i MASTER-panelet',
      );
    }

    const membership =
      await this.prisma.userCinemaMembership.findFirst({
        where: {
          userId,
          cinemaId,
          isActive: true,
        },
        select: {
          cinema: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      });

    if (!membership) {
      throw new ForbiddenException(
        'Din bruger har ikke et aktivt medlemskab af denne biograf',
      );
    }

    const session = await this.createSession(user, cinemaId);

    return {
      ...session,
      selectedCinema: membership.cinema,
      isPrimaryCinema: user.cinemaId === cinemaId,
    };
  }
}
