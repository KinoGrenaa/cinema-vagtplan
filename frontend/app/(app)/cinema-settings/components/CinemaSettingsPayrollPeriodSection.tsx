import type { Dispatch, SetStateAction } from "react";

import { clampDay, toIsoDate } from "../helpers/cinemaSettingsHelpers";
import type { Cinema } from "../helpers/cinemaSettingsTypes";

type PayrollPeriodExample = {
  text: string;
  warning?: string | null;
};

type CinemaSettingsPayrollPeriodSectionProps = {
  cinema: Cinema;
  periodExample: PayrollPeriodExample;
  setCinema: Dispatch<SetStateAction<Cinema | null>>;
  updateCinemaSettings: (updatedCinema: Cinema) => void | Promise<void>;
};

export default function CinemaSettingsPayrollPeriodSection({
  cinema,
  periodExample,
  setCinema,
  updateCinemaSettings,
}: CinemaSettingsPayrollPeriodSectionProps) {
  return (
    <>
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-lg font-bold">Lønperiode</h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vælg hvordan biografens lønperioder beregnes. Indstillingen
          bruges senere på /my-time og /payroll.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="radio"
              name="payrollPeriodModel"
              checked={cinema.payrollPeriodModel === "CALENDAR_MONTH"}
              onChange={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPeriodModel: "CALENDAR_MONTH",
                  payrollPeriodStartDay: 1,
                  payrollPeriodEndDay: 31,
                })
              }
              className="mr-2"
            />
            <span className="font-semibold">Kalendermåned</span>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Perioden følger månedens første og sidste dag.
            </div>
          </label>

          <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="radio"
              name="payrollPeriodModel"
              checked={cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY"}
              onChange={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPeriodModel: "FIXED_DAY_TO_DAY",
                  payrollPeriodStartDay:
                    cinema.payrollPeriodStartDay || 21,
                  payrollPeriodEndDay: cinema.payrollPeriodEndDay || 20,
                })
              }
              className="mr-2"
            />
            <span className="font-semibold">Fast lønperiode</span>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Vælg selv hvilken dag perioden starter og slutter.
            </div>
          </label>

          <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="radio"
              name="payrollPeriodModel"
              checked={cinema.payrollPeriodModel === "BIWEEKLY"}
              onChange={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPeriodModel: "BIWEEKLY",
                  payrollPeriodAnchorDate:
                    cinema.payrollPeriodAnchorDate ||
                    toIsoDate(new Date()),
                })
              }
              className="mr-2"
            />
            <span className="font-semibold">14-dages løn</span>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Perioder beregnes i 14-dages intervaller fra en anchor-dato.
            </div>
          </label>
        </div>

        {cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <div className="font-semibold">Fra dag</div>
              <input
                type="number"
                min={1}
                max={31}
                value={cinema.payrollPeriodStartDay}
                onChange={(event) =>
                  setCinema({
                    ...cinema,
                    payrollPeriodStartDay: Number(event.target.value),
                  })
                }
                onBlur={() =>
                  updateCinemaSettings({
                    ...cinema,
                    payrollPeriodStartDay: clampDay(
                      cinema.payrollPeriodStartDay,
                    ),
                  })
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            <label>
              <div className="font-semibold">Til dag</div>
              <input
                type="number"
                min={1}
                max={31}
                value={cinema.payrollPeriodEndDay}
                onChange={(event) =>
                  setCinema({
                    ...cinema,
                    payrollPeriodEndDay: Number(event.target.value),
                  })
                }
                onBlur={() =>
                  updateCinemaSettings({
                    ...cinema,
                    payrollPeriodEndDay: clampDay(
                      cinema.payrollPeriodEndDay,
                    ),
                  })
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
          </div>
        )}

        {cinema.payrollPeriodModel === "BIWEEKLY" && (
          <label className="mt-5 block">
            <div className="font-semibold">Anchor-dato</div>
            <input
              type="date"
              value={cinema.payrollPeriodAnchorDate || ""}
              onChange={(event) =>
                setCinema({
                  ...cinema,
                  payrollPeriodAnchorDate: event.target.value || null,
                })
              }
              onBlur={() => updateCinemaSettings(cinema)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950 md:w-auto"
            />
          </label>
        )}

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="font-semibold">Periodeeksempel</div>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {periodExample.text}
          </div>

          {periodExample.warning && (
            <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
              ⚠️ {periodExample.warning}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-lg font-bold">Udbetaling</h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vælg hvordan udbetalingsdatoen beregnes.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="radio"
              name="payrollPayoutRule"
              checked={
                cinema.payrollPayoutRule === "LAST_WEEKDAY_OF_MONTH"
              }
              onChange={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH",
                  payrollPayoutDay: 0,
                })
              }
              className="mr-2"
            />
            <span className="font-semibold">
              Sidste hverdag i måneden
            </span>
          </label>

          <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="radio"
              name="payrollPayoutRule"
              checked={cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH"}
              onChange={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPayoutRule: "FIXED_DAY_OF_MONTH",
                  payrollPayoutDay: cinema.payrollPayoutDay || 31,
                })
              }
              className="mr-2"
            />
            <span className="font-semibold">Fast dato i måneden</span>
          </label>
        </div>

        {cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH" && (
          <label className="mt-5 block md:w-64">
            <div className="font-semibold">Udbetalingsdag</div>
            <input
              type="number"
              min={1}
              max={31}
              value={cinema.payrollPayoutDay || 31}
              onChange={(event) =>
                setCinema({
                  ...cinema,
                  payrollPayoutDay: Number(event.target.value),
                })
              }
              onBlur={() =>
                updateCinemaSettings({
                  ...cinema,
                  payrollPayoutDay: clampDay(cinema.payrollPayoutDay),
                })
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        )}
      </div>
    </>
  );
}
