import {
  findAuthCinemaStartAttention,
} from './auth-cinema-start-attention';

function membership(
  cinemaId: number,
  options: {
    role?: 'ADMIN' | 'EMPLOYEE';
    canManageSchedule?: boolean;
    canManagePayroll?: boolean;
    canManageLeaveRequests?: boolean;
    disabledModules?: string[];
  } = {},
) {
  return {
    cinemaId,
    role: options.role ?? 'EMPLOYEE',
    canManageSchedule:
      options.canManageSchedule ?? false,
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

function group(
  cinemaId: number,
  count: number,
) {
  return {
    cinemaId,
    _count: {
      _all: count,
    },
  };
}

describe('findAuthCinemaStartAttention', () => {
  let prisma: {
    shift: {
      groupBy: jest.Mock;
    };
    message: {
      groupBy: jest.Mock;
    };
    shiftTrade: {
      groupBy: jest.Mock;
    };
    staffingRequest: {
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
      shift: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
      message: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
      shiftTrade: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
      staffingRequest: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
      timeEntry: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        groupBy:
          jest.fn().mockResolvedValue([]),
      },
    };
  });

  it('keeps personal and administrative attention strictly separated between cinemas', async () => {
    prisma.shift.groupBy.mockResolvedValue([
      group(2, 1),
    ]);
    prisma.message.groupBy.mockResolvedValue([
      group(1, 2),
      group(2, 1),
    ]);
    prisma.shiftTrade.groupBy.mockResolvedValue([
      group(1, 2),
      group(2, 1),
    ]);
    prisma.staffingRequest.groupBy.mockResolvedValue([
      group(1, 1),
      group(2, 4),
    ]);
    prisma.timeEntry.groupBy
      .mockResolvedValueOnce([
        group(1, 1),
      ])
      .mockResolvedValueOnce([
        group(2, 3),
      ]);
    prisma.leaveRequest.groupBy.mockResolvedValue([
      group(2, 2),
    ]);

    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1),
          membership(2, {
            role: 'ADMIN',
            canManageSchedule: true,
            canManagePayroll: true,
            canManageLeaveRequests: true,
          }),
        ],
        new Date(
          '2026-07-28T08:00:00.000Z',
        ),
      );

    expect(result.get(1)).toEqual({
      severity: 'ACTION_REQUIRED',
      actionRequiredCount: 4,
      informationalCount: 2,
      label: '4 forhold kræver din handling',
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
          type: 'DIRECT_SHIFT_TRADES',
          severity: 'ACTION_REQUIRED',
          count: 2,
          label:
            '2 direkte vagtbytter afventer dit svar',
          linkUrl: '/shift-trades',
        },
        {
          type: 'TARGETED_STAFFING_REQUESTS',
          severity: 'ACTION_REQUIRED',
          count: 1,
          label:
            '1 bemandingsforespørgsel afventer dit svar',
          linkUrl: '/staffing-requests',
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
      actionRequiredCount: 11,
      informationalCount: 1,
      label:
        '11 forhold kræver din handling',
      items: [
        {
          type: 'UNSTAFFED_UPCOMING_SHIFTS',
          severity: 'ACTION_REQUIRED',
          count: 1,
          label:
            '1 ubemandet vagt starter inden for 24 timer',
          linkUrl: '/schedule',
        },
        {
          type: 'DIRECT_SHIFT_TRADES',
          severity: 'ACTION_REQUIRED',
          count: 1,
          label:
            '1 direkte vagtbytte afventer dit svar',
          linkUrl: '/shift-trades',
        },
        {
          type: 'TARGETED_STAFFING_REQUESTS',
          severity: 'ACTION_REQUIRED',
          count: 4,
          label:
            '4 bemandingsforespørgsler afventer dit svar',
          linkUrl: '/staffing-requests',
        },
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
  });

  it('queries only nearby unstaffed shifts for schedule administrators', async () => {
    const now = new Date(
      '2026-07-28T08:00:00.000Z',
    );
    const criticalWindowEnd = new Date(
      '2026-07-29T08:00:00.000Z',
    );

    await findAuthCinemaStartAttention(
      prisma as never,
      7,
      [
        membership(1, {
          role: 'ADMIN',
          canManageSchedule: true,
          disabledModules: [
            'MESSAGES',
            'TIME_TRACKING',
            'LEAVE',
            'SHIFT_TRADES',
            'STAFFING_REQUESTS',
          ],
        }),
      ],
      now,
    );

    expect(
      prisma.shift.groupBy,
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
        userId: null,
        endTime: {
          gt: now,
        },
        startTime: {
          lte: criticalWindowEnd,
        },
      },
      _count: {
        _all: true,
      },
    });
  });

  it('queries only future direct actions for the signed-in user', async () => {
    const now = new Date(
      '2026-07-28T08:00:00.000Z',
    );

    await findAuthCinemaStartAttention(
      prisma as never,
      7,
      [
        membership(1, {
          disabledModules: [
            'MESSAGES',
            'TIME_TRACKING',
            'LEAVE',
          ],
        }),
      ],
      now,
    );

    expect(
      prisma.shiftTrade.groupBy,
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
        status: 'OPEN',
        type: 'DIRECT',
        targetUserId: 7,
        offeredByUserId: {
          not: 7,
        },
        shift: {
          startTime: {
            gt: now,
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    expect(
      prisma.staffingRequest.groupBy,
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
        status: 'PENDING',
        targetUserId: 7,
        requestedByUserId: {
          not: 7,
        },
        AND: [
          {
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: now,
                },
              },
            ],
          },
          {
            OR: [
              {
                shift: {
                  startTime: {
                    gt: now,
                  },
                },
              },
              {
                shiftId: null,
                requestStartTime: {
                  gt: now,
                },
              },
            ],
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
  });

  it('omits actions when their cinema modules are disabled', async () => {
    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1, {
            disabledModules: [
              'SCHEDULE',
              'MESSAGES',
              'TIME_TRACKING',
              'LEAVE',
              'SHIFT_TRADES',
              'STAFFING_REQUESTS',
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
    expect(
      prisma.shift.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.message.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.shiftTrade.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.staffingRequest.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.timeEntry.groupBy,
    ).not.toHaveBeenCalled();
    expect(
      prisma.leaveRequest.groupBy,
    ).not.toHaveBeenCalled();
  });

  it('does not expose administrative queues without the required permissions', async () => {
    await findAuthCinemaStartAttention(
      prisma as never,
      7,
      [
        membership(1, {
          role: 'ADMIN',
          disabledModules: [
            'SCHEDULE',
            'MESSAGES',
            'SHIFT_TRADES',
            'STAFFING_REQUESTS',
          ],
        }),
      ],
    );

    expect(
      prisma.shift.groupBy,
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
      group(1, 4),
    ]);

    const result =
      await findAuthCinemaStartAttention(
        prisma as never,
        7,
        [
          membership(1, {
            disabledModules: [
              'SCHEDULE',
              'TIME_TRACKING',
              'LEAVE',
              'SHIFT_TRADES',
              'STAFFING_REQUESTS',
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
