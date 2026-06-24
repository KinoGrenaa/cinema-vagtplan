"use client";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";

import CinemaSettingsBrandingSection from "./components/CinemaSettingsBrandingSection";
import CinemaSettingsFeatureTogglesSection from "./components/CinemaSettingsFeatureTogglesSection";
import CinemaSettingsHeaderSection from "./components/CinemaSettingsHeaderSection";
import CinemaSettingsPayrollPeriodSection from "./components/CinemaSettingsPayrollPeriodSection";
import CinemaSettingsPayrollRulesSection from "./components/CinemaSettingsPayrollRulesSection";
import { calculatePeriodExample } from "./helpers/cinemaSettingsHelpers";
import { useCinemaSettingsData } from "./hooks/useCinemaSettingsData";

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
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl text-gray-900 dark:text-gray-100">
            Indlæser...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!cinema) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="font-semibold">Biograf skal vælges</div>
            <p className="mt-2 text-sm">
              MASTER-brugere skal først vælge en biograf i MASTER-panelet.
            </p>
            <a
              href="/master"
              className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
            >
              Gå til MASTER-panel
            </a>
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

  const periodExample = calculatePeriodExample(cinema);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
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
