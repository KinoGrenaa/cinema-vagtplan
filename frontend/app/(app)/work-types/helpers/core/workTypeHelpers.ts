import type { CurrentUser } from "./workTypeTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  const selectedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isFinite(selectedCinemaId) || selectedCinemaId <= 0) {
    return null;
  }

  return selectedCinemaId;
}

export function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cinemaId=${cinemaId}`;
}

export async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (Array.isArray(data?.message)) {
    return data.message.join("\n");
  }

  return fallback;
}
