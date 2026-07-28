import {
  LeaveStatus,
  TimeEntryStatus,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';

export const CINEMA_START_ATTENTION_MODULE_KEYS = [
  'MESSAGES',
  'TIME_TRACKING',
  'LEAVE',
] as const;

type CinemaStartAttentionModuleKey =
  (typeof CINEMA_START_ATTENTION_MODULE_KEYS)[number];

type CinemaStartAttentionMembership = {
  cinemaId: number;
  role: 'ADMIN' | 'EMPLOYEE';
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
    | 'OWN_TIME_ENTRY_CHANGES'
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
    ownTimeEntryChanges: number;
    timeApprovals: number;
    leaveApprovals: number;
    unreadMessages: number;
  },
): CinemaStartAttention {
  const items: CinemaStartAttentionItem[] = [];

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
) {
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
    unreadMessageGroups,
    ownTimeEntryChangeGroups,
    timeApprovalGroups,
    leaveApprovalGroups,
  ] = await Promise.all([
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

  const unreadMessages = countByCinema(
    unreadMessageGroups,
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
        ownTimeEntryChanges:
          ownTimeEntryChanges.get(
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
