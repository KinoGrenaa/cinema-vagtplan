"use client";

import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from "react";

import type {
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type CinemaSettingsTimeEntryRulesSectionProps = {
  cinema: Cinema;
  saving: boolean;
  setCinema: Dispatch<SetStateAction<Cinema | null>>;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 dark:disabled:bg-slate-800";

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export default function CinemaSettingsTimeEntryRulesSection({
  cinema,
  saving,
  setCinema,
  updateCinemaSettings,
}: CinemaSettingsTimeEntryRulesSectionProps) {
  function setLocalValue(
    changes: Partial<Cinema>,
  ) {
    setCinema((previousCinema) =>
      previousCinema
        ? {
            ...previousCinema,
            ...changes,
          }
        : previousCinema,
    );
  }

  function saveTolerance(
    field:
      | "clockInDeviationToleranceMinutes"
      | "clockOutDeviationToleranceMinutes",
  ) {
    const value = Math.round(
      clamp(cinema[field], 0, 1440),
    );

    setLocalValue({
      [field]: value,
    });

    void updateCinemaSettings({
      [field]: value,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xl font-bold text-slate-950 dark:text-white">
        Registreringsregler
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        Bestem hvilke afvigelser der accepteres, og hvornår medarbejderen skal skrive en forklaring.
      </p>

      <div className="mt-6 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
          <h4 className="font-semibold text-slate-950 dark:text-white">
            Afvigelsestolerance
          </h4>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            Angiv hvor mange minutter mødetid og fyraften må afvige fra vagtplanen.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Mødetid (minutter)
              <input
                type="number"
                min={0}
                max={1440}
                step={1}
                value={cinema.clockInDeviationToleranceMinutes}
                disabled={saving}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) =>
                  setLocalValue({
                    clockInDeviationToleranceMinutes:
                      Number(event.target.value),
                  })
                }
                onBlur={() =>
                  saveTolerance(
                    "clockInDeviationToleranceMinutes",
                  )
                }
                className={inputClassName}
              />
            </label>

            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Fyraften (minutter)
              <input
                type="number"
                min={0}
                max={1440}
                step={1}
                value={cinema.clockOutDeviationToleranceMinutes}
                disabled={saving}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) =>
                  setLocalValue({
                    clockOutDeviationToleranceMinutes:
                      Number(event.target.value),
                  })
                }
                onBlur={() =>
                  saveTolerance(
                    "clockOutDeviationToleranceMinutes",
                  )
                }
                className={inputClassName}
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
          <h4 className="font-semibold text-slate-950 dark:text-white">
            Notekrav
          </h4>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            Vælg hvornår medarbejderen skal skrive en forklaring til den registrerede tid.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/20">
              <input
                type="checkbox"
                checked={cinema.requireNoteForManualEntry}
                disabled={saving}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) =>
                  void updateCinemaSettings({
                    requireNoteForManualEntry:
                      event.target.checked,
                  })
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950"
              />
              <span>
                <span className="block font-semibold text-slate-950 dark:text-white">
                  Kræv note ved manuel registrering uden vagt
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Medarbejderen skal forklare arbejdstid, der registreres uden en planlagt vagt.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/20">
              <input
                type="checkbox"
                checked={cinema.requireNoteForClockInDeviation}
                disabled={saving}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) =>
                  void updateCinemaSettings({
                    requireNoteForClockInDeviation:
                      event.target.checked,
                  })
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950"
              />
              <span>
                <span className="block font-semibold text-slate-950 dark:text-white">
                  Kræv note ved afvigende mødetid
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Kræver mødetidsnote, når mødetiden ligger uden for den valgte tolerance.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/20">
              <input
                type="checkbox"
                checked={cinema.requireNoteForClockOutDeviation}
                disabled={saving}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) =>
                  void updateCinemaSettings({
                    requireNoteForClockOutDeviation:
                      event.target.checked,
                  })
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950"
              />
              <span>
                <span className="block font-semibold text-slate-950 dark:text-white">
                  Kræv note ved afvigende fyraften
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Kræver fyraftensnote, når fyraften ligger uden for den valgte tolerance.
                </span>
              </span>
            </label>
          </div>
        </section>
      </div>
    </section>
  );
}
