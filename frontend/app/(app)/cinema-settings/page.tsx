"use client";

import AdminGuard from "@/app/components/access/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import CinemaSettingsBrandingSection from "./components/sections/CinemaSettingsBrandingSection";
import CinemaSettingsFeatureTogglesSection from "./components/sections/CinemaSettingsFeatureTogglesSection";
import CinemaSettingsTimeRegistrationSection from "./components/sections/CinemaSettingsTimeRegistrationSection";
import CinemaSettingsHeaderSection from "./components/layout/CinemaSettingsHeaderSection";
import CinemaSettingsLoadingState from "./components/layout/CinemaSettingsLoadingState";
import CinemaSettingsMasterRequired from "./components/layout/CinemaSettingsMasterRequired";
import CinemaSettingsPayrollSection from "./components/payroll/CinemaSettingsPayrollSection";
import { calculatePeriodExample } from "./helpers/core/cinemaSettingsDateHelpers";
import { useCinemaSettingsData } from "./hooks/data/useCinemaSettingsData";

export default function CinemaSettingsPage() {
  const {
    cinema,
    setCinema,
    loading,
    saving,
    message,
    infoDialog,
    updateCinemaSettings,
    uploadCinemaLogo,
    removeCinemaLogo,
  } = useCinemaSettingsData();

  if (loading) {
    return (
      <AdminGuard>
        <CinemaSettingsLoadingState />
      </AdminGuard>
    );
  }

  if (!cinema) {
    return (
      <AdminGuard>
        <CinemaSettingsMasterRequired />
        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </AdminGuard>
    );
  }

  const periodExample = calculatePeriodExample(cinema);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-100 p-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <CinemaSettingsHeaderSection cinemaName={cinema.name} />

          <CinemaSettingsBrandingSection
            cinema={cinema}
            saving={saving}
            uploadCinemaLogo={uploadCinemaLogo}
            removeCinemaLogo={removeCinemaLogo}
          />

          <CinemaSettingsFeatureTogglesSection
            cinema={cinema}
            saving={saving}
            updateCinemaSettings={updateCinemaSettings}
          />

          <CinemaSettingsTimeRegistrationSection
            cinema={cinema}
            saving={saving}
            updateCinemaSettings={updateCinemaSettings}
          />

          <CinemaSettingsPayrollSection
            cinema={cinema}
            saving={saving}
            setCinema={setCinema}
            updateCinemaSettings={updateCinemaSettings}
            periodExample={periodExample}
            message={message}
          />
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
