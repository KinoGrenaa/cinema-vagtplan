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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 text-2xl font-bold">
        Lønregler & timeregistrering
      </h2>

      <CinemaSettingsPayrollRulesSection
        cinema={cinema}
        saving={saving}
        setCinema={setCinema}
        updateCinemaSettings={updateCinemaSettings}
      />

      <CinemaSettingsPayrollPeriodSection
        cinema={cinema}
        periodExample={periodExample}
        setCinema={setCinema}
        updateCinemaSettings={updateCinemaSettings}
      />

      {message && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          {message}
        </div>
      )}
    </section>
  );
}
