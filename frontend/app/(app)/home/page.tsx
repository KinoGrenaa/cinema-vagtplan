"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  fetchCinemaStartOverview,
  getRoleLabel,
  type CinemaStartCinema,
  type CinemaStartOverview,
  type CinemaStartShift,
} from "../../components/cinema/cinemaStartOverview";
import { useAuth } from "../../providers/AuthProvider";

const dayFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  weekday: "short",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  hour: "2-digit",
  minute: "2-digit",
});

function ShiftRow({ shift }: { shift: CinemaStartShift }) {
  return (
    <Link
      href={`/my-shifts?shiftId=${shift.id}`}
      className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-950/60 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-gray-950 dark:text-white">
            {dayFormatter.format(new Date(shift.startTime))}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {shift.jobFunction.name}
          </div>
        </div>
        <div className="font-semibold text-gray-800 dark:text-gray-200">
          {timeFormatter.format(new Date(shift.startTime))}
          {"–"}
          {timeFormatter.format(new Date(shift.endTime))}
        </div>
      </div>
    </Link>
  );
}

export default function PersonalHomePage() {
  const { loading: authLoading, token, user } = useAuth();
  const [overview, setOverview] =
    useState<CinemaStartOverview | null>(null);
  const [loading, setLoading] = useState(true);
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
      .then((data) => {
        if (cancelled) return;
        if (data.mode === "MASTER") {
          window.location.href = "/dashboard";
          return;
        }
        const hasActiveCinema = data.cinemas.some(
          (cinema) => cinema.cinemaId === user.cinemaId,
        );
        if (!hasActiveCinema && data.mode === "MULTI_CINEMA") {
          window.location.href = "/select-cinema";
          return;
        }
        setOverview(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Din startside kunne ikke hentes.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, reloadKey, token, user]);

  const activeCinema = useMemo<CinemaStartCinema | null>(() => {
    if (!overview || !user) return null;
    return (
      overview.cinemas.find(
        (cinema) => cinema.cinemaId === user.cinemaId,
      ) ?? overview.cinemas[0] ?? null
    );
  }, [overview, user]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-6xl py-16 text-center">
          Henter din startside...
        </div>
      </main>
    );
  }

  if (error || !activeCinema) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <h1 className="text-xl font-bold">Startsiden kunne ikke indlæses</h1>
          <p className="mt-2 text-sm">{error || "Ingen aktiv biograf blev fundet."}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
          >
            Prøv igen
          </button>
        </div>
      </main>
    );
  }

  const attentionItems = activeCinema.attention?.items ?? [];
  const nextShifts = activeCinema.nextShifts.slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {activeCinema.name} · {getRoleLabel(activeCinema.role)}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
                Din startside
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Dine kommende vagter og de forhold, der kræver din opmærksomhed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {overview && overview.activeCinemaCount > 1 ? (
                <Link
                  href="/select-cinema"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  Gå til biografoversigt
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Åbn dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                  Dine næste 5 vagter
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Kun vagter i den aktive biograf vises her.
                </p>
              </div>
              <Link
                href="/my-shifts"
                className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
              >
                Se alle
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {nextShifts.length > 0 ? (
                nextShifts.map((shift) => (
                  <ShiftRow key={shift.id} shift={shift} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  Du har ingen planlagte vagter i denne biograf.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              Kræver din opmærksomhed
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Punkterne er tilpasset din rolle og denne biograf.
            </p>
            <div className="mt-5 space-y-3">
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <Link
                    key={item.type}
                    href={item.linkUrl}
                    className={`block rounded-2xl border p-4 transition ${
                      item.severity === "ACTION_REQUIRED"
                        ? "border-amber-200 bg-amber-50 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30"
                        : "border-blue-200 bg-blue-50 hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/30"
                    }`}
                  >
                    <div className="font-semibold">{item.label}</div>
                    <div className="mt-1 text-xs opacity-75">
                      Åbn opgaven
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-green-50 p-5 text-green-900 dark:bg-green-950/30 dark:text-green-100">
                  <div className="font-semibold">Ingen aktuelle opgaver</div>
                  <div className="mt-1 text-sm opacity-80">
                    Der er ikke noget, du skal tage stilling til lige nu.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
