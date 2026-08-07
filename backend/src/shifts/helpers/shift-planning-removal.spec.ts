import { BadRequestException } from '@nestjs/common';

import {
  PLANNING_SHIFT_REMOVAL_CONFIRMATION_TEXT,
  buildPlanningShiftRemovalPreviewFromRows,
  buildPlanningShiftRemovalRange,
  parsePlanningShiftRemovalScope,
  removePlanningShifts,
} from './shift-planning-removal';

const futureNow = new Date('2026-08-06T10:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 41,
    startTime: new Date('2026-08-17T14:00:00.000Z'),
    endTime: new Date('2026-08-17T19:00:00.000Z'),
    userId: null,
    userFirstName: null,
    userLastName: null,
    userEmail: null,
    jobFunctionNameSnapshot: 'A Vagt Hverdag',
    timeEntryCount: 0,
    shiftTradeCount: 0,
    staffingRequestCount: 0,
    ...overrides,
  } as any;
}

describe('shift planning removal', () => {
  it('bygger et dagsinterval i København', () => {
    const range = buildPlanningShiftRemovalRange('DAY', '2026-08-17');
    expect(range.startDateKey).toBe('2026-08-17');
    expect(range.endDateKey).toBe('2026-08-17');
    expect(range.start.toISOString()).toBe('2026-08-16T22:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-17T22:00:00.000Z');
  });

  it('bygger mandag til søndag for en uge', () => {
    const range = buildPlanningShiftRemovalRange('WEEK', '2026-08-20');
    expect(range.startDateKey).toBe('2026-08-17');
    expect(range.endDateKey).toBe('2026-08-23');
  });

  it('bygger hele kalendermåneden', () => {
    const range = buildPlanningShiftRemovalRange('MONTH', '2026-08-20');
    expect(range.startDateKey).toBe('2026-08-01');
    expect(range.endDateKey).toBe('2026-08-31');
  });

  it('afviser ukendt omfang', () => {
    expect(() => parsePlanningShiftRemovalScope('YEAR')).toThrow(
      BadRequestException,
    );
  });

  it('viser tildelte og oprettelige vagter', () => {
    const range = buildPlanningShiftRemovalRange('WEEK', '2026-08-20');
    const preview = buildPlanningShiftRemovalPreviewFromRows(
      1,
      range,
      [
        row(),
        row({
          id: 42,
          userId: 7,
          userFirstName: 'Anna',
          userLastName: 'Jensen',
          startTime: new Date('2026-08-18T14:00:00.000Z'),
        }),
      ],
      futureNow,
    );

    expect(preview.summary).toMatchObject({
      selectedShiftCount: 2,
      deletableShiftCount: 2,
      blockedShiftCount: 0,
      assignedShiftCount: 1,
      canRemove: true,
    });
    expect(preview.items[1].userName).toBe('Anna Jensen');
  });

  it('blokerer startede vagter og vagter med afhængigheder', () => {
    const range = buildPlanningShiftRemovalRange('WEEK', '2026-08-20');
    const preview = buildPlanningShiftRemovalPreviewFromRows(
      1,
      range,
      [
        row({
          startTime: new Date('2026-08-06T09:00:00.000Z'),
          timeEntryCount: 1,
          shiftTradeCount: 1,
          staffingRequestCount: 1,
        }),
      ],
      futureNow,
    );

    expect(preview.summary.canRemove).toBe(false);
    expect(preview.summary.blockedShiftCount).toBe(1);
    expect(preview.items[0].blockReasons).toHaveLength(4);
  });

  it('kræver den eksplicitte bekræftelse', async () => {
    await expect(
      removePlanningShifts(
        {
          prisma: {} as any,
          realtimeGateway: {} as any,
          pushService: {} as any,
        },
        { sub: 1 },
        {
          cinemaId: 1,
          scope: 'DAY',
          dateKey: '2026-08-17',
          confirmationText: 'JA',
          now: futureNow,
        },
      ),
    ).rejects.toThrow('Bekræft fjernelsen');
  });

  it('fjerner alle kontrollerede vagter samlet og sender én opdatering', async () => {
    const lockedRows = [row(), row({ id: 42, userId: 7 })];
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce(lockedRows)
        .mockResolvedValueOnce([{ id: 41 }, { id: 42 }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as any;
    const realtimeGateway = { notifyCinema: jest.fn() } as any;
    const pushService = {
      sendToUserInCinema: jest.fn().mockResolvedValue(undefined),
    } as any;

    const result = await removePlanningShifts(
      { prisma, realtimeGateway, pushService },
      { sub: 3 },
      {
        cinemaId: 1,
        scope: 'WEEK',
        dateKey: '2026-08-20',
        confirmationText: PLANNING_SHIFT_REMOVAL_CONFIRMATION_TEXT,
        now: futureNow,
      },
    );

    expect(result.removedShiftCount).toBe(2);
    expect(realtimeGateway.notifyCinema).toHaveBeenCalledWith(
      1,
      'shiftsUpdated',
      expect.objectContaining({
        source: 'SHIFT_PLANNING_BULK_REMOVAL',
        removedShiftCount: 2,
      }),
    );
    expect(pushService.sendToUserInCinema).toHaveBeenCalledTimes(1);
  });
});
