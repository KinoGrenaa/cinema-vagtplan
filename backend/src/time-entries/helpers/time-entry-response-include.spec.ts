import { getTimeEntryResponseInclude } from './time-entry-includes';

describe('getTimeEntryResponseInclude', () => {
  it('henter afsenderen på den seneste revision der sendte registreringen retur', () => {
    const include = getTimeEntryResponseInclude();

    expect(include.revisions).toEqual({
      where: {
        newStatus: 'NEEDS_CHANGES',
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: 1,
      select: {
        newAdminNote: true,
        changedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  });
});
