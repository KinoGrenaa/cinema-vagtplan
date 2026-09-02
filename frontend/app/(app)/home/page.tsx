"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  fetchCinemaStartOpenTimeEntry,
  fetchCinemaStartOverview,
  type CinemaStartCinema,
  type CinemaStartOpenTimeEntry,
  type CinemaStartOverview,
  type CinemaStartShift,
} from "../../components/cinema/cinemaStartOverview";
import { useAuth } from "../../providers/AuthProvider";
import { getTodayLocalDate } from "../../utils/dateTime";

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

function getCopenhagenDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

function ShiftSummary({
  shift,
  showDate,
}: {
  shift: CinemaStartShift;
  showDate?: boolean;
}) {
  return (
    <div>
      <div className="text-lg font-bold text-gray-950 dark:text-white">
        {shift.jobFunction.name}
      </div>
      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {showDate ? (
          <>
            {dayFormatter.format(new Date(shift.startTime))}
            {" · "}
          </>
        ) : null}
        {timeFormatter.format(new Date(shift.startTime))}
        {"–"}
        {timeFormatter.format(new Date(shift.endTime))}
      </div>
    </div>
  );
}

export default function PersonalHomePage() {
  const { loading: authLoading, token, user } = useAuth();
  const [overview, setOverview] =
    useState<CinemaStartOverview | null>(null);
  const [openTimeEntry, setOpenTimeEntry] =
    useState<CinemaStartOpenTimeEntry | null>(null);
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

    Promise.all([
      fetchCinemaStartOverview(),
      fetchCinemaStartOpenTimeEntry(user.id).catch(() => null),
    ])
      .then(([data, openEntry]) => {
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
        setOpenTimeEntry(openEntry);
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
      ) ??
      overview.cinemas[0] ??
      null
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
          <h1 className="text-xl font-bold">
            Startsiden kunne ikke indlæses
          </h1>
          <p className="mt-2 text-sm">
            {error || "Ingen aktiv biograf blev fundet."}
          </p>
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
  const now = new Date();
  const today = getTodayLocalDate();
  const currentShift =
    activeCinema.nextShifts.find((shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return start <= now && end > now;
    }) ?? null;
  const nextShiftToday =
    activeCinema.nextShifts.find(
      (shift) =>
        new Date(shift.startTime) > now &&
        getCopenhagenDateKey(shift.startTime) === today,
    ) ?? null;
  const focusShift =
    currentShift ??
    nextShiftToday ??
    activeCinema.nextShift ??
    activeCinema.nextShifts[0] ??
    null;
  const upcomingShifts = activeCinema.nextShifts
    .filter((shift) => shift.id !== focusShift?.id)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
                Min dag
              </h1>
              <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">
                Dit personlige overblik over vagter, tidsregistrering og ting,
                der kræver din handling.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              {activeCinema.role === "ADMIN" ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Driftsoverblik
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Lige nu
            </p>

            {openTimeEntry ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                  Åben tidsregistrering
                </h2>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  Mødetid registreret kl.{" "}
                  <strong>
                    {timeFormatter.format(
                      new Date(openTimeEntry.clockIn),
                    )}
                  </strong>
                  . Fyraften mangler.
                </p>
                {openTimeEntry.shift?.jobFunction?.name ? (
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {openTimeEntry.shift.jobFunction.name}
                  </p>
                ) : null}
                <Link
                  href={`/schedule?date=${today}`}
                  className="mt-5 inline-flex rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Registrer fyraften
                </Link>
              </div>
            ) : currentShift ? (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                  Du er på arbejde nu
                </h2>
                <div className="mt-4">
                  <ShiftSummary shift={currentShift} />
                </div>
                <Link
                  href={`/schedule?date=${today}`}
                  className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Åbn dagens vagt
                </Link>
              </div>
            ) : nextShiftToday ? (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                  Næste vagt i dag
                </h2>
                <div className="mt-4">
                  <ShiftSummary shift={nextShiftToday} />
                </div>
                <Link
                  href={`/schedule?date=${today}`}
                  className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Åbn dagens vagtplan
                </Link>
              </div>
            ) : focusShift ? (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                  Næste vagt
                </h2>
                <div className="mt-4">
                  <ShiftSummary shift={focusShift} showDate />
                </div>
                <Link
                  href={`/my-shifts?shiftId=${focusShift.id}`}
                  className="mt-5 inline-flex rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  Se vagten
                </Link>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                  Ingen vagt i dag
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Du har ingen planlagte vagter lige nu.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              Kræver handling
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Kun aktuelle punkter, der er relevante for dig og denne biograf.
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
                      {item.severity === "ACTION_REQUIRED"
                        ? "Åbn opgaven"
                        : "Se mere"}
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

        <nav
          aria-label="Hurtige handlinger"
          className="flex flex-wrap gap-2"
        >
          <Link
            href="/schedule"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            Se vagtplan
          </Link>
          <Link
            href="/my-shifts"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            Mine vagter
          </Link>
          <Link
            href="/my-time"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            Mine timer
          </Link>
          <Link
            href="/leave-requests"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            Fravær
          </Link>
          <Link
            href="/messages"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            Beskeder
          </Link>
        </nav>

        {upcomingShifts.length > 0 ? (
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-950 dark:text-white">
                Kommende
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Dine næste vagter efter den, der er fremhævet ovenfor.
              </p>
            </div>

            <Link
              href="/my-shifts"
              className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              Se alle mine vagter
            </Link>
          </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upcomingShifts.map((shift) => (
                <ShiftRow key={shift.id} shift={shift} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
