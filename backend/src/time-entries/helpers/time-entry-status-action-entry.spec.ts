import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { getTimeEntryWithUserCinemaShiftInclude } from './time-entry-includes';
import { findEditableStatusActionEntry } from './time-entry-status-action-helpers';

jest.mock('./time-entry-access', () => ({
  ensureTimeEntryEditable: jest.fn(),
  ensureUserCanAccessTimeEntry: jest.fn(),
}));

jest.mock('./time-entry-includes', () => ({
  getTimeEntryWithUserCinemaShiftInclude:
    jest.fn(() => ({
      user: true,
      cinema: true,
      payrollPeriod: true,
      shift: true,
    })),
}));

describe('editable time entry status action lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('henter shift sammen med registreringen til lønreference', async () => {
    const entry = {
      id: 41,
      cinemaId: 2,
      status: 'APPROVED',
      shift: {
        id: 19,
        startTime: new Date(
          '2026-07-20T21:30:00.000Z',
        ),
      },
    };
    const prisma = {
      timeEntry: {
        findUnique: jest
          .fn()
          .mockResolvedValue(entry),
      },
    };
    const user = {
      sub: 7,
      role: 'ADMIN',
      cinemaId: 2,
    };

    await expect(
      findEditableStatusActionEntry({
        prisma,
        id: 41,
        user,
      }),
    ).resolves.toBe(entry);

    expect(
      getTimeEntryWithUserCinemaShiftInclude,
    ).toHaveBeenCalledTimes(1);
    expect(
      prisma.timeEntry.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      include: {
        user: true,
        cinema: true,
        payrollPeriod: true,
        shift: true,
      },
    });
    expect(
      ensureUserCanAccessTimeEntry,
    ).toHaveBeenCalledWith(
      user,
      entry,
      undefined,
    );
    expect(
      ensureTimeEntryEditable,
    ).toHaveBeenCalledWith(
      entry,
      user,
    );
  });
});
