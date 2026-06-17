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

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";

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

  return (
    <div
      className={`ml-20 mr-4 mt-2 rounded-2xl border px-4 py-3 shadow-sm lg:mx-auto lg:w-full lg:max-w-6xl ${
        isMissing
          ? "border-yellow-300 bg-yellow-50 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100"
          : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{state.label}</div>
          <div className="mt-1 text-xs opacity-80">{state.description}</div>
        </div>

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
      </div>
    </div>
  );
}
