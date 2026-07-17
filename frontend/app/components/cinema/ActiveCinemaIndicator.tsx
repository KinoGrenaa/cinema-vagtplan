"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../../../../shared/types";
import { useAuth } from "../../providers/AuthProvider";
import {
  fetchActiveCinemaOptions,
  switchActiveCinema,
  type ActiveCinemaOption,
} from "./activeCinemaSession";

type MasterIndicatorState =
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

function readMasterIndicatorState(): MasterIndicatorState {
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

function IndicatorShell({
  logoUrl,
  label,
  description,
  warning = false,
  children,
}: {
  logoUrl?: string | null;
  label: string;
  description: string;
  warning?: boolean;
  children?: React.ReactNode;
}) {
  const logoSrc = getLogoSrc(logoUrl);

  return (
    <div
      className={`ml-20 mr-4 mt-2 rounded-2xl border px-4 py-3 shadow-sm lg:mx-auto lg:w-full lg:max-w-6xl ${
        warning
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
            <div className="truncate text-sm font-semibold">{label}</div>
            <div className="mt-1 text-xs opacity-80">{description}</div>
          </div>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </div>
  );
}

function MasterActiveCinemaIndicator() {
  const pathname = usePathname();
  const [state, setState] = useState<MasterIndicatorState>({ visible: false });

  useEffect(() => {
    setState(readMasterIndicatorState());

    function updateState() {
      setState(readMasterIndicatorState());
    }

    window.addEventListener("storage", updateState);
    window.addEventListener("masterSelectedCinemaChanged", updateState);
    return () => {
      window.removeEventListener("storage", updateState);
      window.removeEventListener("masterSelectedCinemaChanged", updateState);
    };
  }, [pathname]);

  if (!state.visible) return null;

  const isMissing = state.variant === "missing";
  const isSelected = state.variant === "selected";

  function handleClearSelectedCinema() {
    clearMasterSelectedCinema();
    setState(readMasterIndicatorState());
  }

  return (
    <IndicatorShell
      logoUrl={isSelected ? state.logoUrl : null}
      label={state.label}
      description={state.description}
      warning={isMissing}
    >
      <div className="flex flex-wrap gap-2">
        <Link
          href={state.href}
          className={`inline-flex w-fit rounded-xl px-3 py-2 text-sm font-semibold text-white transition ${
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
            className="inline-flex w-fit rounded-xl border border-blue-300 bg-white/80 px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-white dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-900/60"
          >
            Ryd valg
          </button>
        ) : null}
      </div>
    </IndicatorShell>
  );
}

function getCinemaOptionLabel(cinema: ActiveCinemaOption) {
  const markers: string[] = [];
  if (cinema.isHomeCinema) markers.push("Hjemmebiograf");
  if (cinema.isDefault) markers.push("Standardbiograf");
  return markers.length > 0
    ? `${cinema.name} · ${markers.join(" · ")}`
    : cinema.name;
}

function MemberActiveCinemaIndicator({ user }: { user: CurrentUser }) {
  const { login } = useAuth();
  const [cinemas, setCinemas] = useState<ActiveCinemaOption[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(
    user.cinemaId,
  );
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchActiveCinemaOptions()
      .then((data) => {
        if (cancelled) return;
        setCinemas(data.cinemas);
        setSelectedCinemaId(
          data.cinemas.some((cinema) => cinema.id === user.cinemaId)
            ? user.cinemaId
            : (data.cinemas[0]?.id ?? null),
        );
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Dine biograftilknytninger kunne ikke hentes.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, user.cinemaId, user.id]);

  const activeCinema = useMemo(
    () => cinemas.find((cinema) => cinema.id === user.cinemaId) ?? null,
    [cinemas, user.cinemaId],
  );

  async function handleSwitchCinema() {
    if (
      selectedCinemaId === null ||
      selectedCinemaId === user.cinemaId ||
      switching
    ) {
      return;
    }

    setSwitching(true);
    setError("");
    try {
      const session = await switchActiveCinema(selectedCinemaId);
      login(session.access_token, session.user);
      window.location.reload();
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Den aktive biograf kunne ikke skiftes.",
      );
      setSwitching(false);
    }
  }

  if (loading) return null;

  if (error && cinemas.length === 0) {
    return (
      <IndicatorShell
        label="Biograftilknytninger kunne ikke hentes"
        description={error}
        warning
      >
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="inline-flex w-fit rounded-xl bg-yellow-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-yellow-800"
        >
          Prøv igen
        </button>
      </IndicatorShell>
    );
  }

  if (!activeCinema) {
    return (
      <IndicatorShell
        label="Ingen aktiv biograf"
        description="Din session har ikke længere adgang til den valgte biograf. Log ind igen, hvis problemet fortsætter."
        warning
      />
    );
  }

  const canSwitch = cinemas.length > 1;

  return (
    <IndicatorShell
      logoUrl={activeCinema.logoUrl}
      label={`Aktiv biograf: ${activeCinema.name}`}
      description={
        canSwitch
          ? "Vælg hvilken biograf du arbejder i lige nu. Din standardbiograf ændres ikke."
          : "Dine vagter og øvrige data vises for denne biograf."
      }
    >
      {canSwitch ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="active-cinema-select" className="sr-only">
            Vælg aktiv biograf
          </label>
          <select
            id="active-cinema-select"
            value={selectedCinemaId ?? ""}
            onChange={(event) => setSelectedCinemaId(Number(event.target.value))}
            disabled={switching}
            className="min-w-56 rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900"
          >
            {cinemas.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>
                {getCinemaOptionLabel(cinema)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSwitchCinema}
            disabled={
              switching ||
              selectedCinemaId === null ||
              selectedCinemaId === user.cinemaId
            }
            className="inline-flex justify-center rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {switching ? "Skifter…" : "Skift biograf"}
          </button>
          {error ? (
            <div className="max-w-sm text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </IndicatorShell>
  );
}

export default function ActiveCinemaIndicator() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (user.role === "MASTER") return <MasterActiveCinemaIndicator />;
  return <MemberActiveCinemaIndicator user={user} />;
}
