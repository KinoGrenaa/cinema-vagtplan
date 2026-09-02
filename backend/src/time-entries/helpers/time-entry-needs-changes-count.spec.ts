import { countNeedsChangesTimeEntries } from './time-entry-needs-changes-count';

describe('countNeedsChangesTimeEntries', () => {
  it('tæller kun egne tidsregistreringer der kræver medarbejderens handling', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const prisma = {
      timeEntry: {
        count,
      },
    };

    await expect(
      countNeedsChangesTimeEntries(
        prisma,
        {
          userId: 7,
          cinemaId: 3,
        },
      ),
    ).resolves.toBe(2);

    expect(count).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
        status: 'NEEDS_CHANGES',
      },
    });
  });
});
