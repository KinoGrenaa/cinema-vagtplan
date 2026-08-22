"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type Props = {
  cinema: Cinema;
  saving: boolean;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

export default function CinemaSettingsLeaveSection({
  cinema,
  saving,
  updateCinemaSettings,
}: Props) {
  const [
    days,
    setDays,
  ] = useState(
    String(
      cinema.leaveRequestMinimumNoticeDays,
    ),
  );
  const [
    validationError,
    setValidationError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    setDays(
      String(
        cinema.leaveRequestMinimumNoticeDays,
      ),
    );
    setValidationError(
      null,
    );
  }, [
    cinema.leaveRequestMinimumNoticeDays,
  ]);

  const parsedDays =
    Number(days);
  const validDays =
    Number.isInteger(
      parsedDays,
    ) &&
    parsedDays >= 0 &&
    parsedDays <= 3650;
  const hasChanges =
    validDays &&
    parsedDays !==
      cinema.leaveRequestMinimumNoticeDays;

  async function saveChanges() {
    if (!validDays) {
      setValidationError(
        "Angiv et helt antal kalenderdage mellem 0 og 3650.",
      );
      return;
    }

    setValidationError(
      null,
    );

    await updateCinemaSettings({
      leaveRequestMinimumNoticeDays:
        parsedDays,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
        Fravær
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        Bestem hvor mange kalenderdage i forvejen en ny fraværsansøgning mindst skal oprettes.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
        <label
          htmlFor="leave-request-minimum-notice-days"
          className="block text-sm font-semibold text-slate-950 dark:text-white"
        >
          Minimum varsel for fraværsansøgning
        </label>
        <div className="mt-3 flex max-w-xs items-center gap-3">
          <input
            id="leave-request-minimum-notice-days"
            type="number"
            min={0}
            max={3650}
            step={1}
            value={days}
            disabled={saving}
            onChange={(event) => {
              setDays(
                event.target.value,
              );
              setValidationError(
                null,
              );
            }}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            dage
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          0 dage tillader fravær fra dags dato. 1 dag betyder tidligst i morgen, og 2 dage betyder tidligst i overmorgen. Reglen bruger biografens danske kalenderdato.
        </p>
      </div>

      {validationError && (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {validationError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        {hasChanges && (
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Ikke-gemte ændringer
          </span>
        )}
        <button
          type="button"
          disabled={
            saving ||
            !hasChanges
          }
          onClick={() =>
            void saveChanges()
          }
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {saving
            ? "Gemmer..."
            : "Gem ændringer"}
        </button>
      </div>
    </section>
  );
}
