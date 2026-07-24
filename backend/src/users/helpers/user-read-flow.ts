import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from './user-service-helpers';
import { ensureCinemaExists } from './user-service-data-helpers';

async function findCinemaUsers(
  prisma: PrismaService,
  cinemaId: number,
) {
  const users = await prisma.user.findMany({
    where: {
      role: {
        not: 'MASTER',
      },
      cinemaMemberships: {
        some: {
          cinemaId,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      address: true,
      birthDate: true,
      emergencyPhone: true,
      skills: true,
      notes: true,
      theme: true,
      createdAt: true,
      defaultCinemaId: true,
      isActive: true,
      deactivatedAt: true,
      cinemaMemberships: {
        where: {
          cinemaId,
        },
        select: {
          role: true,
          employmentType: true,
          hireDate: true,
          employeeNumber: true,
          payrollEmployeeId: true,
          isActive: true,
          deactivatedAt: true,
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
        },
        take: 1,
      },
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  return users.flatMap((user) => {
    const membership =
      user.cinemaMemberships[0];

    if (!membership) {
      return [];
    }

    const {
      cinemaMemberships: _memberships,
      ...account
    } = user;
    const accountIsActive =
      account.isActive;
    const membershipIsActive =
      membership.isActive;

    return [
      {
        ...account,
        cinemaId,
        cinema: membership.cinema,
        role: membership.role,
        employmentType:
          membership.employmentType,
        hireDate: membership.hireDate,
        employeeNumber:
          membership.employeeNumber,
        payrollEmployeeId:
          membership.payrollEmployeeId,
        isActive:
          accountIsActive &&
          membershipIsActive,
        deactivatedAt:
          !accountIsActive
            ? account.deactivatedAt
            : membership.deactivatedAt,
        canManageSchedule:
          membership.canManageSchedule,
        canManageUsers:
          membership.canManageUsers,
        canManagePayroll:
          membership.canManagePayroll,
        canManageLeaveRequests:
          membership.canManageLeaveRequests,
        canManageCinemaSettings:
          membership.canManageCinemaSettings,
        canSendBroadcastMessages:
          membership.canSendBroadcastMessages,
        canManageAccount: true,
      },
    ];
  });
}

async function findGlobalUsers(
  prisma: PrismaService,
) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      address: true,
      birthDate: true,
      emergencyPhone: true,
      skills: true,
      notes: true,
      theme: true,
      role: true,
      createdAt: true,
      isActive: true,
      deactivatedAt: true,
      defaultCinemaId: true,
      defaultCinema: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  return users.map((user) => {
    const {
      defaultCinema,
      ...account
    } = user;

    return {
      ...account,
      cinemaId:
        user.defaultCinemaId,
      cinema: defaultCinema,
    };
  });
}

export async function findAllUsers(
  prisma: PrismaService,
  currentUser: AuthUser,
  selectedCinemaId?: number,
) {
  if (currentUser.role === 'MASTER') {
    if (selectedCinemaId) {
      await ensureCinemaExists(
        prisma,
        selectedCinemaId,
      );

      return findCinemaUsers(
        prisma,
        selectedCinemaId,
      );
    }

    return findGlobalUsers(prisma);
  }

  if (!currentUser.cinemaId) {
    throw new ForbiddenException(
      'Din bruger er ikke tilknyttet en biograf',
    );
  }

  return findCinemaUsers(
    prisma,
    currentUser.cinemaId,
  );
}

export async function findUserByEmail(
  prisma: PrismaService,
  email: string,
) {
  return prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },
  });
}

export async function findUserByEmailIncludingInactive(
  prisma: PrismaService,
  email: string,
) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export async function findUserOwnProfile(
  prisma: PrismaService,
  id: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      defaultCinemaId: true,
      profileImage: true,
      address: true,
      birthDate: true,
      emergencyPhone: true,
      skills: true,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  return {
    ...user,
    // Midlertidig API-kompatibilitet.
    // Den aktive session har fortsat sit eget cinemaId.
    cinemaId: user.defaultCinemaId,
  };
}
