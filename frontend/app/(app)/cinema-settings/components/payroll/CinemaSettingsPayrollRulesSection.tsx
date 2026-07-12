import type { Dispatch, SetStateAction } from "react";

import type { Cinema } from "../../helpers/cinemaSettingsTypes";

type CinemaSettingsPayrollRulesSectionProps = {
  cinema: Cinema;
  saving: boolean;
  setCinema: Dispatch<SetStateAction<Cinema | null>>;
  updateCinemaSettings: (updatedCinema: Cinema) => void | Promise<void>;
};

export default function CinemaSettingsPayrollRulesSection({
  cinema,
  saving,
  setCinema,
  updateCinemaSettings,
}: CinemaSettingsPayrollRulesSectionProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div>
          <div className="font-semibold">Brug avancerede lønregler</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Splitter automatisk timer i weekend, aften og nat.
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-4 text-lg font-semibold">
            Afvigelsestolerance
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Mødetid (minutter)
              </label>
              <input
                type="number"
                min={0}
                value={cinema.clockInDeviationToleranceMinutes ?? 0}
                onChange={(e) =>
                  setCinema((prev) =>
                    prev
                      ? {
                          ...prev,
                          clockInDeviationToleranceMinutes: Number(
                            e.target.value,
                          ),
                        }
                      : prev,
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Fyraften (minutter)
              </label>
              <input
                type="number"
                min={0}
                value={cinema.clockOutDeviationToleranceMinutes ?? 0}
                onChange={(e) =>
                  setCinema((prev) =>
                    prev
                      ? {
                          ...prev,
                          clockOutDeviationToleranceMinutes: Number(
                            e.target.value,
                          ),
                        }
                      : prev,
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Afvigelser mindre end tolerancen ignoreres.
          </div>
        </div>

        <button
          onClick={() =>
            updateCinemaSettings({
              ...cinema,
              payrollRulesEnabled: !cinema.payrollRulesEnabled,
            })
          }
          disabled={saving}
          className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            cinema.payrollRulesEnabled
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {cinema.payrollRulesEnabled ? "Aktiveret" : "Deaktiveret"}
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div>
          <div className="font-semibold">Brug overarbejdsregler</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aktiverer overtime regler i løneksport.
          </div>
        </div>

        <button
          onClick={() =>
            updateCinemaSettings({
              ...cinema,
              payrollOvertimeEnabled: !cinema.payrollOvertimeEnabled,
            })
          }
          disabled={saving}
          className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            cinema.payrollOvertimeEnabled
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {cinema.payrollOvertimeEnabled ? "Aktiveret" : "Deaktiveret"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="font-semibold">Planned overtime</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Over planlagt vagt.
          </div>
          <input
            type="checkbox"
            checked={cinema.plannedOvertimeEnabled}
            onChange={(event) =>
              updateCinemaSettings({
                ...cinema,
                plannedOvertimeEnabled: event.target.checked,
              })
            }
            className="mt-4 h-5 w-5"
          />
        </label>

        <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="font-semibold">Daily overtime</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Mere end X timer pr dag.
          </div>
          <input
            type="checkbox"
            checked={cinema.dailyOvertimeEnabled}
            onChange={(event) =>
              updateCinemaSettings({
                ...cinema,
                dailyOvertimeEnabled: event.target.checked,
              })
            }
            className="mt-4 h-5 w-5"
          />
        </label>

        <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="font-semibold">Weekly overtime</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Mere end X timer pr uge.
          </div>
          <input
            type="checkbox"
            checked={cinema.weeklyOvertimeEnabled}
            onChange={(event) =>
              updateCinemaSettings({
                ...cinema,
                weeklyOvertimeEnabled: event.target.checked,
              })
            }
            className="mt-4 h-5 w-5"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="font-semibold">Daglig overtime grænse</div>
          <input
            type="number"
            min={0}
            step={0.5}
            value={cinema.dailyOvertimeThreshold}
            onChange={(event) =>
              setCinema({
                ...cinema,
                dailyOvertimeThreshold: Number(event.target.value),
              })
            }
            onBlur={() => updateCinemaSettings(cinema)}
            className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>

        <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="font-semibold">Ugentlig overtime grænse</div>
          <input
            type="number"
            min={0}
            step={0.5}
            value={cinema.weeklyOvertimeThreshold}
            onChange={(event) =>
              setCinema({
                ...cinema,
                weeklyOvertimeThreshold: Number(event.target.value),
              })
            }
            onBlur={() => updateCinemaSettings(cinema)}
            className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>
    </div>
  );
}
