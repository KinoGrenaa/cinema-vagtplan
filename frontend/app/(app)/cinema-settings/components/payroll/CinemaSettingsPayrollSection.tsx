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
};

export default function CinemaSettingsPayrollSection({
  cinema,
  saving,
  setCinema,
  updateCinemaSettings,
  periodExample,
}: CinemaSettingsPayrollSectionProps) {
  return (
    <>
      <CinemaSettingsGroup
        title="Løn og arbejdstid"
        description="Lønmodel og regler for overarbejde i løngrundlaget."
      >
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
