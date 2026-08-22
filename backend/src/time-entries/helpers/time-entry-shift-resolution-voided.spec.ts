import { BadRequestException } from '@nestjs/common';
import { TimeEntryStatus } from '@prisma/client';

import { ensureNoExistingEntryForShift } from './time-entry-shift-resolution';

describe('ensureNoExistingEntryForShift with voided entries', () => {
  it('ignores a voided prior registration so the shift can be registered again', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);

    await expect(
      ensureNoExistingEntryForShift(
        {
          timeEntry: {
            findFirst,
          },
        } as any,
        {
          shiftId: 44,
          userId: 12,
          cinemaId: 3,
          message:
            'Der findes allerede en tidsregistrering for denne vagt',
        },
      ),
    ).resolves.toBeUndefined();

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 12,
        shiftId: 44,
        cinemaId: 3,
        status: {
          not: TimeEntryStatus.VOIDED,
        },
      },
    });
  });

  it('blocks a new registration when a non-voided entry exists', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 99,
      status: TimeEntryStatus.PENDING,
    });

    await expect(
      ensureNoExistingEntryForShift(
        {
          timeEntry: {
            findFirst,
          },
        } as any,
        {
          shiftId: 44,
          userId: 12,
          cinemaId: 3,
          message:
            'Der findes allerede en tidsregistrering for denne vagt',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
