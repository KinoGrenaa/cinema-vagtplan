import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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
  defaultCinemaId?: number | null;
};

type CinemaSummary = {
  id: number;
  name: string;
  logoUrl: string | null;
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
    defaultCinema: CinemaSummary | null,
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
        defaultCinemaId: user.defaultCinemaId ?? null,
      },
      defaultCinema,
    };
  }

  private async findAccessibleDefaultCinema(
    user: SessionUser,
  ): Promise<CinemaSummary | null> {
    const defaultCinemaId = user.defaultCinemaId ?? null;

    if (!defaultCinemaId) {
      return null;
    }

    if (user.role === 'MASTER') {
      return this.prisma.cinema.findUnique({
        where: {
          id: defaultCinemaId,
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      });
    }

    const membership =
      await this.prisma.userCinemaMembership.findFirst({
        where: {
          userId: user.id,
          cinemaId: defaultCinemaId,
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

    return membership?.cinema ?? null;
  }

  private async findPrimaryMembershipCinema(
    user: SessionUser,
  ): Promise<CinemaSummary | null> {
    if (!user.cinemaId || user.role === 'MASTER') {
      return null;
    }

    const membership =
      await this.prisma.userCinemaMembership.findFirst({
        where: {
          userId: user.id,
          cinemaId: user.cinemaId,
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

    return membership?.cinema ?? null;
  }

  private async resolveLoginCinema(user: SessionUser) {
    const selectedDefaultCinema =
      await this.findAccessibleDefaultCinema(user);

    if (user.role === 'MASTER') {
      return {
        sessionCinemaId: null,
        defaultCinema: selectedDefaultCinema,
      };
    }

    if (selectedDefaultCinema) {
      return {
        sessionCinemaId: selectedDefaultCinema.id,
        defaultCinema: selectedDefaultCinema,
      };
    }

    const primaryCinema =
      await this.findPrimaryMembershipCinema(user);

    if (!primaryCinema) {
      throw new ForbiddenException(
        'Din bruger har ingen aktiv biograftilknytning',
      );
    }

    if (user.defaultCinemaId !== primaryCinema.id) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          defaultCinemaId: primaryCinema.id,
        },
      });

      user.defaultCinemaId = primaryCinema.id;
    }

    return {
      sessionCinemaId: primaryCinema.id,
      defaultCinema: primaryCinema,
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

    const { sessionCinemaId, defaultCinema } =
      await this.resolveLoginCinema(user);

    return this.createSession(
      user,
      sessionCinemaId,
      defaultCinema,
    );
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
        defaultCinemaId: true,
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
        'MASTER vælger fortsat aktiv biograf i MASTER-panelet',
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

    const defaultCinema =
      await this.findAccessibleDefaultCinema(user);
    const session = await this.createSession(
      user,
      cinemaId,
      defaultCinema,
    );

    return {
      ...session,
      selectedCinema: membership.cinema,
      isPrimaryCinema: user.cinemaId === cinemaId,
      isDefaultCinema:
        user.defaultCinemaId === cinemaId,
    };
  }

  async getDefaultCinemaOptions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        cinemaId: true,
        defaultCinemaId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Brugeren blev ikke fundet',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Brugeren er deaktiveret',
      );
    }

    const cinemas =
      user.role === 'MASTER'
        ? await this.prisma.cinema.findMany({
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
            orderBy: {
              name: 'asc',
            },
          })
        : (
            await this.prisma.userCinemaMembership.findMany({
              where: {
                userId,
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
              orderBy: {
                cinema: {
                  name: 'asc',
                },
              },
            })
          ).map((membership) => membership.cinema);

    return {
      role: user.role,
      homeCinemaId: user.cinemaId,
      defaultCinemaId: user.defaultCinemaId,
      allowNoDefault: user.role === 'MASTER',
      cinemas: cinemas.map((cinema) => ({
        ...cinema,
        isDefault:
          cinema.id === user.defaultCinemaId,
        isHomeCinema: cinema.id === user.cinemaId,
      })),
    };
  }

  async updateDefaultCinema(
    userId: number,
    cinemaId: number | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        cinemaId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Brugeren blev ikke fundet',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Brugeren er deaktiveret',
      );
    }

    if (user.role === 'MASTER') {
      if (cinemaId !== null) {
        const cinema = await this.prisma.cinema.findUnique({
          where: {
            id: cinemaId,
          },
          select: {
            id: true,
          },
        });

        if (!cinema) {
          throw new BadRequestException(
            'Den valgte biograf findes ikke',
          );
        }
      }
    } else {
      if (cinemaId === null) {
        throw new BadRequestException(
          'ADMIN og EMPLOYEE skal have en standardbiograf',
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
            id: true,
          },
        });

      if (!membership) {
        throw new ForbiddenException(
          'Du kan kun vælge standard blandt dine aktive biograftilknytninger',
        );
      }
    }

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        defaultCinemaId: cinemaId,
      },
    });

    return this.getDefaultCinemaOptions(userId);
  }
}
