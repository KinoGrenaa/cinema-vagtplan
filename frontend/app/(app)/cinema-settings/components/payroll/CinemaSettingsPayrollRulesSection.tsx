"use client";

import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import CinemaSettingsPayrollModeSection, {
  type PayrollMode,
} from "./CinemaSettingsPayrollModeSection";
import CinemaSettingsAdvancedPayRulesSection from "./CinemaSettingsAdvancedPayRulesSection";
import CinemaSettingsSwitch from "../layout/CinemaSettingsSwitch";
import type {
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type CinemaSettingsPayrollRulesSectionProps = {
  cinema: Cinema;
  saving: boolean;
  setCinema: Dispatch<SetStateAction<Cinema | null>>;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 dark:disabled:bg-slate-800";

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export default function CinemaSettingsPayrollRulesSection({
  cinema,
  saving,
  setCinema,
  updateCinemaSettings,
}: CinemaSettingsPayrollRulesSectionProps) {
  const [visiblePayrollMode, setVisiblePayrollMode] =
    useState<PayrollMode | null>(null);

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

  function saveThreshold(
    field: "dailyOvertimeThreshold" | "weeklyOvertimeThreshold",
    maximum: number,
  ) {
    const value = clamp(cinema[field], 0, maximum);
    setLocalValue({ [field]: value });
    void updateCinemaSettings({ [field]: value });
  }

  return (
    <div className="space-y-5">
      <CinemaSettingsPayrollModeSection
        cinemaId={cinema.id}
        onModeChange={setVisiblePayrollMode}
      />
      {visiblePayrollMode === "ADVANCED" && (
        <CinemaSettingsAdvancedPayRulesSection cinemaId={cinema.id} />
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-slate-700 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Brug overarbejdsregler
            </h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Aktiverer overtidsregler i løneksport.
            </p>
          </div>
          <CinemaSettingsSwitch
            checked={cinema.payrollOvertimeEnabled}
            disabled={saving}
            ariaLabel="Brug overarbejdsregler"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              void updateCinemaSettings({
                payrollOvertimeEnabled: event.target.checked,
              })
            }
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span>
              <span className="font-semibold text-slate-950 dark:text-white">
                Planlagt overtid
              </span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                Over planlagt vagt.
              </span>
            </span>
            <CinemaSettingsSwitch
              checked={cinema.plannedOvertimeEnabled}
              disabled={saving}
              ariaLabel="Planlagt overtid"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                void updateCinemaSettings({
                  plannedOvertimeEnabled: event.target.checked,
                })
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span>
              <span className="font-semibold text-slate-950 dark:text-white">
                Daglig overtid
              </span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                Mere end X timer pr. dag.
              </span>
            </span>
            <CinemaSettingsSwitch
              checked={cinema.dailyOvertimeEnabled}
              disabled={saving}
              ariaLabel="Daglig overtid"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                void updateCinemaSettings({
                  dailyOvertimeEnabled: event.target.checked,
                })
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span>
              <span className="font-semibold text-slate-950 dark:text-white">
                Ugentlig overtid
              </span>
              <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                Mere end X timer pr. uge.
              </span>
            </span>
            <CinemaSettingsSwitch
              checked={cinema.weeklyOvertimeEnabled}
              disabled={saving}
              ariaLabel="Ugentlig overtid"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                void updateCinemaSettings({
                  weeklyOvertimeEnabled: event.target.checked,
                })
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Daglig overtidsgrænse
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={cinema.dailyOvertimeThreshold}
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocalValue({
                  dailyOvertimeThreshold: Number(event.target.value),
                })
              }
              onBlur={() =>
                saveThreshold("dailyOvertimeThreshold", 24)
              }
              className={inputClassName}
            />
            <span className="mt-2 block text-xs font-normal text-slate-500 dark:text-slate-400">
              Mellem 0 og 24 timer.
            </span>
          </label>

          <label className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Ugentlig overtidsgrænse
            <input
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={cinema.weeklyOvertimeThreshold}
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocalValue({
                  weeklyOvertimeThreshold: Number(event.target.value),
                })
              }
              onBlur={() =>
                saveThreshold("weeklyOvertimeThreshold", 168)
              }
              className={inputClassName}
            />
            <span className="mt-2 block text-xs font-normal text-slate-500 dark:text-slate-400">
              Mellem 0 og 168 timer.
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
