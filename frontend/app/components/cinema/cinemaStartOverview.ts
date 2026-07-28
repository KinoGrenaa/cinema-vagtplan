import { apiFetch } from "../../lib/api";

export type CinemaStartRole = "ADMIN" | "EMPLOYEE";

export type CinemaStartShift = {
  id: number;
  startTime: string;
  endTime: string;
  workType: {
    id: number;
    name: string;
    color: string;
  };
};

export type CinemaStartAttentionItem = {
  type:
    | "OWN_TIME_ENTRY_CHANGES"
    | "DIRECT_SHIFT_TRADES"
    | "TARGETED_STAFFING_REQUESTS"
    | "TIME_APPROVAL"
    | "LEAVE_APPROVAL"
    | "UNREAD_MESSAGES";
  severity: "ACTION_REQUIRED" | "INFORMATIONAL";
  count: number;
  label: string;
  linkUrl: string;
};

export type CinemaStartAttention = {
  severity: "ACTION_REQUIRED" | "INFORMATIONAL" | "NONE";
  actionRequiredCount: number;
  informationalCount: number;
  label: string;
  items: CinemaStartAttentionItem[];
};

export type CinemaStartCinema = {
  cinemaId: number;
  name: string;
  logoUrl: string | null;
  role: CinemaStartRole;
  isDefault: boolean;
  permissions: {
    canManageSchedule: boolean;
    canManageUsers: boolean;
    canManagePayroll: boolean;
    canManageLeaveRequests: boolean;
    canManageCinemaSettings: boolean;
    canSendBroadcastMessages: boolean;
  };
  attention: CinemaStartAttention | null;
  nextShift: CinemaStartShift | null;
  nextShifts: CinemaStartShift[];
};

export type CinemaStartOverview = {
  mode: "SINGLE_CINEMA" | "MULTI_CINEMA" | "MASTER";
  activeCinemaCount: number;
  defaultCinemaId: number | null;
  cinemas: CinemaStartCinema[];
};

async function readApiError(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (Array.isArray(data?.message) && data.message.length > 0) {
      return data.message.join("\n");
    }
  } catch {
    // Brug fallback, hvis serverens svar ikke er JSON.
  }
  return fallback;
}

export async function fetchCinemaStartOverview() {
  const response = await apiFetch(
    "/auth/cinema-start-overview",
  );
  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        "Din startoversigt kunne ikke hentes.",
      ),
    );
  }

  const overview = (await response.json()) as CinemaStartOverview;
  return {
    ...overview,
    cinemas: (overview.cinemas ?? []).map((cinema) => ({
      ...cinema,
      nextShifts:
        cinema.nextShifts ??
        (cinema.nextShift ? [cinema.nextShift] : []),
    })),
  };
}

export function getCinemaLogoSrc(logoUrl: string | null) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return logoUrl.startsWith("/")
    ? `${apiUrl}${logoUrl}`
    : `${apiUrl}/${logoUrl}`;
}

export function getRoleLabel(role: CinemaStartRole) {
  return role === "ADMIN" ? "Administrator" : "Medarbejder";
}

export function getAuthenticatedStartPath(
  overview: CinemaStartOverview,
) {
  if (overview.mode === "MASTER") return "/dashboard";
  return overview.mode === "MULTI_CINEMA"
    ? "/select-cinema"
    : "/home";
}
