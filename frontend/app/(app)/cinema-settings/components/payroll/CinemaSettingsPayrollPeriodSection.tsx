import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  clampDay,
  toIsoDate,
} from "../../helpers/core/cinemaSettingsDateHelpers";
import type {
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type PayrollPeriodExample = {
  text: string;
  warning?: string | null;
};

type CinemaSettingsPayrollPeriodSectionProps = {
  cinema: Cinema;
  saving: boolean;
  periodExample: PayrollPeriodExample;
  setCinema: Dispatch<SetStateAction<Cinema | null>>;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 dark:disabled:bg-slate-800";

export default function CinemaSettingsPayrollPeriodSection({
  cinema,
  saving,
  periodExample,
  setCinema,
  updateCinemaSettings,
}: CinemaSettingsPayrollPeriodSectionProps) {
  function setLocalValue(changes: Partial<Cinema>) {
    setCinema((previousCinema) =>
      previousCinema
        ? {
            ...previousCinema,
            ...changes,
          }
        : previousCinema,
    );
  }

  function saveDay(
    field:
      | "payrollPeriodStartDay"
      | "payrollPeriodEndDay"
      | "payrollPayoutDay",
  ) {
    const value = clampDay(cinema[field]);
    setLocalValue({ [field]: value });
    void updateCinemaSettings({ [field]: value });
  }

  const optionClassName =
    "cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50/50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-blue-700 dark:hover:bg-blue-950/20";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors dark:border-slate-700 dark:bg-slate-950/60">
        <h3 className="text-xl font-bold text-slate-950 dark:text-white">
          Lønperiode
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Vælg hvordan biografens lønperioder beregnes. Indstillingen bruges
          på Mine timer og Løn.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className={optionClassName}>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <input
                type="radio"
                name="payrollPeriodModel"
                checked={cinema.payrollPeriodModel === "CALENDAR_MONTH"}
                disabled={saving}
                onChange={() =>
                  void updateCinemaSettings({
                    payrollPeriodModel: "CALENDAR_MONTH",
                    payrollPeriodStartDay: 1,
                    payrollPeriodEndDay: 31,
                  })
                }
                className="h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              Kalendermåned
            </span>
            <span className="mt-2 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              Perioden følger månedens første og sidste dag.
            </span>
          </label>

          <label className={optionClassName}>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <input
                type="radio"
                name="payrollPeriodModel"
                checked={cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY"}
                disabled={saving}
                onChange={() =>
                  void updateCinemaSettings({
                    payrollPeriodModel: "FIXED_DAY_TO_DAY",
                    payrollPeriodStartDay: clampDay(
                      cinema.payrollPeriodStartDay,
                    ),
                    payrollPeriodEndDay: clampDay(
                      cinema.payrollPeriodEndDay,
                    ),
                  })
                }
                className="h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              Fast lønperiode
            </span>
            <span className="mt-2 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              Vælg selv hvilken dag perioden starter og slutter.
            </span>
          </label>

          <label className={optionClassName}>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <input
                type="radio"
                name="payrollPeriodModel"
                checked={cinema.payrollPeriodModel === "BIWEEKLY"}
                disabled={saving}
                onChange={() =>
                  void updateCinemaSettings({
                    payrollPeriodModel: "BIWEEKLY",
                    payrollPeriodAnchorDate:
                      cinema.payrollPeriodAnchorDate || toIsoDate(new Date()),
                  })
                }
                className="h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              14-dages løn
            </span>
            <span className="mt-2 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              Perioder beregnes i 14-dages intervaller fra en ankerdato.
            </span>
          </label>
        </div>

        {cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Fra dag
              <input
                type="number"
                min={1}
                max={31}
                step={1}
                value={cinema.payrollPeriodStartDay}
                disabled={saving}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLocalValue({
                    payrollPeriodStartDay: Number(event.target.value),
                  })
                }
                onBlur={() => saveDay("payrollPeriodStartDay")}
                className={inputClassName}
              />
            </label>

            <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Til dag
              <input
                type="number"
                min={1}
                max={31}
                step={1}
                value={cinema.payrollPeriodEndDay}
                disabled={saving}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLocalValue({
                    payrollPeriodEndDay: Number(event.target.value),
                  })
                }
                onBlur={() => saveDay("payrollPeriodEndDay")}
                className={inputClassName}
              />
            </label>
          </div>
        ) : null}

        {cinema.payrollPeriodModel === "BIWEEKLY" ? (
          <label className="mt-5 block text-sm font-medium text-slate-800 dark:text-slate-200">
            Ankerdato
            <input
              type="date"
              value={cinema.payrollPeriodAnchorDate || ""}
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocalValue({
                  payrollPeriodAnchorDate: event.target.value || null,
                })
              }
              onBlur={() =>
                void updateCinemaSettings({
                  payrollPeriodAnchorDate:
                    cinema.payrollPeriodAnchorDate || null,
                })
              }
              className={`${inputClassName} md:w-auto`}
            />
          </label>
        ) : null}

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
          <h4 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            Periodeeksempel
          </h4>
          <p className="mt-1 text-sm text-blue-900 dark:text-blue-200">
            {periodExample.text}
          </p>
          {periodExample.warning ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              {periodExample.warning}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors dark:border-slate-700 dark:bg-slate-950/60">
        <h3 className="text-xl font-bold text-slate-950 dark:text-white">
          Udbetaling
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Vælg hvordan udbetalingsdatoen beregnes.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={optionClassName}>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <input
                type="radio"
                name="payrollPayoutRule"
                checked={
                  cinema.payrollPayoutRule === "LAST_WEEKDAY_OF_MONTH"
                }
                disabled={saving}
                onChange={() =>
                  void updateCinemaSettings({
                    payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH",
                  })
                }
                className="h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              Sidste hverdag i måneden
            </span>
          </label>

          <label className={optionClassName}>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <input
                type="radio"
                name="payrollPayoutRule"
                checked={cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH"}
                disabled={saving}
                onChange={() =>
                  void updateCinemaSettings({
                    payrollPayoutRule: "FIXED_DAY_OF_MONTH",
                    payrollPayoutDay:
                      cinema.payrollPayoutDay >= 1
                        ? clampDay(cinema.payrollPayoutDay)
                        : 31,
                  })
                }
                className="h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              Fast dato i måneden
            </span>
          </label>
        </div>

        {cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH" ? (
          <label className="mt-5 block text-sm font-medium text-slate-800 dark:text-slate-200 md:max-w-xs">
            Udbetalingsdag
            <input
              type="number"
              min={1}
              max={31}
              step={1}
              value={cinema.payrollPayoutDay}
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocalValue({
                  payrollPayoutDay: Number(event.target.value),
                })
              }
              onBlur={() => saveDay("payrollPayoutDay")}
              className={inputClassName}
            />
          </label>
        ) : null}
      </section>
    </div>
  );
}
