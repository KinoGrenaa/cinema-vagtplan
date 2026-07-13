import type { Cinema, CurrentUser } from "./cinemaSettingsTypes";
import {
  MASTER_SELECTED_CINEMA_ID_KEY,
  MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
  MASTER_SELECTED_CINEMA_NAME_KEY,
} from "./cinemaSettingsTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function notifyMasterSelectedCinemaChanged() {
  window.dispatchEvent(new Event("masterSelectedCinemaChanged"));
}

export function getLogoSrc(logoUrl?: string | null) {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }
  if (logoUrl.startsWith("/")) {
    return `${API_URL}${logoUrl}`;
  }
  return `${API_URL}/${logoUrl}`;
}

export function syncMasterSelectedCinemaStorage(cinema: Cinema) {
  const savedUser = localStorage.getItem("user");
  if (!savedUser) {
    return;
  }

  try {
    const user = JSON.parse(savedUser) as CurrentUser;
    const selectedCinemaId = Number(
      localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
    );

    if (
      user.role !== "MASTER" ||
      !Number.isInteger(selectedCinemaId) ||
      selectedCinemaId !== cinema.id
    ) {
      return;
    }

    localStorage.setItem(MASTER_SELECTED_CINEMA_NAME_KEY, cinema.name);
    if (cinema.logoUrl) {
      localStorage.setItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY, cinema.logoUrl);
    } else {
      localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
    }
    notifyMasterSelectedCinemaChanged();
  } catch {}
}
