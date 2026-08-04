import type {
  GroupedStaffingRequests,
  StaffingRequest,
  StaffingRequestStatus,
  StaffingRequestType,
  StaffingRequestUser,
} from "./staffingRequestTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {}
  return fallback;
}

export function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

export function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;
  const cinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }
  return cinemaId;
}

export function getCurrentUserId(user: unknown) {
  const currentUser = user as { id?: number; sub?: number } | null;
  if (!currentUser) return null;
  if (typeof currentUser.id === "number") return currentUser.id;
  if (typeof currentUser.sub === "number") return currentUser.sub;
  return null;
}

export function getFullName(
  user?: StaffingRequestUser | null,
  fallback = "Ukendt",
) {
  if (!user) return fallback;
  return `${user.firstName} ${user.lastName}`.trim() || fallback;
}

export function getStatusLabel(status: StaffingRequestStatus) {
  switch (status) {
    case "ACCEPTED":
      return "Accepteret";
    case "REJECTED":
      return "Afvist";
    case "EXPIRED":
      return "Udløbet";
    case "CANCELLED":
      return "Annulleret";
    default:
      return "Afventer";
  }
}

export function getTypeLabel(type: StaffingRequestType) {
  switch (type) {
    case "EMERGENCY":
      return "Akut";
    case "REPLACEMENT":
      return "Erstatning";
    case "OVERTIME":
      return "Overarbejde";
    default:
      return "Ekstra vagt";
  }
}

export function getDefaultMessage(type: StaffingRequestType) {
  if (type === "EMERGENCY") {
    return "Der er akut behov for ekstra bemanding.";
  }
  if (type === "REPLACEMENT") {
    return "Der er behov for en erstatning til en vagt.";
  }
  if (type === "OVERTIME") {
    return "Der er behov for ekstra bemanding eller overarbejde.";
  }
  return "Der er behov for ekstra bemanding.";
}

export function getStatusStyle(status: StaffingRequestStatus) {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
    case "EXPIRED":
    case "CANCELLED":
      return "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
  }
}

export function getPriorityStyle(priority: number) {
  if (priority >= 8) {
    return "bg-red-600 text-white";
  }
  if (priority >= 5) {
    return "bg-orange-500 text-white";
  }
  return "bg-blue-600 text-white";
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }
  const datePart = date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} kl. ${timePart}`;
}

export function getRequestJobFunctionName(request: StaffingRequest) {
  return (
    request.shift?.jobFunction?.name ||
    request.jobFunction?.name ||
    getTypeLabel(request.type)
  );
}

export function getRequestTitle(request: StaffingRequest) {
  const typeLabel = getTypeLabel(request.type);
  const jobFunctionName = getRequestJobFunctionName(request);
  if (jobFunctionName === typeLabel) {
    return typeLabel;
  }
  return `${typeLabel} · ${jobFunctionName}`;
}

export function getRequestTimeRange(request: StaffingRequest) {
  const startTime = request.shift?.startTime || request.requestStartTime;
  const endTime = request.shift?.endTime || request.requestEndTime;
  if (!startTime || !endTime) {
    return null;
  }
  return `${formatDateTime(startTime)} → ${formatDateTime(endTime)}`;
}

export function groupStaffingRequests(
  requests: StaffingRequest[],
): GroupedStaffingRequests {
  return {
    emergency: requests.filter((request) => request.type === "EMERGENCY"),
    pending: requests.filter((request) => request.status === "PENDING"),
    completed: requests.filter((request) => request.status !== "PENDING"),
  };
}
