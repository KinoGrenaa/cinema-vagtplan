import {
  getFullName,
  getRequestDialogTimeRange,
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
    | "REJECTED"
    | "CANCELLED";
  user:
    StaffingRequestUser | null;
  occurredAt: string;
  detail?:
    string | null;
};

export type StaffingRequestCompletedDateGroup = {
  dateKey: string;
  label: string;
  requests:
    StaffingRequest[];
};

const STAFFING_REQUEST_TIME_ZONE =
  "Europe/Copenhagen";

function getStaffingRequestDateKey(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "unknown";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          STAFFING_REQUEST_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);
  const getPart = (
    type: string,
  ) =>
    parts.find(
      (part) =>
        part.type === type,
    )?.value ?? "";

  return (
    getPart("year") +
    "-" +
    getPart("month") +
    "-" +
    getPart("day")
  );
}

function formatStaffingRequestDateLabel(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Ukendt dato";
  }

  const weekday =
    new Intl.DateTimeFormat(
      "da-DK",
      {
        timeZone:
          STAFFING_REQUEST_TIME_ZONE,
        weekday: "long",
      },
    ).format(date);
  const calendarDate =
    new Intl.DateTimeFormat(
      "da-DK",
      {
        timeZone:
          STAFFING_REQUEST_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    ).format(date);

  return (
    weekday.charAt(0).toUpperCase() +
    weekday.slice(1) +
    " " +
    calendarDate
  );
}

export function getStaffingRequestViewerStatus(
  request:
    StaffingRequest,
  currentUserId:
    number | null,
  isManager:
    boolean,
): StaffingRequest["status"] {
  const hasPersonallyDeclinedBroadcast =
    !isManager &&
    currentUserId !== null &&
    !request.targetUser &&
    request.declines?.some(
      (decline) =>
        decline.userId ===
        currentUserId,
    );

  return hasPersonallyDeclinedBroadcast
    ? "REJECTED"
    : request.status;
}

export function groupCompletedStaffingRequestsByShiftDate(
  requests:
    StaffingRequest[],
  currentUserId:
    number | null = null,
  isManager = false,
): StaffingRequestCompletedDateGroup[] {
  const groups =
    new Map<
      string,
      StaffingRequestCompletedDateGroup
    >();

  for (
    const request of
    requests
  ) {
    if (
      getStaffingRequestViewerStatus(
        request,
        currentUserId,
        isManager,
      ) === "PENDING"
    ) {
      continue;
    }

    const dateValue =
      request.requestStartTime ||
      request.createdAt;
    const dateKey =
      getStaffingRequestDateKey(
        dateValue,
      );
    const existing =
      groups.get(
        dateKey,
      );

    if (existing) {
      existing.requests.push(
        request,
      );
      continue;
    }

    groups.set(
      dateKey,
      {
        dateKey,
        label:
          formatStaffingRequestDateLabel(
            dateValue,
          ),
        requests: [
          request,
        ],
      },
    );
  }

  return [
    ...groups.values(),
  ].sort(
    (left, right) => {
      if (
        left.dateKey ===
        "unknown"
      ) {
        return 1;
      }

      if (
        right.dateKey ===
        "unknown"
      ) {
        return -1;
      }

      return right.dateKey.localeCompare(
        left.dateKey,
      );
    },
  );
}

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
    getStaffingRequestViewerStatus(
      request,
      currentUserId,
      isManager,
    ) === "PENDING";
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
    getRequestDialogTimeRange(
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

function getStaffingRequestCancellationDetail(
  request:
    StaffingRequest,
) {
  switch (
    request.cancellationReason
  ) {
    case "MANUAL_CANCELLED":
      return "Forespørgslen blev annulleret manuelt.";
    case "SHIFT_REASSIGNED":
      return "Vagten blev tildelt en anden medarbejder.";
    case "SHIFT_UNASSIGNED":
      return "Vagtens tildeling blev ændret.";
    case "SHIFT_DELETED":
      return "Vagten blev slettet.";
    case "SHIFT_MOVED":
      return "Vagten blev flyttet til en anden dato.";
    case "OTHER_REQUEST_ACCEPTED":
      return "En anden bemandingsforespørgsel på vagten blev accepteret.";
    default:
      return null;
  }
}

export function getStaffingRequestHistoryEvents(
  request:
    StaffingRequest,
  isManager:
    boolean,
  currentUserId:
    number | null = null,
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
    !request.targetUser &&
    request.declines
  ) {
    for (
      const decline of
        request.declines
    ) {
      if (
        !isManager &&
        decline.userId !==
          currentUserId
      ) {
        continue;
      }

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
  if (
    request.status ===
      "CANCELLED" &&
    request.cancelledAt
  ) {
    events.push({
      key:
        `cancelled-${request.id}`,
      action:
        "CANCELLED",
      user:
        request.cancelledByUser ??
        null,
      occurredAt:
        request.cancelledAt,
      detail:
        getStaffingRequestCancellationDetail(
          request,
        ),
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
