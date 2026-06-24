"use client";

import { useCallback, useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useNotifications } from "@/app/hooks/useNotifications";

import NotificationsHeader from "./components/NotificationsHeader";
import NotificationsOverview from "./components/NotificationsOverview";
import { useNotificationGroups } from "./hooks/useNotificationGroups";
import { useNotificationPushActions } from "./hooks/useNotificationPushActions";
import { useNotificationsExtraData } from "./hooks/useNotificationsExtraData";
import type { ErrorDialogState } from "./helpers/notificationTypes";

export default function NotificationsPage() {
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const showError = useCallback((title: string, description: string) => {
    setErrorDialog({
      open: true,
      title,
      description,
    });
  }, []);

  const handleNotificationError = useCallback(
    (message: string) => {
      showError("Kunne ikke opdatere notifikationer", message);
    },
    [showError],
  );

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ onError: handleNotificationError });

  const {
    authLoading,
    extraLoading,
    unreadMessages,
    directTrades,
    poolTrades,
  } = useNotificationsExtraData({ showError });

  const {
    pushMessage,
    pushEnabled,
    pushLoading,
    handleEnablePush,
    handleDisablePush,
  } = useNotificationPushActions({ showError });

  const {
    activeCategory,
    expandedDateKeys,
    totalCount,
    categoryCounts,
    activeGroups,
    activeCategoryLabel,
    activeCount,
    switchCategory,
    toggleDateGroup,
  } = useNotificationGroups({
    notifications,
    unreadCount,
    unreadMessages,
    directTrades,
    poolTrades,
  });

  function closeErrorDialog() {
    setErrorDialog((current) => ({
      ...current,
      open: false,
    }));
  }

  async function handleMarkNotificationAsRead(notificationId: number) {
    await markAsRead(notificationId);
    await loadNotifications();
  }

  async function handleMarkAllNotificationsAsRead() {
    await markAllAsRead();
    await loadNotifications();
  }

  const loading = authLoading || notificationsLoading || extraLoading;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser notifikationer...
        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          variant="error"
          buttonText="OK"
          onClose={closeErrorDialog}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <NotificationsHeader
          totalCount={totalCount}
          pushLoading={pushLoading}
          pushEnabled={pushEnabled}
          pushMessage={pushMessage}
          activeCategory={activeCategory}
          unreadCount={unreadCount}
          onEnablePush={handleEnablePush}
          onDisablePush={handleDisablePush}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        />

        <NotificationsOverview
          activeCategory={activeCategory}
          activeCategoryLabel={activeCategoryLabel}
          activeCount={activeCount}
          activeGroups={activeGroups}
          categoryCounts={categoryCounts}
          expandedDateKeys={expandedDateKeys}
          notificationsCount={notifications.length}
          unreadCount={unreadCount}
          onSwitchCategory={switchCategory}
          onToggleDateGroup={toggleDateGroup}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
        />
      </div>

      <InfoModal
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        variant="error"
        buttonText="OK"
        onClose={closeErrorDialog}
      />
    </main>
  );
}
