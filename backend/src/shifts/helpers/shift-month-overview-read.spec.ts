import { BadRequestException } from '@nestjs/common';
import { findShiftMonthOverview } from './shift-month-overview-read';

describe('findShiftMonthOverview', () => {
  it('viser de samme overlappende vagter på de relevante København-dage', async () => {
    const shifts = [
      {
        id: 1,
        startTime: new Date('2026-08-05T14:00:00.000Z'),
        endTime: new Date('2026-08-05T19:35:00.000Z'),
        note: null,
        userId: 4,
        jobFunctionId: 2,
        jobFunctionNameSnapshot: 'A Vagt Hverdag',
        jobFunctionColorSnapshot: '#2563eb',
        timingSource: 'MANUAL',
        user: {
          id: 4,
          firstName: 'Anna',
          lastName: 'Andersen',
          email: 'anna@example.com',
          profileImage: null,
        },
        jobFunction: {
          id: 2,
          name: 'A Vagt Hverdag',
          color: '#2563eb',
          isActive: true,
        },
      },
      {
        id: 2,
        startTime: new Date('2026-08-05T21:30:00.000Z'),
        endTime: new Date('2026-08-06T01:00:00.000Z'),
        note: null,
        userId: null,
        jobFunctionId: 3,
        jobFunctionNameSnapshot: 'Lukkevagt',
        jobFunctionColorSnapshot: '#f59e0b',
        timingSource: 'MANUAL',
        user: null,
        jobFunction: {
          id: 3,
          name: 'Lukkevagt',
          color: '#f59e0b',
          isActive: true,
        },
      },
    ];
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue(shifts),
      },
    } as any;

    const result = await findShiftMonthOverview(prisma, 1, 2026, 8);

    expect(result.totalShiftCount).toBe(2);
    expect(result.days.find((day) => day.dateKey === '2026-08-05')).toMatchObject({
      shiftCount: 2,
      assignedShiftCount: 1,
      unassignedShiftCount: 1,
    });
    expect(result.days.find((day) => day.dateKey === '2026-08-06')).toMatchObject({
      shiftCount: 1,
      assignedShiftCount: 0,
      unassignedShiftCount: 1,
    });
    expect(prisma.shift.findMany).toHaveBeenCalledTimes(1);
  });

  it('afviser en ugyldig måned', async () => {
    const prisma = {
      shift: {
        findMany: jest.fn(),
      },
    } as any;

    await expect(findShiftMonthOverview(prisma, 1, 2026, 13)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.shift.findMany).not.toHaveBeenCalled();
  });
});
