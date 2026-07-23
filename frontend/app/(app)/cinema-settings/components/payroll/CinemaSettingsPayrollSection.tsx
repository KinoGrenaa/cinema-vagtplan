import type { ComponentProps } from "react";
import CinemaSettingsPayrollPeriodSection from "./CinemaSettingsPayrollPeriodSection";
import CinemaSettingsPayrollRulesSection from "./CinemaSettingsPayrollRulesSection";

type PayrollRulesProps = ComponentProps<
  typeof CinemaSettingsPayrollRulesSection
>;
type PayrollPeriodProps = ComponentProps<
  typeof CinemaSettingsPayrollPeriodSection
>;

type CinemaSettingsPayrollSectionProps = {
  cinema: PayrollRulesProps["cinema"];
  saving: PayrollRulesProps["saving"];
  setCinema: PayrollRulesProps["setCinema"];
  updateCinemaSettings: PayrollRulesProps["updateCinemaSettings"];
  periodExample: PayrollPeriodProps["periodExample"];
  message: string | null;
};

export default function CinemaSettingsPayrollSection({
  cinema,
  saving,
  setCinema,
  updateCinemaSettings,
  periodExample,
  message,
}: CinemaSettingsPayrollSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            Lønregler og timeregistrering
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Administrer tolerancer, overtid, lønperioder og udbetaling.
          </p>
        </div>
        {saving ? (
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
            role="status"
          >
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700 dark:border-blue-800 dark:border-t-blue-300" />
            Gemmer
          </span>
        ) : null}
      </div>

      {message ? (
        <div
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6">
        <CinemaSettingsPayrollRulesSection
          cinema={cinema}
          saving={saving}
          setCinema={setCinema}
          updateCinemaSettings={updateCinemaSettings}
        />
      </div>

      <div className="my-7 border-t border-slate-200 dark:border-slate-800" />

      <CinemaSettingsPayrollPeriodSection
        cinema={cinema}
        saving={saving}
        setCinema={setCinema}
        updateCinemaSettings={updateCinemaSettings}
        periodExample={periodExample}
      />
    </section>
  );
}
