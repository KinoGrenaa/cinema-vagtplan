import {
  getFullName,
  getRequestTimeRange,
  getRequestTitle,
} from "./staffingRequestHelpers";
import type {
  StaffingRequest,
  StaffingRequestUser,
} from "./staffingRequestTypes";

export type StaffingRequestActionState = {
  isPending: boolean;
  canActAsRecipient: boolean;
  canShowAccept: boolean;
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
};

export type StaffingRequestRejectDialogCopy = {
  title: string;
  description: string;
  confirmText: string;
};

export type StaffingRequestHistoryEvent = {
  key: string;
  action:
    | "ACCEPTED"
    | "REJECTED";
  user:
    StaffingRequestUser | null;
  occurredAt: string;
};

export function getFirstCompletedStaffingRequestIndex(
  visibleRequests:
    StaffingRequest[],
  showCompletedRequests:
    boolean,
) {
  if (!showCompletedRequests) {
    return -1;
  }

  return visibleRequests.findIndex(
    (request) =>
      request.status !==
      "PENDING",
  );
}

export function getStaffingRequestActionState(
  request:
    StaffingRequest,
  userRole:
    string | undefined,
  currentUserId:
    number | null,
  isManager:
    boolean,
): StaffingRequestActionState {
  const targetUserId =
    request.targetUser
      ?.id ?? null;
  const isPending =
    request.status ===
    "PENDING";
  const canActAsRecipient =
    (userRole ===
      "EMPLOYEE" ||
      userRole ===
        "ADMIN") &&
    currentUserId !==
      null &&
    (!targetUserId ||
      targetUserId ===
        currentUserId);
  const canShowAccept =
    isPending &&
    canActAsRecipient;
  const canAccept =
    canShowAccept &&
    !request.acceptanceConflictShift;
  const canReject =
    isPending &&
    (userRole ===
      "EMPLOYEE" ||
      userRole ===
        "ADMIN") &&
    currentUserId !==
      null &&
    (targetUserId ===
      currentUserId ||
      (!targetUserId &&
        userRole ===
          "EMPLOYEE"));
  const canCancel =
    isPending &&
    isManager;

  return {
    isPending,
    canActAsRecipient,
    canShowAccept,
    canAccept,
    canReject,
    canCancel,
  };
}

export function getStaffingRequestRejectActionLabel(
  userRole:
    string | undefined,
) {
  return userRole ===
    "EMPLOYEE"
    ? "Tak nej"
    : "Afvis";
}

export function getStaffingRequestRejectDialogCopy(
  userRole:
    string | undefined,
  request:
    StaffingRequest,
): StaffingRequestRejectDialogCopy {
  const isEmployee =
    userRole ===
    "EMPLOYEE";
  const timeRange =
    getRequestTimeRange(
      request,
    );
  const requestedBy =
    getFullName(
      request.requestedByUser,
      "System",
    );

  return {
    title:
      isEmployee
        ? "Tak nej til vagten?"
        : "Afvis bemandingsforespørgsel",
    description:
      `${getRequestTitle(request)}${
        timeRange
          ? `\n${timeRange}`
          : ""
      }\nSendt af ${requestedBy}\n\n${
        isEmployee
          ? "Vil du takke nej til denne vagt?"
          : "Vil du afvise denne bemandingsforespørgsel?"
      }`,
    confirmText:
      getStaffingRequestRejectActionLabel(
        userRole,
      ),
  };
}

export function getStaffingRequestHistoryEvents(
  request:
    StaffingRequest,
  isManager:
    boolean,
): StaffingRequestHistoryEvent[] {
  const events:
    StaffingRequestHistoryEvent[] =
      [];

  if (
    request.status ===
      "REJECTED" &&
    request.rejectedAt &&
    request.targetUser
  ) {
    events.push({
      key:
        `direct-rejected-${request.id}`,
      action:
        "REJECTED",
      user:
        request.targetUser,
      occurredAt:
        request.rejectedAt,
    });
  }

  if (
    isManager &&
    !request.targetUser &&
    request.declines
  ) {
    for (
      const decline of
        request.declines
    ) {
      events.push({
        key:
          `broadcast-rejected-${request.id}-${decline.userId}`,
        action:
          "REJECTED",
        user:
          decline.user,
        occurredAt:
          decline.declinedAt,
      });
    }
  }

  if (
    request.status ===
      "ACCEPTED" &&
    request.acceptedAt
  ) {
    events.push({
      key:
        `accepted-${request.id}`,
      action:
        "ACCEPTED",
      user:
        request.acceptedByUser ??
        null,
      occurredAt:
        request.acceptedAt,
    });
  }

  return events.sort(
    (left, right) =>
      new Date(
        left.occurredAt,
      ).getTime() -
      new Date(
        right.occurredAt,
      ).getTime(),
  );
}
