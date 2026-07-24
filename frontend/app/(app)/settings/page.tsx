"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import SettingsHeader from "./components/layout/SettingsHeader";
import CinemaMembershipsSection from "./components/sections/CinemaMembershipsSection";
import DefaultCinemaSection from "./components/sections/DefaultCinemaSection";
import PushNotificationsSection from "./components/sections/PushNotificationsSection";
import ThemeSettingsSection from "./components/sections/ThemeSettingsSection";
import { useSettingsPage } from "./hooks/useSettingsPage";

export default function SettingsPage() {
  const {
    currentUser,
    theme,
    setTheme,
    permission,
    pushSupported,
    pushEnabled,
    pushLoading,
    pushMessage,
    pushMessageTone,
    cinemaMemberships,
    cinemaMembershipsLoading,
    cinemaMembershipsError,
    switchingCinemaId,
    defaultCinemaOptions,
    selectedDefaultCinemaId,
    setSelectedDefaultCinemaId,
    defaultCinemaLoading,
    defaultCinemaSaving,
    defaultCinemaError,
    defaultCinemaMessage,
    isMasterWithoutOwnCinema,
    saveDefaultCinema,
    switchCinema,
    enableNotifications,
    disableNotifications,
    infoDialog,
  } = useSettingsPage();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div
            className="flex min-h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            role="status"
            aria-live="polite"
          >
            Indlæser indstillinger...
          </div>
        </div>
      </main>
    );
  }

  const showDefaultCinemaSection =
    currentUser.role === "MASTER"
      ? Boolean(
          defaultCinemaOptions &&
            defaultCinemaOptions.cinemas.length > 1,
        )
      : !cinemaMembershipsLoading &&
        cinemaMemberships.length > 1;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <SettingsHeader />

        {showDefaultCinemaSection && (
          <DefaultCinemaSection
            options={defaultCinemaOptions}
            selectedCinemaId={selectedDefaultCinemaId}
            loading={defaultCinemaLoading}
            saving={defaultCinemaSaving}
            error={defaultCinemaError}
            message={defaultCinemaMessage}
            onSelectedCinemaIdChange={setSelectedDefaultCinemaId}
            onSave={saveDefaultCinema}
          />
        )}

        {currentUser.role !== "MASTER" && (
          <CinemaMembershipsSection
            memberships={cinemaMemberships}
            currentCinemaId={currentUser.cinemaId}
            loading={cinemaMembershipsLoading}
            switchingCinemaId={switchingCinemaId}
            error={cinemaMembershipsError}
            onSwitchCinema={switchCinema}
          />
        )}

        <ThemeSettingsSection theme={theme} setTheme={setTheme} />

        <PushNotificationsSection
          permission={permission}
          supported={pushSupported}
          pushEnabled={pushEnabled}
          pushLoading={pushLoading}
          pushMessage={pushMessage}
          pushMessageTone={pushMessageTone}
          isMasterWithoutOwnCinema={isMasterWithoutOwnCinema}
          onEnableNotifications={enableNotifications}
          onDisableNotifications={disableNotifications}
        />
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </main>
  );
}
