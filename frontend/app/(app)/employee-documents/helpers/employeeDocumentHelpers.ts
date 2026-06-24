import type { CurrentUser } from "./employeeDocumentTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getCurrentUserFromStorage() {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem("user");

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser) as CurrentUser;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;

  const cinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));

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

export function getDocumentUrl(fileUrl: string) {
  const uploadsIndex = fileUrl.indexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return `${API_URL}${fileUrl.slice(uploadsIndex)}`;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return `${API_URL}${fileUrl}`;
  }

  return `${API_URL}/${fileUrl}`;
}
