"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCinemaLogoSrc,
  getRoleLabel,
  type CinemaStartCinema,
  type CinemaStartOverview,
  fetchCinemaStartOverview,
} from "../components/cinema/cinemaStartOverview";
import { switchActiveCinema } from "../components/cinema/activeCinemaSession";
import { useAuth } from "../providers/AuthProvider";

const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function severityWeight(cinema: CinemaStartCinema) {
  switch (cinema.attention?.severity) {
    case "ACTION_REQUIRED":
      return 3;
    case "INFORMATIONAL":
      return 2;
    default:
      return 1;
  }
}

function sortCinemas(cinemas: CinemaStartCinema[]) {
  return [...cinemas].sort((left, right) => {
    const severityDifference =
      severityWeight(right) - severityWeight(left);
    if (severityDifference !== 0) return severityDifference;

    const leftShift = left.nextShift
      ? new Date(left.nextShift.startTime).getTime()
      : Number.POSITIVE_INFINITY;
    const rightShift = right.nextShift
      ? new Date(right.nextShift.startTime).getTime()
      : Number.POSITIVE_INFINITY;
    if (leftShift !== rightShift) return leftShift - rightShift;
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "da");
  });
}

export default function SelectCinemaPage() {
  const { loading: authLoading, login, logout, token, user } = useAuth();
  const [overview, setOverview] =
    useState<CinemaStartOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingCinemaId, setSwitchingCinemaId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!token || !user) {
      window.location.href = "/";
      return;
    }
    if (user.role === "MASTER") {
      window.location.href = "/dashboard";
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    fetchCinemaStartOverview()
      .then(async (data) => {
        if (cancelled) return;
        if (data.mode === "MASTER") {
          window.location.href = "/dashboard";
          return;
        }
        if (data.mode === "SINGLE_CINEMA") {
          const cinema = data.cinemas[0];
          if (cinema && user.cinemaId !== cinema.cinemaId) {
            const session = await switchActiveCinema(cinema.cinemaId);
            if (cancelled) return;
            login(session.access_token, session.user);
          }
          window.location.href = "/home";
          return;
        }
        setOverview(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Dine biografer kunne ikke hentes.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, login, reloadKey, token, user]);

  const cinemas = useMemo(
    () => sortCinemas(overview?.cinemas ?? []),
    [overview],
  );

  async function handleSelectCinema(cinema: CinemaStartCinema) {
    if (!user || switchingCinemaId !== null) return;
    setSwitchingCinemaId(cinema.cinemaId);
    setError("");
    try {
      if (user.cinemaId !== cinema.cinemaId) {
        const session = await switchActiveCinema(cinema.cinemaId);
        login(session.access_token, session.user);
      }
      window.location.href = "/home";
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Biografen kunne ikke vælges.",
      );
      setSwitchingCinemaId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-5xl py-20 text-center">
          Henter dine biografer...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Cinema Vagtplan
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
              Vælg biograf
            </h1>
            <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">
              Se næste vagt og de vigtigste oplysninger for hver biograf.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Log ud
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            <div className="font-semibold">Oversigten kunne ikke indlæses</div>
            <div className="mt-1 text-sm">{error}</div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Prøv igen
            </button>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {cinemas.map((cinema) => {
            const logoSrc = getCinemaLogoSrc(cinema.logoUrl);
            const attention = cinema.attention;
            const actionRequired =
              attention?.severity === "ACTION_REQUIRED";
            return (
              <section
                key={cinema.cinemaId}
                className={`rounded-3xl border bg-white p-6 shadow-sm dark:bg-gray-900 ${
                  actionRequired
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  {logoSrc ? (
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-700">
                      <img
                        src={logoSrc}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                        {cinema.name}
                      </h2>
                      {cinema.isDefault ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                          Standardbiograf
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {getRoleLabel(cinema.role)}
                    </p>
                  </div>
                </div>

                <div className={`mt-5 rounded-2xl p-4 ${
                  actionRequired
                    ? "bg-amber-50 dark:bg-amber-950/30"
                    : "bg-gray-50 dark:bg-gray-950/60"
                }`}>
                  <div className="font-semibold">
                    {attention?.label ?? "Ingen aktuelle opgaver"}
                  </div>
                  {attention?.items?.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {attention.items.slice(0, 3).map((item) => (
                        <li key={item.type} className="flex gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Der er ikke noget, du skal tage stilling til lige nu.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Næste vagt
                  </div>
                  {cinema.nextShift ? (
                    <div className="mt-2">
                      <div className="font-semibold text-gray-950 dark:text-white">
                        {dateFormatter.format(
                          new Date(cinema.nextShift.startTime),
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {cinema.nextShift.workType.name}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Du har ingen kommende vagter i denne biograf.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSelectCinema(cinema)}
                  disabled={switchingCinemaId !== null}
                  className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {switchingCinemaId === cinema.cinemaId
                    ? "Åbner..."
                    : `Fortsæt til ${cinema.name}`}
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
