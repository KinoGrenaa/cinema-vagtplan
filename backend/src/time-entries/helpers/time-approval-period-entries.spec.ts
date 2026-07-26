import { TimeEntryStatus } from '@prisma/client';
import {
  buildTimeApprovalPeriodWhere,
} from './time-approval-period-entries';

describe('time-approval payroll-period reads', () => {
  it('viser den valgte periode og bevarer alle uafsluttede registreringer', () => {
    const start = new Date('2026-06-30T22:00:00.000Z');
    const endExclusive = new Date('2026-07-31T22:00:00.000Z');

    expect(
      buildTimeApprovalPeriodWhere(
        { cinemaId: 7 },
        start,
        endExclusive,
      ),
    ).toEqual({
      AND: [
        { cinemaId: 7 },
        {
          OR: [
            {
              status: {
                in: [
                  TimeEntryStatus.PENDING,
                  TimeEntryStatus.NEEDS_CHANGES,
                ],
              },
            },
            {
              shiftId: {
                not: null,
              },
              shift: {
                startTime: {
                  gte: start,
                  lt: endExclusive,
                },
              },
            },
            {
              shiftId: null,
              clockIn: {
                gte: start,
                lt: endExclusive,
              },
            },
          ],
        },
      ],
    });
  });

  it('bevarer medarbejderafgrænsning i den fælles scope', () => {
    const start = new Date('2026-06-30T22:00:00.000Z');
    const endExclusive = new Date('2026-07-31T22:00:00.000Z');

    const where = buildTimeApprovalPeriodWhere(
      {
        cinemaId: 7,
        userId: 19,
      },
      start,
      endExclusive,
    );

    const filters = Array.isArray(where.AND) ? where.AND : [];

    expect(filters[0]).toEqual({
      cinemaId: 7,
      userId: 19,
    });
  });
});
