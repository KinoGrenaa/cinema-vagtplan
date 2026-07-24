import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { updateAuthDefaultCinemaFlow } from './helpers/auth-default-cinema-flow';

type SessionRole =
  | 'MASTER'
  | 'ADMIN'
  | 'EMPLOYEE';

type SessionPermissions = {
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
};

type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  defaultCinemaId?: number | null;
};

type CinemaSummary = {
  id: number;
  name: string;
  logoUrl: string | null;
};

type SessionMembership =
  SessionPermissions & {
    cinemaId: number;
    role: 'ADMIN' | 'EMPLOYEE';
    cinema: CinemaSummary;
  };

const MASTER_PERMISSIONS: SessionPermissions = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
};

const membershipSessionSelect = {
  cinemaId: true,
  role: true,
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
  cinema: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private async createSession(
    user: SessionUser,
    membership: SessionMembership | null,
    defaultCinema: CinemaSummary | null,
  ) {
    const isMaster = user.role === 'MASTER';
    const role: SessionRole = isMaster
      ? 'MASTER'
      : membership?.role ??
        (() => {
          throw new ForbiddenException(
            'Din bruger har ingen aktiv biograftilknytning',
          );
        })();
    const cinemaId = isMaster
      ? null
      : membership?.cinemaId ?? null;
    const permissions = isMaster
      ? MASTER_PERMISSIONS
      : {
          canManageSchedule:
            membership?.canManageSchedule ?? false,
          canManageUsers:
            membership?.canManageUsers ?? false,
          canManagePayroll:
            membership?.canManagePayroll ?? false,
          canManageLeaveRequests:
            membership?.canManageLeaveRequests ??
            false,
          canManageCinemaSettings:
            membership?.canManageCinemaSettings ??
            false,
          canSendBroadcastMessages:
            membership?.canSendBroadcastMessages ??
            false,
        };

    const payload = {
      sub: user.id,
      email: user.email,
      role,
      cinemaId,
    };

    return {
      access_token:
        await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        cinemaId,
        defaultCinemaId:
          user.defaultCinemaId ?? null,
        ...permissions,
      },
      defaultCinema,
    };
  }

  private findActiveMembership(
    userId: number,
    cinemaId: number,
  ) {
    return this.prisma.userCinemaMembership.findFirst({
      where: {
        userId,
        cinemaId,
        isActive: true,
      },
      select: membershipSessionSelect,
    });
  }

  private async findAccessibleDefaultMembership(
    user: SessionUser,
  ) {
    const defaultCinemaId =
      user.defaultCinemaId ?? null;

    if (
      !defaultCinemaId ||
      user.role === 'MASTER'
    ) {
      return null;
    }

    return this.findActiveMembership(
      user.id,
      defaultCinemaId,
    );
  }

  private async findFallbackMembership(
    user: SessionUser,
  ) {
    return this.prisma.userCinemaMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: membershipSessionSelect,
      orderBy: [
        {
          cinema: {
            name: 'asc',
          },
        },
        {
          cinemaId: 'asc',
        },
      ],
    });
  }

  private async resolveLoginMembership(
    user: SessionUser,
  ) {
    if (user.role === 'MASTER') {
      const defaultCinemaId =
        user.defaultCinemaId ?? null;
      const defaultCinema = defaultCinemaId
        ? await this.prisma.cinema.findUnique({
            where: {
              id: defaultCinemaId,
            },
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          })
        : null;

      return {
        membership: null,
        defaultCinema,
      };
    }

    const defaultMembership =
      await this.findAccessibleDefaultMembership(
        user,
      );

    if (defaultMembership) {
      return {
        membership: defaultMembership,
        defaultCinema:
          defaultMembership.cinema,
      };
    }

    const fallbackMembership =
      await this.findFallbackMembership(user);

    if (!fallbackMembership) {
      throw new ForbiddenException(
        'Din bruger har ingen aktiv biograftilknytning',
      );
    }

    if (
      user.defaultCinemaId !==
      fallbackMembership.cinemaId
    ) {
      await updateAuthDefaultCinemaFlow(
        this.prisma,
        user.id,
        fallbackMembership.cinemaId,
      );
      user.defaultCinemaId =
        fallbackMembership.cinemaId;
    }

    return {
      membership: fallbackMembership,
      defaultCinema:
        fallbackMembership.cinema,
    };
  }

  async login(
    email: string,
    password: string,
  ) {
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
        'Brugerkontoen er spærret.\nKontakt en systemadministrator.',
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

    const {
      membership,
      defaultCinema,
    } = await this.resolveLoginMembership(user);

    return this.createSession(
      user,
      membership,
      defaultCinema,
    );
  }

  async switchCinema(
    userId: number,
    cinemaId: number,
  ) {
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
        defaultCinemaId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Brugerkontoen er spærret eller findes ikke',
      );
    }

    if (user.role === 'MASTER') {
      throw new ForbiddenException(
        'MASTER vælger fortsat aktiv biograf i MASTER-panelet',
      );
    }

    const membership =
      await this.findActiveMembership(
        userId,
        cinemaId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'Din bruger har ikke en aktiv tilknytning til denne biograf',
      );
    }

    const defaultMembership =
      await this.findAccessibleDefaultMembership(
        user,
      );
    const session = await this.createSession(
      user,
      membership,
      defaultMembership?.cinema ?? null,
    );

    return {
      ...session,
      selectedCinema: membership.cinema,
      isDefaultCinema:
        user.defaultCinemaId === cinemaId,
    };
  }

  async getDefaultCinemaOptions(
    userId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
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
        'Brugerkontoen er spærret',
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
            await this.prisma.userCinemaMembership.findMany(
              {
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
              },
            )
          ).map(
            (membership) => membership.cinema,
          );

    return {
      role: user.role,
      defaultCinemaId:
        user.defaultCinemaId,
      allowNoDefault:
        user.role === 'MASTER',
      cinemas: cinemas.map((cinema) => ({
        ...cinema,
        isDefault:
          cinema.id === user.defaultCinemaId,
      })),
    };
  }

  async updateDefaultCinema(
    userId: number,
    cinemaId: number | null,
  ) {
    await updateAuthDefaultCinemaFlow(
      this.prisma,
      userId,
      cinemaId,
    );

    return this.getDefaultCinemaOptions(userId);
  }
}
