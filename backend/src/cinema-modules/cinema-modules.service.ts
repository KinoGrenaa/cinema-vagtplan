import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CINEMA_MODULE_CATALOG,
  CINEMA_MODULE_KEYS,
  isCinemaModuleKey,
  type CinemaModuleKey,
} from './cinema-module-catalog';
import {
  getCinemaModuleDependencies,
  getCinemaModuleDependencyMessage,
} from './cinema-module-dependencies';
import type { CinemaModuleUpdate } from './cinema-module-input';

type CinemaModuleDbClient = Prisma.TransactionClient;

type StoredCinemaModuleSetting = {
  moduleKey: string;
  enabled: boolean;
  updatedAt?: Date | null;
};

const CINEMA_MODULE_LOCK_NAMESPACE = 1_435_988_811;

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
    const cinema = await prisma.cinema.findUnique({
      where: {
        id: cinemaId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return cinema;
  }

  private async ensureCatalogRows(
    prisma: CinemaModuleDbClient,
    cinemaId: number,
  ) {
    const existing = await prisma.cinemaModuleSetting.findMany({
      where: {
        cinemaId,
      },
      select: {
        moduleKey: true,
      },
    });
    const existingKeys = new Set(
      existing.map((setting) => setting.moduleKey),
    );
    const missingKeys = CINEMA_MODULE_KEYS.filter(
      (key) => !existingKeys.has(key),
    );

    if (missingKeys.length === 0) {
      return;
    }

    await prisma.cinemaModuleSetting.createMany({
      data: missingKeys.map((moduleKey) => ({
        cinemaId,
        moduleKey,
        enabled: true,
      })),
      skipDuplicates: true,
    });
  }

  private buildStoredState(settings: StoredCinemaModuleSetting[]) {
    const state = new Map<CinemaModuleKey, boolean>();

    for (const moduleKey of CINEMA_MODULE_KEYS) {
      state.set(moduleKey, true);
    }

    for (const setting of settings) {
      if (isCinemaModuleKey(setting.moduleKey)) {
        state.set(setting.moduleKey, setting.enabled);
      }
    }

    return state;
  }

  private applyDisabledDependencies(
    state: Map<CinemaModuleKey, boolean>,
  ) {
    let changed = true;

    while (changed) {
      changed = false;

      for (const moduleKey of CINEMA_MODULE_KEYS) {
        if (state.get(moduleKey) !== true) {
          continue;
        }

        const hasDisabledDependency = getCinemaModuleDependencies(
          moduleKey,
        ).some((dependencyKey) => state.get(dependencyKey) !== true);

        if (hasDisabledDependency) {
          state.set(moduleKey, false);
          changed = true;
        }
      }
    }
  }

  private resolveUpdates(
    settings: StoredCinemaModuleSetting[],
    modules: CinemaModuleUpdate[],
  ) {
    const storedState = this.buildStoredState(settings);
    const resolvedState = new Map(storedState);

    // Gamle inkonsistente data må ikke få et afhængigt modul til at blive
    // genaktiveret skjult, når grundmodulet senere slås til.
    this.applyDisabledDependencies(resolvedState);

    const explicitlyDisabled = new Set<CinemaModuleKey>(
      modules
        .filter((module) => !module.enabled)
        .map((module) => module.key),
    );

    for (const module of modules) {
      resolvedState.set(module.key, module.enabled);
    }

    for (const module of modules) {
      if (!module.enabled) {
        continue;
      }

      for (const dependencyKey of getCinemaModuleDependencies(module.key)) {
        if (
          resolvedState.get(dependencyKey) !== true &&
          !explicitlyDisabled.has(dependencyKey)
        ) {
          throw new BadRequestException(
            getCinemaModuleDependencyMessage(module.key, dependencyKey),
          );
        }
      }
    }

    // Når et grundmodul deaktiveres, vinder det over afhængige moduler i
    // samme request. Dermed kan en fuld formular gemmes atomisk.
    this.applyDisabledDependencies(resolvedState);

    const keysToPersist = new Set<CinemaModuleKey>(
      modules.map((module) => module.key),
    );

    for (const moduleKey of CINEMA_MODULE_KEYS) {
      if (resolvedState.get(moduleKey) !== storedState.get(moduleKey)) {
        keysToPersist.add(moduleKey);
      }
    }

    return CINEMA_MODULE_KEYS.filter((moduleKey) =>
      keysToPersist.has(moduleKey),
    ).map((moduleKey) => ({
      key: moduleKey,
      enabled: resolvedState.get(moduleKey) ?? true,
    }));
  }

  private async buildResponse(
    prisma: CinemaModuleDbClient,
    cinema: {
      id: number;
      name: string;
    },
  ) {
    await this.ensureCatalogRows(prisma, cinema.id);

    const settings = await prisma.cinemaModuleSetting.findMany({
      where: {
        cinemaId: cinema.id,
      },
      select: {
        moduleKey: true,
        enabled: true,
        updatedAt: true,
      },
    });
    const settingByKey = new Map(
      settings.map((setting) => [setting.moduleKey, setting]),
    );
    const effectiveState = this.buildStoredState(settings);
    this.applyDisabledDependencies(effectiveState);

    return {
      cinema,
      modules: CINEMA_MODULE_CATALOG.map((module) => {
        const setting = settingByKey.get(module.key);

        return {
          ...module,
          requires: getCinemaModuleDependencies(module.key),
          enabled: effectiveState.get(module.key) ?? true,
          updatedAt: setting?.updatedAt ?? null,
        };
      }),
    };
  }

  async findForCinema(cinemaId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const cinema = await this.findCinemaOrThrow(transaction, cinemaId);
      return this.buildResponse(transaction, cinema);
    });
  }

  async updateForCinema(
    cinemaId: number,
    modules: CinemaModuleUpdate[],
    actorUserId: number,
  ) {
    const { result, resolvedUpdates } = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(
            CAST(${CINEMA_MODULE_LOCK_NAMESPACE} AS integer),
            CAST(${cinemaId} AS integer)
          )
        `;
        const cinema = await this.findCinemaOrThrow(transaction, cinemaId);
        await this.ensureCatalogRows(transaction, cinemaId);

        const currentSettings =
          await transaction.cinemaModuleSetting.findMany({
            where: {
              cinemaId,
            },
            select: {
              moduleKey: true,
              enabled: true,
            },
          });
        const resolvedUpdates = this.resolveUpdates(
          currentSettings,
          modules,
        );

        for (const module of resolvedUpdates) {
          await transaction.cinemaModuleSetting.upsert({
            where: {
              cinemaId_moduleKey: {
                cinemaId,
                moduleKey: module.key,
              },
            },
            create: {
              cinemaId,
              moduleKey: module.key,
              enabled: module.enabled,
            },
            update: {
              enabled: module.enabled,
            },
          });
        }

        return {
          result: await this.buildResponse(transaction, cinema),
          resolvedUpdates,
        };
      },
    );

    const changedSummary = resolvedUpdates
      .map(
        (module) =>
          `${module.key}=${module.enabled ? 'enabled' : 'disabled'}`,
      )
      .join(', ');

    await this.auditLogsService.create({
      action: 'CINEMA_MODULES_UPDATED',
      entityType: 'Cinema',
      entityId: cinemaId,
      userId: actorUserId,
      cinemaId,
      description: `Modulindstillinger opdateret: ${changedSummary}`,
    });

    return result;
  }

  private async isEnabledWithDependencies(
    cinemaId: number,
    moduleKey: CinemaModuleKey,
    visited: Set<CinemaModuleKey>,
  ): Promise<boolean> {
    if (visited.has(moduleKey)) {
      return true;
    }
    visited.add(moduleKey);

    const setting = await this.prisma.cinemaModuleSetting.findUnique({
      where: {
        cinemaId_moduleKey: {
          cinemaId,
          moduleKey,
        },
      },
      select: {
        enabled: true,
      },
    });

    if (setting?.enabled === false) {
      return false;
    }

    for (const dependencyKey of getCinemaModuleDependencies(moduleKey)) {
      if (
        !(await this.isEnabledWithDependencies(
          cinemaId,
          dependencyKey,
          visited,
        ))
      ) {
        return false;
      }
    }

    return true;
  }

  async isEnabled(cinemaId: number, moduleKey: CinemaModuleKey) {
    return this.isEnabledWithDependencies(cinemaId, moduleKey, new Set());
  }
}
