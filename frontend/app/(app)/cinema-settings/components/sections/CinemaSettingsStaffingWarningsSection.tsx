"use client";

import { useEffect, useState } from "react";

import CinemaSettingsSwitch from "../layout/CinemaSettingsSwitch";
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

export default function CinemaSettingsStaffingWarningsSection({
  cinema,
  saving,
  updateCinemaSettings,
}: Props) {
  const [enabled, setEnabled] = useState(
    cinema.staffingLoadWarningEnabled,
  );
  const [minSoldSeats, setMinSoldSeats] = useState(
    String(cinema.staffingLoadWarningMinSoldSeats),
  );
  const [maxTicketsPerEmployee, setMaxTicketsPerEmployee] = useState(
    String(cinema.staffingLoadWarningMaxTicketsPerEmployee),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(cinema.staffingLoadWarningEnabled);
    setMinSoldSeats(String(cinema.staffingLoadWarningMinSoldSeats));
    setMaxTicketsPerEmployee(
      String(cinema.staffingLoadWarningMaxTicketsPerEmployee),
    );
    setValidationError(null);
  }, [
    cinema.staffingLoadWarningEnabled,
    cinema.staffingLoadWarningMinSoldSeats,
    cinema.staffingLoadWarningMaxTicketsPerEmployee,
  ]);

  const parsedMinSoldSeats = Number(minSoldSeats);
  const parsedMaxTickets = Number(maxTicketsPerEmployee);
  const validMinSoldSeats =
    Number.isInteger(parsedMinSoldSeats) &&
    parsedMinSoldSeats >= 0 &&
    parsedMinSoldSeats <= 100000;
  const validMaxTickets =
    Number.isInteger(parsedMaxTickets) &&
    parsedMaxTickets >= 1 &&
    parsedMaxTickets <= 100000;
  const hasChanges = enabled
    ? validMinSoldSeats &&
      validMaxTickets &&
      (enabled !== cinema.staffingLoadWarningEnabled ||
        parsedMinSoldSeats !== cinema.staffingLoadWarningMinSoldSeats ||
        parsedMaxTickets !==
          cinema.staffingLoadWarningMaxTicketsPerEmployee)
    : enabled !== cinema.staffingLoadWarningEnabled;

  async function saveChanges() {
    if (!enabled) {
      setValidationError(null);
      await updateCinemaSettings({
        staffingLoadWarningEnabled: false,
      });
      return;
    }

    if (!validMinSoldSeats || !validMaxTickets) {
      setValidationError(
        "Angiv hele tal: minimum solgte billetter 0–100000 og maksimum billetter pr. medarbejder 1–100000.",
      );
      return;
    }

    setValidationError(null);

    await updateCinemaSettings({
      staffingLoadWarningEnabled: true,
      staffingLoadWarningMinSoldSeats: parsedMinSoldSeats,
      staffingLoadWarningMaxTicketsPerEmployee: parsedMaxTickets,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            Belastningsadvarsler
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Bestem selv hvornår Drift skal markere en dag som højt belastet.
            Reglen vurderer hele dagens solgte billetter i forhold til antallet
            af forskellige medarbejdere, der er tildelt mindst én vagt den dag.
          </p>
        </div>

        <CinemaSettingsSwitch
          checked={enabled}
          disabled={saving}
          ariaLabel="Aktivér belastningsadvarsler"
          onChange={(event) => {
            setEnabled(event.target.checked);
            setValidationError(null);
          }}
        />
      </div>

      {enabled ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white">
              Minimum solgte billetter
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minSoldSeats}
                disabled={saving}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "" || /^\d+$/.test(nextValue)) {
                    setMinSoldSeats(nextValue);
                    setValidationError(null);
                  }
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="mt-2 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                Under dette billetsalg vises ingen belastningsadvarsel.
              </span>
            </label>

            <label className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white">
              Maks. solgte billetter pr. tildelt medarbejder
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={maxTicketsPerEmployee}
                disabled={saving}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "" || /^\d+$/.test(nextValue)) {
                    setMaxTicketsPerEmployee(nextValue);
                    setValidationError(null);
                  }
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="mt-2 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                Advarslen udløses først, når dagens gennemsnit ligger over denne
                grænse og minimumsbilletsalget samtidig er nået.
              </span>
            </label>
          </div>

          <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
            Ændrer du reglen, får fremtidige belastningsadvarsler en ny version.
            Tidligere ignorerede advarsler skjuler derfor ikke en vurdering efter
            de nye grænser.
          </p>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          Aktivér belastningsadvarsler for at vælge biografens grænser.
        </p>
      )}

      {validationError ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {validationError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        {hasChanges ? (
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Ikke-gemte ændringer
          </span>
        ) : null}
        <button
          type="button"
          disabled={saving || !hasChanges}
          onClick={() => void saveChanges()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {saving ? "Gemmer..." : "Gem ændringer"}
        </button>
      </div>
    </section>
  );
}
