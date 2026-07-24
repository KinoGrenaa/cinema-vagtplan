import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  getActorUserId,
} from './helpers/user-service-helpers';
import { withUserWriteLock } from './helpers/user-write-lock';

type MembershipStatusRecord = {
  role: 'ADMIN' | 'EMPLOYEE';
  employmentType: 'HOURLY' | 'SALARIED';
  isActive: boolean;
  deactivatedAt: Date | null;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
};

function resolveCinemaId(
  actor: AuthUser,
  selectedCinemaId?: number,
) {
  if (actor.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du ændrer brugerens status',
      );
    }

    return selectedCinemaId;
  }

  if (!actor.cinemaId) {
    throw new ForbiddenException(
      'Din session mangler en aktiv biograf',
    );
  }

  return actor.cinemaId;
}

function formatMembershipUser(
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    defaultCinemaId: number | null;
  },
  membership: MembershipStatusRecord,
  cinemaId: number,
  defaultCinemaId: number | null,
) {
  return {
    ...user,
    cinemaId,
    defaultCinemaId,
    role: membership.role,
    employmentType:
      membership.employmentType,
    isActive: membership.isActive,
    deactivatedAt:
      membership.deactivatedAt,
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
  };
}

@Injectable()
export class UserCinemaMembershipStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService:
      AuditLogsService,
  ) {}

  async deactivate(
    userId: number,
    actor: AuthUser,
    selectedCinemaId?: number,
  ) {
    const cinemaId = resolveCinemaId(
      actor,
      selectedCinemaId,
    );

    const result = await withUserWriteLock(
      this.prisma,
      userId,
      async (transaction, lockedUserId) => {
        const user =
          await transaction.user.findUnique({
            where: {
              id: lockedUserId,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              cinemaId: true,
              defaultCinemaId: true,
            },
          });

        if (!user) {
          throw new NotFoundException(
            'Bruger blev ikke fundet',
          );
        }

        if (user.role === 'MASTER') {
          throw new BadRequestException(
            'MASTER-brugere deaktiveres som systembrugere',
          );
        }

        const membership =
          await transaction.userCinemaMembership.findUnique({
            where: {
              userId_cinemaId: {
                userId: lockedUserId,
                cinemaId,
              },
            },
            select: {
              role: true,
              employmentType: true,
              isActive: true,
              deactivatedAt: true,
              canManageSchedule: true,
              canManageUsers: true,
              canManagePayroll: true,
              canManageLeaveRequests: true,
              canManageCinemaSettings: true,
              canSendBroadcastMessages: true,
            },
          });

        if (!membership) {
          throw new NotFoundException(
            'Brugeren er ikke tilknyttet denne biograf',
          );
        }

        if (!membership.isActive) {
          throw new BadRequestException(
            'Brugeren er allerede deaktiveret i denne biograf',
          );
        }

        const updatedMembership =
          await transaction.userCinemaMembership.update({
            where: {
              userId_cinemaId: {
                userId: lockedUserId,
                cinemaId,
              },
            },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
            },
            select: {
              role: true,
              employmentType: true,
              isActive: true,
              deactivatedAt: true,
              canManageSchedule: true,
              canManageUsers: true,
              canManagePayroll: true,
              canManageLeaveRequests: true,
              canManageCinemaSettings: true,
              canSendBroadcastMessages: true,
            },
          });

        const activeMemberships =
          await transaction.userCinemaMembership.findMany({
            where: {
              userId: lockedUserId,
              isActive: true,
            },
            select: {
              cinemaId: true,
            },
            orderBy: {
              cinemaId: 'asc',
            },
          });
        const activeCinemaIds =
          activeMemberships.map(
            (item) => item.cinemaId,
          );

        const nextDefaultCinemaId =
          user.defaultCinemaId &&
          activeCinemaIds.includes(
            user.defaultCinemaId,
          )
            ? user.defaultCinemaId
            : activeCinemaIds[0] ?? null;
        const nextLegacyCinemaId =
          user.cinemaId &&
          activeCinemaIds.includes(user.cinemaId)
            ? user.cinemaId
            : nextDefaultCinemaId;

        if (
          nextDefaultCinemaId !==
            user.defaultCinemaId ||
          nextLegacyCinemaId !== user.cinemaId
        ) {
          await transaction.user.update({
            where: {
              id: lockedUserId,
            },
            data: {
              cinemaId: nextLegacyCinemaId,
              defaultCinemaId:
                nextDefaultCinemaId,
            },
          });
        }

        return {
          user,
          membership: updatedMembership,
          defaultCinemaId:
            nextDefaultCinemaId,
        };
      },
    );

    await this.auditLogsService.create({
      action:
        'DEACTIVATE_USER_CINEMA_MEMBERSHIP',
      entityType: 'UserCinemaMembership',
      entityId: result.user.id,
      description:
        `Deaktiverede ${result.user.firstName} ` +
        `${result.user.lastName} i biograf ${cinemaId}`,
      userId: getActorUserId(actor),
      cinemaId,
    });

    return formatMembershipUser(
      result.user,
      result.membership,
      cinemaId,
      result.defaultCinemaId,
    );
  }

  async reactivate(
    userId: number,
    actor: AuthUser,
    selectedCinemaId?: number,
  ) {
    const cinemaId = resolveCinemaId(
      actor,
      selectedCinemaId,
    );

    const result = await withUserWriteLock(
      this.prisma,
      userId,
      async (transaction, lockedUserId) => {
        const user =
          await transaction.user.findUnique({
            where: {
              id: lockedUserId,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              cinemaId: true,
              defaultCinemaId: true,
            },
          });

        if (!user) {
          throw new NotFoundException(
            'Bruger blev ikke fundet',
          );
        }

        if (user.role === 'MASTER') {
          throw new BadRequestException(
            'MASTER-brugere genaktiveres som systembrugere',
          );
        }

        const membership =
          await transaction.userCinemaMembership.findUnique({
            where: {
              userId_cinemaId: {
                userId: lockedUserId,
                cinemaId,
              },
            },
            select: {
              role: true,
              employmentType: true,
              isActive: true,
              deactivatedAt: true,
              canManageSchedule: true,
              canManageUsers: true,
              canManagePayroll: true,
              canManageLeaveRequests: true,
              canManageCinemaSettings: true,
              canSendBroadcastMessages: true,
            },
          });

        if (!membership) {
          throw new NotFoundException(
            'Brugeren er ikke tilknyttet denne biograf',
          );
        }

        if (membership.isActive) {
          throw new BadRequestException(
            'Brugeren er allerede aktiv i denne biograf',
          );
        }

        const updatedMembership =
          await transaction.userCinemaMembership.update({
            where: {
              userId_cinemaId: {
                userId: lockedUserId,
                cinemaId,
              },
            },
            data: {
              isActive: true,
              deactivatedAt: null,
            },
            select: {
              role: true,
              employmentType: true,
              isActive: true,
              deactivatedAt: true,
              canManageSchedule: true,
              canManageUsers: true,
              canManagePayroll: true,
              canManageLeaveRequests: true,
              canManageCinemaSettings: true,
              canSendBroadcastMessages: true,
            },
          });

        const activeMemberships =
          await transaction.userCinemaMembership.findMany({
            where: {
              userId: lockedUserId,
              isActive: true,
            },
            select: {
              cinemaId: true,
            },
            orderBy: {
              cinemaId: 'asc',
            },
          });
        const activeCinemaIds =
          activeMemberships.map(
            (item) => item.cinemaId,
          );

        const nextDefaultCinemaId =
          user.defaultCinemaId &&
          activeCinemaIds.includes(
            user.defaultCinemaId,
          )
            ? user.defaultCinemaId
            : cinemaId;
        const nextLegacyCinemaId =
          user.cinemaId &&
          activeCinemaIds.includes(user.cinemaId)
            ? user.cinemaId
            : cinemaId;

        await transaction.user.update({
          where: {
            id: lockedUserId,
          },
          data: {
            isActive: true,
            deactivatedAt: null,
            cinemaId: nextLegacyCinemaId,
            defaultCinemaId:
              nextDefaultCinemaId,
          },
        });

        return {
          user,
          membership: updatedMembership,
          defaultCinemaId:
            nextDefaultCinemaId,
        };
      },
    );

    await this.auditLogsService.create({
      action:
        'REACTIVATE_USER_CINEMA_MEMBERSHIP',
      entityType: 'UserCinemaMembership',
      entityId: result.user.id,
      description:
        `Genaktiverede ${result.user.firstName} ` +
        `${result.user.lastName} i biograf ${cinemaId}`,
      userId: getActorUserId(actor),
      cinemaId,
    });

    return formatMembershipUser(
      result.user,
      result.membership,
      cinemaId,
      result.defaultCinemaId,
    );
  }
}
