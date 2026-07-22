import type {
  AbsenceCalendarStatusFilter,
  AbsenceCalendarSummary,
  LeaveRequest,
  LeaveRequestStatus,
} from "./absenceCalendarTypes";

const copenhagenDateFormatter =
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

function datePartsToKey(
  value: string | Date,
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);
  const parts =
    copenhagenDateFormatter.formatToParts(
      date,
    );
  const year = parts.find(
    (part) => part.type === "year",
  )?.value;
  const month = parts.find(
    (part) => part.type === "month",
  )?.value;
  const day = parts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function getTodayDateKey() {
  return (
    datePartsToKey(new Date()) ?? ""
  );
}

export function requestIsOnDate(
  request: LeaveRequest,
  date: string,
) {
  const startDate = datePartsToKey(
    request.startDate,
  );
  const endDate = datePartsToKey(
    request.endDate,
  );

  if (!startDate || !endDate) {
    return false;
  }

  return (
    date >= startDate &&
    date <= endDate
  );
}

export function getStatusLabel(
  status: LeaveRequestStatus,
) {
  switch (status) {
    case "APPROVED":
      return "Godkendt";
    case "PENDING":
      return "Afventer";
    case "REJECTED":
      return "Afvist";
    case "CANCELLED":
      return "Annulleret";
  }
}

export function getStatusStyle(
  status: LeaveRequestStatus,
) {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/45 dark:text-green-100";
  }

  if (status === "REJECTED") {
    return "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/45 dark:text-red-100";
  }

  if (status === "CANCELLED") {
    return "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }

  return "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-100";
}

export function getUserName(
  request: LeaveRequest,
) {
  return `${request.user.firstName} ${request.user.lastName}`.trim();
}

export function formatMonthLabel(
  selectedMonth: string,
) {
  const date = new Date(
    `${selectedMonth}-01T12:00:00`,
  );
  const label = date.toLocaleDateString(
    "da-DK",
    {
      month: "long",
      year: "numeric",
    },
  );

  return `${label.charAt(0).toUpperCase()}${label.slice(
    1,
  )}`;
}

export function formatCalendarDate(
  date: string,
) {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortCalendarDate(
  date: string,
) {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
  });
}

export function formatRequestRange(
  request: LeaveRequest,
) {
  const startDate = datePartsToKey(
    request.startDate,
  );
  const endDate = datePartsToKey(
    request.endDate,
  );

  if (!startDate || !endDate) {
    return "Ugyldig periode";
  }

  const startLabel = new Date(
    `${startDate}T12:00:00`,
  ).toLocaleDateString("da-DK");
  const endLabel = new Date(
    `${endDate}T12:00:00`,
  ).toLocaleDateString("da-DK");

  return startDate === endDate
    ? startLabel
    : `${startLabel} – ${endLabel}`;
}

function getMonthDateKeys(
  selectedMonth: string,
) {
  const [year, month] =
    selectedMonth.split("-").map(Number);
  const lastDay = new Date(
    year,
    month,
    0,
  ).getDate();

  return Array.from(
    { length: lastDay },
    (_, index) =>
      `${selectedMonth}-${String(
        index + 1,
      ).padStart(2, "0")}`,
  );
}

function isActiveCalendarRequest(
  request: LeaveRequest,
) {
  return (
    request.status === "PENDING" ||
    request.status === "APPROVED"
  );
}

export function filterAbsenceRequests(
  requests: LeaveRequest[],
  searchQuery: string,
  statusFilter: AbsenceCalendarStatusFilter,
) {
  const normalizedQuery =
    searchQuery.trim().toLocaleLowerCase(
      "da-DK",
    );

  return requests.filter((request) => {
    if (!isActiveCalendarRequest(request)) {
      return false;
    }

    if (
      statusFilter !== "ALL" &&
      request.status !== statusFilter
    ) {
      return false;
    }

    if (
      normalizedQuery &&
      !getUserName(request)
        .toLocaleLowerCase("da-DK")
        .includes(normalizedQuery)
    ) {
      return false;
    }

    return true;
  });
}

export function getAbsenceCalendarSummary(
  requests: LeaveRequest[],
  selectedMonth: string,
): AbsenceCalendarSummary {
  const monthDates =
    getMonthDateKeys(selectedMonth);
  const activeMonthRequests =
    requests.filter(
      (request) =>
        isActiveCalendarRequest(
          request,
        ) &&
        monthDates.some((date) =>
          requestIsOnDate(
            request,
            date,
          ),
        ),
    );
  const employeeIds = new Set(
    activeMonthRequests.map(
      (request) => request.user.id,
    ),
  );
  const employeeDays = new Set<string>();

  for (const request of activeMonthRequests) {
    for (const date of monthDates) {
      if (
        requestIsOnDate(
          request,
          date,
        )
      ) {
        employeeDays.add(
          `${request.user.id}:${date}`,
        );
      }
    }
  }

  return {
    approvedRequests:
      activeMonthRequests.filter(
        (request) =>
          request.status === "APPROVED",
      ).length,
    pendingRequests:
      activeMonthRequests.filter(
        (request) =>
          request.status === "PENDING",
      ).length,
    employeeCount: employeeIds.size,
    absenceDays: employeeDays.size,
  };
}

export function sortRequestsForCalendar(
  requests: LeaveRequest[],
) {
  return [...requests].sort(
    (first, second) => {
      if (
        first.status !== second.status
      ) {
        return first.status ===
          "PENDING"
          ? -1
          : 1;
      }

      return getUserName(
        first,
      ).localeCompare(
        getUserName(second),
        "da",
      );
    },
  );
}
