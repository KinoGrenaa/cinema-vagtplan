"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import SettingsHeader from "./components/layout/SettingsHeader";
import CinemaMembershipsSection from "./components/sections/CinemaMembershipsSection";
import PushNotificationsSection from "./components/sections/PushNotificationsSection";
import ThemeSettingsSection from "./components/sections/ThemeSettingsSection";
import { useSettingsPage } from "./hooks/useSettingsPage";

export default function SettingsPage() {
  const {
    currentUser,
    theme,
    setTheme,
    permission,
    pushEnabled,
    pushLoading,
    pushMessage,
    cinemaMemberships,
    cinemaMembershipsLoading,
    cinemaMembershipsError,
    switchingCinemaId,
    isMasterWithoutOwnCinema,
    switchCinema,
    enableNotifications,
    disableNotifications,
    infoDialog,
  } = useSettingsPage();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        Indlæser...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <SettingsHeader />

        <CinemaMembershipsSection
          memberships={cinemaMemberships}
          currentCinemaId={currentUser.cinemaId}
          loading={cinemaMembershipsLoading}
          switchingCinemaId={switchingCinemaId}
          error={cinemaMembershipsError}
          onSwitchCinema={switchCinema}
        />

        <ThemeSettingsSection
          theme={theme}
          setTheme={setTheme}
        />

        <PushNotificationsSection
          permission={permission}
          pushEnabled={pushEnabled}
          pushLoading={pushLoading}
          pushMessage={pushMessage}
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
