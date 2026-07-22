import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CINEMA_MODULE_CATALOG,
  CINEMA_MODULE_KEYS,
  type CinemaModuleKey,
} from './cinema-module-catalog';
import type {
  CinemaModuleUpdate,
} from './cinema-module-input';

type CinemaModuleDbClient =
  Prisma.TransactionClient;

const CINEMA_MODULE_LOCK_NAMESPACE =
  1_435_988_811;

@Injectable()
export class CinemaModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async findCinemaOrThrow(
    prisma: CinemaModuleDbClient,
    cinemaId: number,
  ) {
    const cinema =
      await prisma.cinema.findUnique({
        where: {
          id: cinemaId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!cinema) {
      throw new NotFoundException(
        'Biograf blev ikke fundet',
      );
    }

    return cinema;
  }

  private async ensureCatalogRows(
    prisma: CinemaModuleDbClient,
    cinemaId: number,
  ) {
    const existing =
      await prisma.cinemaModuleSetting.findMany(
        {
          where: {
            cinemaId,
          },
          select: {
            moduleKey: true,
          },
        },
      );

    const existingKeys = new Set(
      existing.map(
        (setting) =>
          setting.moduleKey,
      ),
    );

    const missingKeys =
      CINEMA_MODULE_KEYS.filter(
        (key) => !existingKeys.has(key),
      );

    if (missingKeys.length === 0) {
      return;
    }

    await prisma.cinemaModuleSetting.createMany(
      {
        data: missingKeys.map(
          (moduleKey) => ({
            cinemaId,
            moduleKey,
            enabled: true,
          }),
        ),
        skipDuplicates: true,
      },
    );
  }

  private async buildResponse(
    prisma: CinemaModuleDbClient,
    cinema: {
      id: number;
      name: string;
    },
  ) {
    await this.ensureCatalogRows(
      prisma,
      cinema.id,
    );

    const settings =
      await prisma.cinemaModuleSetting.findMany(
        {
          where: {
            cinemaId: cinema.id,
          },
          select: {
            moduleKey: true,
            enabled: true,
            updatedAt: true,
          },
        },
      );

    const settingByKey = new Map(
      settings.map((setting) => [
        setting.moduleKey,
        setting,
      ]),
    );

    return {
      cinema,
      modules:
        CINEMA_MODULE_CATALOG.map(
          (module) => {
            const setting =
              settingByKey.get(
                module.key,
              );

            return {
              ...module,
              enabled:
                setting?.enabled ??
                true,
              updatedAt:
                setting?.updatedAt ??
                null,
            };
          },
        ),
    };
  }

  async findForCinema(
    cinemaId: number,
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const cinema =
          await this.findCinemaOrThrow(
            transaction,
            cinemaId,
          );

        return this.buildResponse(
          transaction,
          cinema,
        );
      },
    );
  }

  async updateForCinema(
    cinemaId: number,
    modules: CinemaModuleUpdate[],
    actorUserId: number,
  ) {
    const result =
      await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$executeRaw`
            SELECT pg_advisory_xact_lock(
              ${CINEMA_MODULE_LOCK_NAMESPACE},
              ${cinemaId}
            )
          `;

          const cinema =
            await this.findCinemaOrThrow(
              transaction,
              cinemaId,
            );

          await this.ensureCatalogRows(
            transaction,
            cinemaId,
          );

          for (const module of modules) {
            await transaction.cinemaModuleSetting.upsert(
              {
                where: {
                  cinemaId_moduleKey: {
                    cinemaId,
                    moduleKey:
                      module.key,
                  },
                },
                create: {
                  cinemaId,
                  moduleKey:
                    module.key,
                  enabled:
                    module.enabled,
                },
                update: {
                  enabled:
                    module.enabled,
                },
              },
            );
          }

          return this.buildResponse(
            transaction,
            cinema,
          );
        },
      );

    const changedSummary = modules
      .map(
        (module) =>
          `${module.key}=${
            module.enabled
              ? 'enabled'
              : 'disabled'
          }`,
      )
      .join(', ');

    await this.auditLogsService.create({
      action:
        'CINEMA_MODULES_UPDATED',
      entityType: 'Cinema',
      entityId: cinemaId,
      userId: actorUserId,
      cinemaId,
      description:
        `Modulindstillinger opdateret: ${changedSummary}`,
    });

    return result;
  }

  async isEnabled(
    cinemaId: number,
    moduleKey: CinemaModuleKey,
  ) {
    const setting =
      await this.prisma.cinemaModuleSetting.findUnique(
        {
          where: {
            cinemaId_moduleKey: {
              cinemaId,
              moduleKey,
            },
          },
          select: {
            enabled: true,
          },
        },
      );

    return setting?.enabled ?? true;
  }
}
