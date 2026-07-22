import { NotFoundException } from '@nestjs/common';
import { CinemaModulesService } from './cinema-modules.service';

function createService(
  transaction: Record<string, any>,
) {
  const prisma = {
    $transaction: jest.fn(
      async (
        callback: (
          value: typeof transaction,
        ) => unknown,
      ) => callback(transaction),
    ),
    cinemaModuleSetting: {
      findUnique: jest.fn(),
    },
  };
  const auditLogsService = {
    create: jest.fn(),
  };

  return {
    prisma,
    auditLogsService,
    service:
      new CinemaModulesService(
        prisma as never,
        auditLogsService as never,
      ),
  };
}

describe('CinemaModulesService', () => {
  it('creates missing catalog rows as enabled defaults', async () => {
    const transaction = {
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 2,
            name: 'Kino Grenaa',
          }),
      },
      cinemaModuleSetting: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
        createMany: jest
          .fn()
          .mockResolvedValue({
            count: 10,
          }),
      },
    };
    const { service } =
      createService(transaction);

    const result =
      await service.findForCinema(2);

    expect(
      transaction.cinemaModuleSetting.createMany,
    ).toHaveBeenCalled();
    expect(result.modules).toHaveLength(
      10,
    );
    expect(
      result.modules.every(
        (module) => module.enabled,
      ),
    ).toBe(true);
  });

  it('updates modules inside a per-cinema lock and audits the change', async () => {
    const settings = [
      {
        moduleKey: 'PAYROLL',
        enabled: false,
        updatedAt: new Date(),
      },
    ];
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 2,
            name: 'Kino Grenaa',
          }),
      },
      cinemaModuleSetting: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(
            settings,
          )
          .mockResolvedValueOnce(
            settings,
          )
          .mockResolvedValueOnce(
            settings,
          ),
        createMany: jest.fn(),
        upsert: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
    };
    const {
      service,
      auditLogsService,
    } = createService(transaction);

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

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(
      transaction.cinemaModuleSetting.upsert,
    ).toHaveBeenCalledWith(
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
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action:
          'CINEMA_MODULES_UPDATED',
        entityId: 2,
        userId: 7,
        cinemaId: 2,
      }),
    );
  });

  it('rejects an unknown cinema', async () => {
    const transaction = {
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
      },
    };
    const { service } =
      createService(transaction);

    await expect(
      service.findForCinema(999),
    ).rejects.toThrow(
      NotFoundException,
    );
  });
});
