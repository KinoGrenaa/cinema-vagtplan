import type { PermissionKey, StoredUser } from "./employeeTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export const permissionLabels: { key: PermissionKey; label: string }[] = [
  { key: "canManageSchedule", label: "Vagtplan" },
  { key: "canManageUsers", label: "Brugere" },
  { key: "canManagePayroll", label: "Payroll" },
  { key: "canManageLeaveRequests", label: "Fravær" },
  { key: "canManageCinemaSettings", label: "Biograf" },
  { key: "canSendBroadcastMessages", label: "Broadcast" },
];

export function getRoleLabel(role: string) {
  if (role === "MASTER") return "Master";
  if (role === "ADMIN") return "Administrator";

  return "Medarbejder";
}

export function getRoleBadge(role: string) {
  if (role === "MASTER") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200";
  }

  if (role === "ADMIN") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
  }

  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export function getStoredUser() {
  const savedUser = window.localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(savedUser) as StoredUser;

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  const cinemaId = Number(
    window.localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;

  const separator = endpoint.includes("?") ? "&" : "?";

  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

export async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }

    return data.message || fallback;
  } catch {
    return fallback;
  }
}
