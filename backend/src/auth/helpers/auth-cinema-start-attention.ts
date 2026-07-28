import {
  LeaveStatus,
  StaffingRequestStatus,
  ShiftTradeStatus,
  ShiftTradeType,
  TimeEntryStatus,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';

export const CINEMA_START_ATTENTION_MODULE_KEYS = [
  'SCHEDULE',
  'MESSAGES',
  'TIME_TRACKING',
  'LEAVE',
  'SHIFT_TRADES',
  'STAFFING_REQUESTS',
] as const;

type CinemaStartAttentionModuleKey =
  (typeof CINEMA_START_ATTENTION_MODULE_KEYS)[number];

type CinemaStartAttentionMembership = {
  cinemaId: number;
  role: 'ADMIN' | 'EMPLOYEE';
  canManageSchedule: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  cinema: {
    moduleSettings: Array<{
      moduleKey: string;
      enabled: boolean;
    }>;
  };
};

type CinemaCountGroup = {
  cinemaId: number;
  _count: {
    _all: number;
  };
};

export type CinemaStartAttentionItem = {
  type:
    | 'UNSTAFFED_UPCOMING_SHIFTS'
    | 'OWN_TIME_ENTRY_CHANGES'
    | 'DIRECT_SHIFT_TRADES'
    | 'TARGETED_STAFFING_REQUESTS'
    | 'TIME_APPROVAL'
    | 'LEAVE_APPROVAL'
    | 'UNREAD_MESSAGES';
  severity:
    | 'ACTION_REQUIRED'
    | 'INFORMATIONAL';
  count: number;
  label: string;
  linkUrl: string;
};

export type CinemaStartAttention = {
  severity:
    | 'ACTION_REQUIRED'
    | 'INFORMATIONAL'
    | 'NONE';
  actionRequiredCount: number;
  informationalCount: number;
  label: string;
  items: CinemaStartAttentionItem[];
};

function moduleIsEnabled(
  membership: CinemaStartAttentionMembership,
  moduleKey: CinemaStartAttentionModuleKey,
) {
  return (
    membership.cinema.moduleSettings.find(
      (setting) =>
        setting.moduleKey === moduleKey,
    )?.enabled !== false
  );
}

function countByCinema(
  groups: CinemaCountGroup[],
) {
  return new Map(
    groups.map((group) => [
      group.cinemaId,
      group._count._all,
    ]),
  );
}

function pluralLabel(
  count: number,
  singular: string,
  plural: string,
) {
  return count === 1
    ? `1 ${singular}`
    : `${count} ${plural}`;
}

function buildAttention(
  counts: {
    unstaffedUpcomingShifts: number;
    ownTimeEntryChanges: number;
    directShiftTrades: number;
    targetedStaffingRequests: number;
    timeApprovals: number;
    leaveApprovals: number;
    unreadMessages: number;
  },
): CinemaStartAttention {
  const items: CinemaStartAttentionItem[] = [];

  if (counts.unstaffedUpcomingShifts > 0) {
    items.push({
      type: 'UNSTAFFED_UPCOMING_SHIFTS',
      severity: 'ACTION_REQUIRED',
      count: counts.unstaffedUpcomingShifts,
      label: pluralLabel(
        counts.unstaffedUpcomingShifts,
        'ubemandet vagt starter inden for 24 timer',
        'ubemandede vagter starter inden for 24 timer',
      ),
      linkUrl: '/schedule',
    });
  }

  if (counts.ownTimeEntryChanges > 0) {
    items.push({
      type: 'OWN_TIME_ENTRY_CHANGES',
      severity: 'ACTION_REQUIRED',
      count: counts.ownTimeEntryChanges,
      label: pluralLabel(
        counts.ownTimeEntryChanges,
        'tidsregistrering skal rettes',
        'tidsregistreringer skal rettes',
      ),
      linkUrl: '/my-time',
    });
  }

  if (counts.directShiftTrades > 0) {
    items.push({
      type: 'DIRECT_SHIFT_TRADES',
      severity: 'ACTION_REQUIRED',
      count: counts.directShiftTrades,
      label: pluralLabel(
        counts.directShiftTrades,
        'direkte vagtbytte afventer dit svar',
        'direkte vagtbytter afventer dit svar',
      ),
      linkUrl: '/shift-trades',
    });
  }

  if (counts.targetedStaffingRequests > 0) {
    items.push({
      type: 'TARGETED_STAFFING_REQUESTS',
      severity: 'ACTION_REQUIRED',
      count: counts.targetedStaffingRequests,
      label: pluralLabel(
        counts.targetedStaffingRequests,
        'bemandingsforespørgsel afventer dit svar',
        'bemandingsforespørgsler afventer dit svar',
      ),
      linkUrl: '/staffing-requests',
    });
  }

  if (counts.timeApprovals > 0) {
    items.push({
      type: 'TIME_APPROVAL',
      severity: 'ACTION_REQUIRED',
      count: counts.timeApprovals,
      label: pluralLabel(
        counts.timeApprovals,
        'tidsregistrering afventer godkendelse',
        'tidsregistreringer afventer godkendelse',
      ),
      linkUrl: '/time-approval',
    });
  }

  if (counts.leaveApprovals > 0) {
    items.push({
      type: 'LEAVE_APPROVAL',
      severity: 'ACTION_REQUIRED',
      count: counts.leaveApprovals,
      label: pluralLabel(
        counts.leaveApprovals,
        'fraværsanmodning afventer behandling',
        'fraværsanmodninger afventer behandling',
      ),
      linkUrl: '/leave-approval',
    });
  }

  if (counts.unreadMessages > 0) {
    items.push({
      type: 'UNREAD_MESSAGES',
      severity: 'INFORMATIONAL',
      count: counts.unreadMessages,
      label: pluralLabel(
        counts.unreadMessages,
        'ulæst besked',
        'ulæste beskeder',
      ),
      linkUrl: '/messages',
    });
  }

  const actionRequiredCount = items
    .filter(
      (item) =>
        item.severity ===
        'ACTION_REQUIRED',
    )
    .reduce(
      (total, item) =>
        total + item.count,
      0,
    );

  const informationalCount = items
    .filter(
      (item) =>
        item.severity ===
        'INFORMATIONAL',
    )
    .reduce(
      (total, item) =>
        total + item.count,
      0,
    );

  if (actionRequiredCount > 0) {
    return {
      severity: 'ACTION_REQUIRED',
      actionRequiredCount,
      informationalCount,
      label: pluralLabel(
        actionRequiredCount,
        'forhold kræver din handling',
        'forhold kræver din handling',
      ),
      items,
    };
  }

  if (informationalCount > 0) {
    return {
      severity: 'INFORMATIONAL',
      actionRequiredCount,
      informationalCount,
      label: pluralLabel(
        informationalCount,
        'ny oplysning',
        'nye oplysninger',
      ),
      items,
    };
  }

  return {
    severity: 'NONE',
    actionRequiredCount: 0,
    informationalCount: 0,
    label: 'Ingen aktuelle opgaver',
    items,
  };
}

export async function findAuthCinemaStartAttention(
  prisma: PrismaService,
  userId: number,
  memberships: CinemaStartAttentionMembership[],
  now = new Date(),
) {
  const unstaffedShiftCinemaIds = memberships
    .filter(
      (membership) =>
        membership.role === 'ADMIN' &&
        membership.canManageSchedule &&
        moduleIsEnabled(
          membership,
          'SCHEDULE',
        ),
    )
    .map(
      (membership) =>
        membership.cinemaId,
    );

  const criticalWindowEnd = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  );

  const messageCinemaIds = memberships
    .filter((membership) =>
      moduleIsEnabled(
        membership,
        'MESSAGES',
      ),
    )
    .map(
      (membership) =>
        membership.cinemaId,
    );

  const shiftTradeCinemaIds = memberships
    .filter((membership) =>
      moduleIsEnabled(
        membership,
        'SHIFT_TRADES',
      ),
    )
    .map(
      (membership) =>
        membership.cinemaId,
    );

  const staffingRequestCinemaIds = memberships
    .filter((membership) =>
      moduleIsEnabled(
        membership,
        'STAFFING_REQUESTS',
      ),
    )
    .map(
      (membership) =>
        membership.cinemaId,
    );

  const timeTrackingMemberships = memberships.filter(
    (membership) =>
      moduleIsEnabled(
        membership,
        'TIME_TRACKING',
      ),
  );

  const timeTrackingCinemaIds =
    timeTrackingMemberships.map(
      (membership) =>
        membership.cinemaId,
    );

  const timeApprovalCinemaIds =
    timeTrackingMemberships
      .filter(
        (membership) =>
          membership.role === 'ADMIN' &&
          membership.canManagePayroll,
      )
      .map(
        (membership) =>
          membership.cinemaId,
      );

  const leaveApprovalCinemaIds = memberships
    .filter(
      (membership) =>
        moduleIsEnabled(
          membership,
          'LEAVE',
        ) &&
        membership.role === 'ADMIN' &&
        membership.canManageLeaveRequests,
    )
    .map(
      (membership) =>
        membership.cinemaId,
    );

  const [
    unstaffedShiftGroups,
    unreadMessageGroups,
    directShiftTradeGroups,
    targetedStaffingRequestGroups,
    ownTimeEntryChangeGroups,
    timeApprovalGroups,
    leaveApprovalGroups,
  ] = await Promise.all([
    unstaffedShiftCinemaIds.length > 0
      ? prisma.shift.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: unstaffedShiftCinemaIds,
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
        })
      : Promise.resolve([]),

    messageCinemaIds.length > 0
      ? prisma.message.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: messageCinemaIds,
            },
            isRead: false,
            archivedAt: null,
            recalledAt: null,
            OR: [
              {
                receiverId: userId,
              },
              {
                isBroadcast: true,
              },
            ],
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),

    shiftTradeCinemaIds.length > 0
      ? prisma.shiftTrade.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: shiftTradeCinemaIds,
            },
            status:
              ShiftTradeStatus.OPEN,
            type:
              ShiftTradeType.DIRECT,
            targetUserId: userId,
            offeredByUserId: {
              not: userId,
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
        })
      : Promise.resolve([]),

    staffingRequestCinemaIds.length > 0
      ? prisma.staffingRequest.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: staffingRequestCinemaIds,
            },
            status:
              StaffingRequestStatus.PENDING,
            targetUserId: userId,
            requestedByUserId: {
              not: userId,
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
        })
      : Promise.resolve([]),

    timeTrackingCinemaIds.length > 0
      ? prisma.timeEntry.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: timeTrackingCinemaIds,
            },
            userId,
            status:
              TimeEntryStatus.NEEDS_CHANGES,
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),

    timeApprovalCinemaIds.length > 0
      ? prisma.timeEntry.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: timeApprovalCinemaIds,
            },
            status:
              TimeEntryStatus.PENDING,
            clockOut: {
              not: null,
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),

    leaveApprovalCinemaIds.length > 0
      ? prisma.leaveRequest.groupBy({
          by: [
            'cinemaId',
          ],
          where: {
            cinemaId: {
              in: leaveApprovalCinemaIds,
            },
            status:
              LeaveStatus.PENDING,
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const unstaffedUpcomingShifts = countByCinema(
    unstaffedShiftGroups,
  );
  const unreadMessages = countByCinema(
    unreadMessageGroups,
  );
  const directShiftTrades = countByCinema(
    directShiftTradeGroups,
  );
  const targetedStaffingRequests = countByCinema(
    targetedStaffingRequestGroups,
  );
  const ownTimeEntryChanges = countByCinema(
    ownTimeEntryChangeGroups,
  );
  const timeApprovals = countByCinema(
    timeApprovalGroups,
  );
  const leaveApprovals = countByCinema(
    leaveApprovalGroups,
  );

  return new Map(
    memberships.map((membership) => [
      membership.cinemaId,
      buildAttention({
        unstaffedUpcomingShifts:
          unstaffedUpcomingShifts.get(
            membership.cinemaId,
          ) ?? 0,
        ownTimeEntryChanges:
          ownTimeEntryChanges.get(
            membership.cinemaId,
          ) ?? 0,
        directShiftTrades:
          directShiftTrades.get(
            membership.cinemaId,
          ) ?? 0,
        targetedStaffingRequests:
          targetedStaffingRequests.get(
            membership.cinemaId,
          ) ?? 0,
        timeApprovals:
          timeApprovals.get(
            membership.cinemaId,
          ) ?? 0,
        leaveApprovals:
          leaveApprovals.get(
            membership.cinemaId,
          ) ?? 0,
        unreadMessages:
          unreadMessages.get(
            membership.cinemaId,
          ) ?? 0,
      }),
    ]),
  );
}
