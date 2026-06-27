import type { CurrentUser, EmploymentType, User } from "./userTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";

export function getEmploymentTypeLabel(employmentType?: EmploymentType) {
  if (employmentType === "SALARIED") return "Fastlønnet";
  return "Timelønnet";
}

export function getRoleLabel(role: User["role"]) {
  if (role === "MASTER") return "Master";
  if (role === "ADMIN") return "Admin";
  return "Medarbejder";
}

function translateApiError(message: string) {
  if (
    message.includes("password must be longer than or equal to 6 characters") ||
    message.includes("password must be longer than or equal to 8 characters")
  ) {
    return "Adgangskode skal være mindst 8 tegn.";
  }

  if (message.includes("email must be an email")) {
    return "Indtast en gyldig emailadresse.";
  }

  if (message.includes("firstName")) return "Fornavn mangler.";
  if (message.includes("lastName")) return "Efternavn mangler.";
  if (message.includes("email")) return "Email mangler eller er ugyldig.";

  return message;
}

export async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.map(translateApiError).join("\n");
    }

    if (typeof data.message === "string") {
      return translateApiError(data.message);
    }

    return "Der opstod en ukendt fejl.";
  } catch {
    return "Der opstod en ukendt fejl.";
  }
}

export function getStoredCurrentUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as CurrentUser;
  } catch {
    return null;
  }
}

export function getStoredMasterCinemaId() {
  const savedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (Number.isInteger(savedCinemaId) && savedCinemaId > 0) {
    return savedCinemaId;
  }

  return null;
}

export function getStoredMasterCinemaName() {
  return localStorage.getItem(MASTER_SELECTED_CINEMA_NAME_KEY) || "";
}

export function getActiveCinemaId(
  user: CurrentUser | null,
  selectedMasterCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    return selectedMasterCinemaId;
  }

  return user.cinemaId;
}

export function buildUsersEndpoint(
  user: CurrentUser | null,
  selectedMasterCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    if (!selectedMasterCinemaId) {
      return null;
    }

    return `/users?cinemaId=${selectedMasterCinemaId}`;
  }

  return "/users";
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    employmentType: user.employmentType || "HOURLY",
    isActive: user.isActive !== false,
  };
}

export function normalizeUsers(data: unknown): User[] {
  return Array.isArray(data) ? data.map((user) => normalizeUser(user)) : [];
}

export function getEditableUser(user: User): User {
  return {
    ...user,
    employmentType: user.employmentType || "HOURLY",
    canManageSchedule: user.canManageSchedule || false,
    canManageUsers: user.canManageUsers || false,
    canManagePayroll: user.canManagePayroll || false,
    canManageLeaveRequests: user.canManageLeaveRequests || false,
    canManageCinemaSettings: user.canManageCinemaSettings || false,
    canSendBroadcastMessages: user.canSendBroadcastMessages || false,
  };
}
