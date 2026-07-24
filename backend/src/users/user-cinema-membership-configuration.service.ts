import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  UserCinemaMembershipConfigurationDto,
} from './dto/replace-user-cinema-memberships.dto';
import {
  findManagedUserCinemaMemberships,
} from './helpers/user-cinema-membership-management';
import {
  AuthUser,
  getActorUserId,
} from './helpers/user-service-helpers';
import { withUserWriteLock } from './helpers/user-write-lock';

type NormalizedMembershipConfiguration = {
  cinemaId: number;
  role: CinemaRole;
  employmentType:
    EmploymentType;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
};

const ADMIN_PERMISSIONS = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
} as const;

function normalizeConfigurations(
  configurations:
    UserCinemaMembershipConfigurationDto[],
) {
  if (
    !Array.isArray(configurations)
  ) {
    throw new BadRequestException(
      'Biograftilknytninger skal være en liste',
    );
  }

  if (
    configurations.length > 1000
  ) {
    throw new BadRequestException(
      'Der er valgt for mange biografer',
    );
  }

  const cinemaIds =
    new Set<number>();

  return configurations.map(
    (
      configuration,
    ): NormalizedMembershipConfiguration => {
      if (
        !Number.isInteger(
          configuration.cinemaId,
        ) ||
        configuration.cinemaId <= 0
      ) {
        throw new BadRequestException(
          'Biograf skal være et gyldigt ID',
        );
      }

      if (
        cinemaIds.has(
          configuration.cinemaId,
        )
      ) {
        throw new BadRequestException(
          'Den samme biograf må kun vælges én gang',
        );
      }

      cinemaIds.add(
        configuration.cinemaId,
      );

      if (
        configuration.role !==
          CinemaRole.ADMIN &&
        configuration.role !==
          CinemaRole.EMPLOYEE
      ) {
        throw new BadRequestException(
          'Rollen i biografen er ugyldig',
        );
      }

      if (
        configuration.employmentType !==
          EmploymentType.HOURLY &&
        configuration.employmentType !==
          EmploymentType.SALARIED
      ) {
        throw new BadRequestException(
          'Ansættelsestypen er ugyldig',
        );
      }

      const permissions =
        configuration.role ===
        CinemaRole.ADMIN
          ? ADMIN_PERMISSIONS
          : {
              canManageSchedule:
                Boolean(
                  configuration.canManageSchedule,
                ),
              canManageUsers:
                Boolean(
                  configuration.canManageUsers,
                ),
              canManagePayroll:
                Boolean(
                  configuration.canManagePayroll,
                ),
              canManageLeaveRequests:
                Boolean(
                  configuration.canManageLeaveRequests,
                ),
              canManageCinemaSettings:
                Boolean(
                  configuration.canManageCinemaSettings,
                ),
              canSendBroadcastMessages:
                Boolean(
                  configuration.canSendBroadcastMessages,
                ),
            };

      return {
        cinemaId:
          configuration.cinemaId,
        role:
          configuration.role,
        employmentType:
          configuration.employmentType,
        ...permissions,
      };
    },
  );
}

@Injectable()
export class UserCinemaMembershipConfigurationService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly auditLogsService:
      AuditLogsService,
  ) {}

  async replace(
    userId: number,
    configurations:
      UserCinemaMembershipConfigurationDto[],
    requestedDefaultCinemaId:
      number | null,
    currentUser: AuthUser,
  ) {
    const normalized =
      normalizeConfigurations(
        configurations,
      );
    const cinemaIds =
      normalized.map(
        (configuration) =>
          configuration.cinemaId,
      );

    if (
      requestedDefaultCinemaId !==
        null &&
      !cinemaIds.includes(
        requestedDefaultCinemaId,
      )
    ) {
      throw new BadRequestException(
        'Standardbiografen skal være blandt de aktive tilknytninger',
      );
    }

    const result =
      await withUserWriteLock(
        this.prisma,
        userId,
        async (
          transaction,
          lockedUserId,
        ) => {
          const user =
            await transaction.user.findUnique(
              {
                where: {
                  id: lockedUserId,
                },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  defaultCinemaId: true,
                },
              },
            );

          if (!user) {
            throw new NotFoundException(
              'Bruger blev ikke fundet',
            );
          }

          if (
            user.role === 'MASTER'
          ) {
            throw new BadRequestException(
              'MASTER-brugere bruger MASTER-panelets biografvalg',
            );
          }

          const cinemas =
            await transaction.cinema.findMany(
              {
                where: {
                  id: {
                    in: cinemaIds,
                  },
                },
                select: {
                  id: true,
                  name: true,
                },
              },
            );

          if (
            cinemas.length !==
            cinemaIds.length
          ) {
            throw new BadRequestException(
              'En eller flere valgte biografer findes ikke',
            );
          }

          await transaction.userCinemaMembership.updateMany(
            {
              where: {
                userId:
                  lockedUserId,
                isActive: true,
                ...(cinemaIds.length > 0
                  ? {
                      cinemaId: {
                        notIn:
                          cinemaIds,
                      },
                    }
                  : {}),
              },
              data: {
                isActive: false,
                deactivatedAt:
                  new Date(),
              },
            },
          );

          for (
            const configuration of
            normalized
          ) {
            await transaction.userCinemaMembership.upsert(
              {
                where: {
                  userId_cinemaId: {
                    userId:
                      lockedUserId,
                    cinemaId:
                      configuration.cinemaId,
                  },
                },
                create: {
                  userId:
                    lockedUserId,
                  ...configuration,
                  isActive: true,
                  deactivatedAt:
                    null,
                },
                update: {
                  ...configuration,
                  isActive: true,
                  deactivatedAt:
                    null,
                },
              },
            );
          }

          const nextDefaultCinemaId =
            cinemaIds.length === 0
              ? null
              : requestedDefaultCinemaId ??
                (user.defaultCinemaId &&
                cinemaIds.includes(
                  user.defaultCinemaId,
                )
                  ? user.defaultCinemaId
                  : cinemaIds[0] ??
                    null);

          if (
            user.defaultCinemaId !==
            nextDefaultCinemaId
          ) {
            await transaction.user.update(
              {
                where: {
                  id:
                    lockedUserId,
                },
                data: {
                  defaultCinemaId:
                    nextDefaultCinemaId,
                },
              },
            );
          }

          return {
            user,
            cinemas,
            nextDefaultCinemaId,
          };
        },
      );

    const cinemaDescription =
      normalized
        .map((configuration) => {
          const cinema =
            result.cinemas.find(
              (item) =>
                item.id ===
                configuration.cinemaId,
            );
          const role =
            configuration.role ===
            CinemaRole.ADMIN
              ? 'ADMIN'
              : 'EMPLOYEE';

          return `${
            cinema?.name ??
            configuration.cinemaId
          } (${role})`;
        })
        .sort(
          (first, second) =>
            first.localeCompare(
              second,
              'da',
            ),
        )
        .join(', ');

    await this.auditLogsService.create({
      action:
        'REPLACE_USER_CINEMA_MEMBERSHIP_CONFIGURATION',
      entityType: 'User',
      entityId: result.user.id,
      description:
        `Opdaterede biografspecifikke roller og rettigheder for ` +
        `${result.user.firstName} ${result.user.lastName}: ` +
        (cinemaDescription ||
          'ingen aktive biografer'),
      userId:
        getActorUserId(currentUser),
      cinemaId:
        result.nextDefaultCinemaId,
    });

    return findManagedUserCinemaMemberships(
      this.prisma,
      userId,
    );
  }
}
