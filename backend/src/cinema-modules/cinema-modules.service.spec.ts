import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CINEMA_MODULE_KEYS } from './cinema-module-catalog';
import { CinemaModulesService } from './cinema-modules.service';

type SettingState = Map<string, boolean>;

function createService(options?: {
  cinemaExists?: boolean;
  initialSettings?: Record<string, boolean>;
}) {
  const settings: SettingState = new Map(
    Object.entries(options?.initialSettings ?? {}),
  );
  const cinemaExists = options?.cinemaExists ?? true;

  const transaction = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    cinema: {
      findUnique: jest.fn().mockResolvedValue(
        cinemaExists
          ? {
              id: 2,
              name: 'Kino Grenaa',
            }
          : null,
      ),
    },
    cinemaModuleSetting: {
      findMany: jest.fn().mockImplementation(() =>
        [...settings.entries()].map(([moduleKey, enabled]) => ({
          moduleKey,
          enabled,
          updatedAt: new Date('2026-07-22T08:00:00.000Z'),
        })),
      ),
      createMany: jest.fn().mockImplementation(({ data }) => {
        for (const setting of data) {
          if (!settings.has(setting.moduleKey)) {
            settings.set(setting.moduleKey, setting.enabled);
          }
        }
        return {
          count: data.length,
        };
      }),
      upsert: jest.fn().mockImplementation(({ create, update }) => {
        settings.set(create.moduleKey, update.enabled);
        return {
          id: 1,
        };
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (
        callback: (value: typeof transaction) => unknown,
      ) => callback(transaction),
    ),
    cinemaModuleSetting: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const moduleKey = where.cinemaId_moduleKey.moduleKey;
        const enabled = settings.get(moduleKey);
        return enabled === undefined ? null : { enabled };
      }),
    },
  };
  const auditLogsService = {
    create: jest.fn(),
  };

  return {
    settings,
    transaction,
    prisma,
    auditLogsService,
    service: new CinemaModulesService(
      prisma as never,
      auditLogsService as never,
    ),
  };
}

describe('CinemaModulesService', () => {
  it('creates missing catalog rows as enabled defaults', async () => {
    const { service, transaction } = createService();

    const result = await service.findForCinema(2);

    expect(transaction.cinemaModuleSetting.createMany).toHaveBeenCalled();
    expect(result.modules).toHaveLength(CINEMA_MODULE_KEYS.length);
    expect(result.modules.every((module) => module.enabled)).toBe(true);
    expect(
      result.modules.find((module) => module.key === 'SHIFT_PLANNING')
        ?.requires,
    ).toEqual(['SCHEDULE']);
  });

  it('updates modules inside a per-cinema lock and audits the change', async () => {
    const initialSettings = Object.fromEntries(
      CINEMA_MODULE_KEYS.map((key) => [key, true]),
    );
    const { service, transaction, auditLogsService } = createService({
      initialSettings,
    });

    await service.updateForCinema(
      2,
      [
        {
          key: 'PAYROLL',
          enabled: false,
        },
      ],
      7,
    );

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    const [rawQueryParts, lockNamespace, lockedCinemaId] =
      transaction.$executeRaw.mock.calls[0];
    expect(Array.from(rawQueryParts).join('')).toContain(
      'CAST( AS integer)',
    );
    expect(lockNamespace).toBe(1_435_988_811);
    expect(lockedCinemaId).toBe(2);
    expect(transaction.cinemaModuleSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cinemaId_moduleKey: {
            cinemaId: 2,
            moduleKey: 'PAYROLL',
          },
        },
        update: {
          enabled: false,
        },
      }),
    );
    expect(auditLogsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CINEMA_MODULES_UPDATED',
        entityId: 2,
        userId: 7,
        cinemaId: 2,
      }),
    );
  });

  it('automatically disables monthly planning when schedule is disabled', async () => {
    const initialSettings = Object.fromEntries(
      CINEMA_MODULE_KEYS.map((key) => [key, true]),
    );
    const { service, settings, transaction, auditLogsService } =
      createService({
        initialSettings,
      });

    const result = await service.updateForCinema(
      2,
      [
        {
          key: 'SCHEDULE',
          enabled: false,
        },
      ],
      7,
    );

    expect(settings.get('SCHEDULE')).toBe(false);
    expect(settings.get('SHIFT_PLANNING')).toBe(false);
    expect(
      result.modules.find((module) => module.key === 'SCHEDULE')?.enabled,
    ).toBe(false);
    expect(
      result.modules.find((module) => module.key === 'SHIFT_PLANNING')
        ?.enabled,
    ).toBe(false);
    expect(transaction.cinemaModuleSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          enabled: false,
        },
        where: {
          cinemaId_moduleKey: {
            cinemaId: 2,
            moduleKey: 'SHIFT_PLANNING',
          },
        },
      }),
    );
    expect(auditLogsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('SHIFT_PLANNING=disabled'),
      }),
    );
  });

  it('rejects enabling monthly planning while schedule remains disabled', async () => {
    const initialSettings = Object.fromEntries(
      CINEMA_MODULE_KEYS.map((key) => [key, true]),
    );
    initialSettings.SCHEDULE = false;
    initialSettings.SHIFT_PLANNING = false;
    const { service, auditLogsService } = createService({
      initialSettings,
    });

    await expect(
      service.updateForCinema(
        2,
        [
          {
            key: 'SHIFT_PLANNING',
            enabled: true,
          },
        ],
        7,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateForCinema(
        2,
        [
          {
            key: 'SHIFT_PLANNING',
            enabled: true,
          },
        ],
        7,
      ),
    ).rejects.toThrow(
      'Månedsplanlægning kræver, at Vagtplan er aktiv.',
    );
    expect(auditLogsService.create).not.toHaveBeenCalled();
  });

  it('treats monthly planning as disabled when schedule is disabled', async () => {
    const { service, prisma } = createService({
      initialSettings: {
        SCHEDULE: false,
        SHIFT_PLANNING: true,
      },
    });

    await expect(service.isEnabled(2, 'SHIFT_PLANNING')).resolves.toBe(
      false,
    );
    expect(prisma.cinemaModuleSetting.findUnique).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown cinema', async () => {
    const { service } = createService({
      cinemaExists: false,
    });

    await expect(service.findForCinema(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
