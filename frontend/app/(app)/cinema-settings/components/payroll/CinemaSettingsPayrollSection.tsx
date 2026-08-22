import type { ComponentProps } from "react";

import CinemaSettingsGroup from "../layout/CinemaSettingsGroup";
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
  const savingIndicator = saving ? (
    <div className="flex justify-end">
      <span
        className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
        role="status"
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700 dark:border-blue-800 dark:border-t-blue-300" />
        Gemmer
      </span>
    </div>
  ) : null;

  return (
    <>
      <CinemaSettingsGroup
        title="Løn og arbejdstid"
        description="Lønmodel og regler for overarbejde i løngrundlaget."
      >
        {savingIndicator}

        {message ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <CinemaSettingsPayrollRulesSection
            cinema={cinema}
            saving={saving}
            setCinema={setCinema}
            updateCinemaSettings={updateCinemaSettings}
          />
        </section>
      </CinemaSettingsGroup>

      <CinemaSettingsGroup
        title="Lønperiode og udbetaling"
        description="Bestem hvordan lønperioder afgrænses, og hvordan udbetalingsdatoen beregnes."
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <CinemaSettingsPayrollPeriodSection
            cinema={cinema}
            saving={saving}
            setCinema={setCinema}
            updateCinemaSettings={updateCinemaSettings}
            periodExample={periodExample}
          />
        </section>
      </CinemaSettingsGroup>
    </>
  );
}
