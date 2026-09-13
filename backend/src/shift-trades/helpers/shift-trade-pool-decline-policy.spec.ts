import {
  ForbiddenException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import {
  ensureShiftTradeCanBeRejected,
} from './shift-trade-accept-validation';
import {
  buildShiftTradeNotificationCategoryWhere,
} from './shift-trade-notification-overview';
import {
  buildOpenShiftTradeCategoryWhere,
} from './shift-trade-page';
import {
  buildShiftTradePoolResponseSummary,
} from './shift-trade-pool-response-summary';

describe('vagtpulje personlige afslag', () => {
  it('tillader en anden medarbejder at takke nej til en åben pool-vagt', () => {
    expect(() =>
      ensureShiftTradeCanBeRejected(
        {
          status:
            ShiftTradeStatus.OPEN,
          type:
            ShiftTradeType.POOL,
          offeredByUserId: 4,
          targetUserId: null,
        },
        7,
      ),
    ).not.toThrow();
  });

  it('tillader ikke udbyderen at takke nej til sin egen pool-vagt', () => {
    expect(() =>
      ensureShiftTradeCanBeRejected(
        {
          status:
            ShiftTradeStatus.OPEN,
          type:
            ShiftTradeType.POOL,
          offeredByUserId: 4,
          targetUserId: null,
        },
        4,
      ),
    ).toThrow(
      ForbiddenException,
    );
  });

  it('skjuler en pool-vagt fra den medarbejder der allerede har takket nej', () => {
    const where =
      buildOpenShiftTradeCategoryWhere(
        7,
        3,
        new Date(
          '2026-09-13T12:00:00.000Z',
        ),
        ShiftTradeType.POOL,
      );

    expect(where).toMatchObject({
      declines: {
        none: {
          userId: 7,
        },
      },
    });
  });

  it('skjuler også afslåede pool-vagter i notifikationsoversigten', () => {
    const where =
      buildShiftTradeNotificationCategoryWhere(
        7,
        3,
        new Date(
          '2026-09-13T12:00:00.000Z',
        ),
        ShiftTradeType.POOL,
      );

    expect(where).toMatchObject({
      declines: {
        none: {
          userId: 7,
        },
      },
    });
  });

  it('viser både hvem der har takket nej og hvem der mangler at svare', () => {
    const summary =
      buildShiftTradePoolResponseSummary(
        12,
        [
          {
            id: 7,
            firstName: 'Test',
            lastName: '1 tester',
            userJobFunctions: [
              {
                jobFunctionId: 12,
              },
            ],
          },
          {
            id: 8,
            firstName: 'Test',
            lastName: '2 tester',
            userJobFunctions: [
              {
                jobFunctionId: 12,
              },
            ],
          },
        ],
        [
          {
            userId: 7,
            declinedAt:
              new Date(
                '2026-09-13T13:00:00.000Z',
              ),
            user: {
              id: 7,
              firstName: 'Test',
              lastName: '1 tester',
            },
          },
        ],
      );

    expect(summary).toMatchObject({
      totalRecipients: 2,
      declinedCount: 1,
      pendingCount: 1,
    });
    expect(
      summary.declined[0]?.user.id,
    ).toBe(7);
    expect(
      summary.pending[0]?.id,
    ).toBe(8);
  });
});
