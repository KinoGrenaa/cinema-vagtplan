import {
  TimeEntryStatus,
} from '@prisma/client';

import {
  assertShiftHasNoActiveTimeEntry,
  SHIFT_TIME_ENTRY_LOCK_MESSAGE,
} from './shift-time-entry-lock';
import {
  scheduleShiftSelect,
} from './schedule-shift-read';

describe('shift time-entry lock', () => {
  it('ignorerer VOIDED og tillader vagten, når ingen aktiv registrering findes', async () => {
    const findFirst =
      jest.fn().mockResolvedValue(null);

    await expect(
      assertShiftHasNoActiveTimeEntry(
        {
          timeEntry: {
            findFirst,
          },
        } as never,
        {
          cinemaId: 3,
          shiftId: 44,
        },
      ),
    ).resolves.toBeUndefined();

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        cinemaId: 3,
        shiftId: 44,
        status: {
          not: TimeEntryStatus.VOIDED,
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('blokerer vagten, når en ikke-VOIDED registrering findes', async () => {
    const findFirst =
      jest.fn().mockResolvedValue({
        id: 99,
      });

    await expect(
      assertShiftHasNoActiveTimeEntry(
        {
          timeEntry: {
            findFirst,
          },
        } as never,
        {
          cinemaId: 3,
          shiftId: 44,
        },
      ),
    ).rejects.toThrow(
      SHIFT_TIME_ENTRY_LOCK_MESSAGE,
    );
  });

  it('sender kun ikke-VOIDED tidsregistreringer med i vagtplanens låsemarkør', () => {
    expect(
      scheduleShiftSelect.timeEntries,
    ).toEqual({
      where: {
        status: {
          not: TimeEntryStatus.VOIDED,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: 'desc',
      },
      take: 1,
    });
  });
});
