import type { Cinema } from "./masterTypes";

export const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
export const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";
export const MASTER_SELECTED_CINEMA_LOGO_URL_KEY =
  "masterSelectedCinemaLogoUrl";

export function notifyMasterSelectedCinemaChanged() {
  window.dispatchEvent(new Event("masterSelectedCinemaChanged"));
}

export async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

export function formatDateDK(value?: string) {
  if (!value) return "Ukendt";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Ukendt";

  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function sortCinemas(cinemas: Cinema[]) {
  return [...cinemas].sort((a, b) => a.name.localeCompare(b.name, "da"));
}
