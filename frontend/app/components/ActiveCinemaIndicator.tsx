"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type StoredUser = {
  id?: number;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId?: number | null;
};

type IndicatorState =
  | {
      visible: true;
      variant: "selected";
      label: string;
      description: string;
      href: string;
      linkText: string;
      logoUrl: string | null;
    }
  | {
      visible: true;
      variant: "missing";
      label: string;
      description: string;
      href: string;
      linkText: string;
    }
  | {
      visible: false;
    };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";
const MASTER_SELECTED_CINEMA_LOGO_URL_KEY = "masterSelectedCinemaLogoUrl";

function notifyMasterSelectedCinemaChanged() {
  window.dispatchEvent(new Event("masterSelectedCinemaChanged"));
}

function clearMasterSelectedCinema() {
  localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
  localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
  localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
  notifyMasterSelectedCinemaChanged();
}

function getLogoSrc(logoUrl?: string | null) {
  if (!logoUrl) return null;

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  if (logoUrl.startsWith("/")) {
    return `${API_URL}${logoUrl}`;
  }

  return `${API_URL}/${logoUrl}`;
}

function readIndicatorState(): IndicatorState {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return { visible: false };
  }

  let user: StoredUser;

  try {
    user = JSON.parse(savedUser);
  } catch {
    return { visible: false };
  }

  if (user.role !== "MASTER") {
    return { visible: false };
  }

  const selectedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );
  const selectedCinemaName =
    localStorage.getItem(MASTER_SELECTED_CINEMA_NAME_KEY) || "";
  const selectedCinemaLogoUrl =
    localStorage.getItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY) || "";

  if (!Number.isInteger(selectedCinemaId) || selectedCinemaId <= 0) {
    return {
      visible: true,
      variant: "missing",
      label: "Ingen aktiv biograf valgt",
      description:
        "Vælg en biograf i MASTER-panelet, før du administrerer biografindstillinger eller brugere.",
      href: "/master",
      linkText: "Vælg biograf",
    };
  }

  return {
    visible: true,
    variant: "selected",
    label: `Aktiv biograf: ${selectedCinemaName || `Biograf #${selectedCinemaId}`}`,
    description: "Du administrerer denne biograf som MASTER.",
    href: "/master",
    linkText: "Skift biograf",
    logoUrl: selectedCinemaLogoUrl || null,
  };
}

export default function ActiveCinemaIndicator() {
  const pathname = usePathname();
  const [state, setState] = useState<IndicatorState>({ visible: false });

  useEffect(() => {
    setState(readIndicatorState());

    function updateState() {
      setState(readIndicatorState());
    }

    window.addEventListener("storage", updateState);
    window.addEventListener("masterSelectedCinemaChanged", updateState);

    return () => {
      window.removeEventListener("storage", updateState);
      window.removeEventListener("masterSelectedCinemaChanged", updateState);
    };
  }, [pathname]);

  if (!state.visible) {
    return null;
  }

  const isMissing = state.variant === "missing";
  const isSelected = state.variant === "selected";
  const logoSrc = isSelected ? getLogoSrc(state.logoUrl) : null;

  function handleClearSelectedCinema() {
    clearMasterSelectedCinema();
    setState(readIndicatorState());
  }

  return (
    <div
      className={`ml-20 mr-4 mt-2 rounded-2xl border px-4 py-3 shadow-sm lg:mx-auto lg:w-full lg:max-w-6xl ${
        isMissing
          ? "border-yellow-300 bg-yellow-50 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100"
          : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {logoSrc ? (
            <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm dark:border-blue-800 dark:bg-white">
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-contain p-2"
              />
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{state.label}</div>
            <div className="mt-1 text-xs opacity-80">{state.description}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={state.href}
            className={`inline-flex w-fit shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white transition ${
              isMissing
                ? "bg-yellow-700 hover:bg-yellow-800"
                : "bg-blue-700 hover:bg-blue-800"
            }`}
          >
            {state.linkText}
          </Link>

          {isSelected ? (
            <button
              type="button"
              onClick={handleClearSelectedCinema}
              className="inline-flex w-fit shrink-0 rounded-xl border border-blue-300 bg-white/80 px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-white dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-900/60"
            >
              Ryd valg
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
