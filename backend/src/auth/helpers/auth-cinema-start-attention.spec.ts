import {
  findAuthCinemaStartAttention,
} from './auth-cinema-start-attention';

function membership(
  cinemaId: number,
  options: {
    role?: 'ADMIN' | 'EMPLOYEE';
    canManagePayroll?: boolean;
    canManageLeaveRequests?: boolean;
    disabledModules?: string[];
  } = {},
) {
  return {
    cinemaId,
    role: options.role ?? 'EMPLOYEE',
    canManagePayroll:
      options.canManagePayroll ?? false,
    canManageLeaveRequests:
      options.canManageLeaveRequests ?? false,
    cinema: {
      moduleSettings:
        options.disabledModules?.map(
          (moduleKey) => ({
            moduleKey,
            enabled: false,
          }),
        ) ?? [],
    },
  };
}

describe('findAuthCinemaStartAttention', () => {
  let prisma: {
    message: {
      groupBy: jest.Mock;
    };
    timeEntry: {
      groupBy: jest.Mock;
    };
    leaveRequest: {
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      message: {
        groupBy: jest.fn(),
      },
      timeEntry: {
        groupBy: jest.fn(),
      },
      leaveRequest: {
        groupBy: jest.fn(),
      },
    };
  });

  it('keeps attention counts strictly separated between cinemas', async () => {
    prisma.message.groupBy.mockResolvedValue([
      {
        cinemaId: 1,
        _count: {
          _all: 2,
        },
      },
      {
        cinemaId: 2,
        _count: {
          _all: 1,
        },
      },
    ]);
    prisma.timeEntry.groupBy
      .mockResolvedValueOnce([
        {
          cinemaId: 1,
          _count: {
            _all: 1,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          cinemaId: 2,
          _count: {
            _all: 3,
          },
        },
      ]);
    prisma.leaveRequest.groupBy.mockResolvedValue([
      {
        cinemaId: 2,
        _count: {
          _all: 2,
        },
      },
    ]);

    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1),
          membership(2, {
            role: 'ADMIN',
            canManagePayroll: true,
            canManageLeaveRequests: true,
          }),
        ],
      );

    expect(result.get(1)).toEqual({
      severity: 'ACTION_REQUIRED',
      actionRequiredCount: 1,
      informationalCount: 2,
      label: '1 forhold kræver din handling',
      items: [
        {
          type: 'OWN_TIME_ENTRY_CHANGES',
          severity: 'ACTION_REQUIRED',
          count: 1,
          label:
            '1 tidsregistrering skal rettes',
          linkUrl: '/my-time',
        },
        {
          type: 'UNREAD_MESSAGES',
          severity: 'INFORMATIONAL',
          count: 2,
          label: '2 ulæste beskeder',
          linkUrl: '/messages',
        },
      ],
    });
    expect(result.get(2)).toEqual({
      severity: 'ACTION_REQUIRED',
      actionRequiredCount: 5,
      informationalCount: 1,
      label: '5 forhold kræver din handling',
      items: [
        {
          type: 'TIME_APPROVAL',
          severity: 'ACTION_REQUIRED',
          count: 3,
          label:
            '3 tidsregistreringer afventer godkendelse',
          linkUrl: '/time-approval',
        },
        {
          type: 'LEAVE_APPROVAL',
          severity: 'ACTION_REQUIRED',
          count: 2,
          label:
            '2 fraværsanmodninger afventer behandling',
          linkUrl: '/leave-approval',
        },
        {
          type: 'UNREAD_MESSAGES',
          severity: 'INFORMATIONAL',
          count: 1,
          label: '1 ulæst besked',
          linkUrl: '/messages',
        },
      ],
    });

    expect(
      prisma.message.groupBy,
    ).toHaveBeenCalledWith({
      by: [
        'cinemaId',
      ],
      where: {
        cinemaId: {
          in: [
            1,
            2,
          ],
        },
        isRead: false,
        archivedAt: null,
        recalledAt: null,
        OR: [
          {
            receiverId: 7,
          },
          {
            isBroadcast: true,
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
    expect(
      prisma.timeEntry.groupBy,
    ).toHaveBeenNthCalledWith(1, {
      by: [
        'cinemaId',
      ],
      where: {
        cinemaId: {
          in: [
            1,
            2,
          ],
        },
        userId: 7,
        status: 'NEEDS_CHANGES',
      },
      _count: {
        _all: true,
      },
    });
    expect(
      prisma.timeEntry.groupBy,
    ).toHaveBeenNthCalledWith(2, {
      by: [
        'cinemaId',
      ],
      where: {
        cinemaId: {
          in: [
            2,
          ],
        },
        status: 'PENDING',
        clockOut: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    });
    expect(
      prisma.leaveRequest.groupBy,
    ).toHaveBeenCalledWith({
      by: [
        'cinemaId',
      ],
      where: {
        cinemaId: {
          in: [
            2,
          ],
        },
        status: 'PENDING',
      },
      _count: {
        _all: true,
      },
    });
  });

  it('omits disabled modules and administrative queues without permission', async () => {
    prisma.timeEntry.groupBy.mockResolvedValue([]);

    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1, {
            role: 'ADMIN',
            disabledModules: [
              'MESSAGES',
              'LEAVE',
            ],
          }),
          membership(2, {
            disabledModules: [
              'MESSAGES',
              'TIME_TRACKING',
              'LEAVE',
            ],
          }),
        ],
      );

    expect(result.get(1)).toEqual({
      severity: 'NONE',
      actionRequiredCount: 0,
      informationalCount: 0,
      label: 'Ingen aktuelle opgaver',
      items: [],
    });
    expect(result.get(2)).toEqual({
      severity: 'NONE',
      actionRequiredCount: 0,
      informationalCount: 0,
      label: 'Ingen aktuelle opgaver',
      items: [],
    });

    expect(
      prisma.message.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.timeEntry.groupBy,
    ).toHaveBeenCalledTimes(1);
    expect(
      prisma.timeEntry.groupBy,
    ).toHaveBeenCalledWith({
      by: [
        'cinemaId',
      ],
      where: {
        cinemaId: {
          in: [
            1,
          ],
        },
        userId: 7,
        status: 'NEEDS_CHANGES',
      },
      _count: {
        _all: true,
      },
    });
    expect(
      prisma.leaveRequest.groupBy,
    ).not.toHaveBeenCalled();
  });

  it('uses an informational state when only unread messages exist', async () => {
    prisma.message.groupBy.mockResolvedValue([
      {
        cinemaId: 1,
        _count: {
          _all: 4,
        },
      },
    ]);

    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1, {
            disabledModules: [
              'TIME_TRACKING',
              'LEAVE',
            ],
          }),
        ],
      );

    expect(result.get(1)).toMatchObject({
      severity: 'INFORMATIONAL',
      actionRequiredCount: 0,
      informationalCount: 4,
      label: '4 nye oplysninger',
    });
  });
});
