"use client";

import Link from "next/link";
import {
  useCallback,
  useState,
} from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import {
  useNotifications,
} from "@/app/hooks/useNotifications";
import NotificationsHeader from "./components/layout/NotificationsHeader";
import NotificationsOverview from "./components/overview/NotificationsOverview";
import type {
  ErrorDialogState,
} from "./helpers/core/notificationTypes";
import {
  useNotificationsExtraData,
} from "./hooks/data/useNotificationsExtraData";
import {
  useNotificationGroups,
} from "./hooks/groups/useNotificationGroups";
import styles from "./NotificationsPage.module.css";

export default function NotificationsPage() {
  const [
    errorDialog,
    setErrorDialog,
  ] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const showError =
    useCallback(
      (
        title: string,
        description: string,
      ) => {
        setErrorDialog({
          open: true,
          title,
          description,
        });
      },
      [],
    );

  const handleNotificationError =
    useCallback(
      (message: string) => {
        showError(
          "Kunne ikke opdatere notifikationer",
          message,
        );
      },
      [showError],
    );

  const {
    notifications,
    unreadCount,
    systemUnreadCount,
    directResultUnreadCount,
    unreadOnly,
    loading:
      notificationsLoading,
    loadingMore,
    hasMore,
    markAsRead,
    markCategoryAsRead,
    loadMore,
    toggleUnreadOnly,
  } = useNotifications({
    onError:
      handleNotificationError,
  });

  const {
    authLoading,
    extraLoading,
    unreadMessages,
    unreadMessageCount,
    directTrades,
    poolTrades,
    directTradeCount,
    poolTradeCount,
    moduleAccess,
  } = useNotificationsExtraData({
    showError,
  });

  const {
    activeCategory,
    expandedDateKeys,
    totalCount,
    categoryCounts,
    visibleCategories,
    activeGroups,
    activeCategoryLabel,
    activeCount,
    hideReadDirectTrades,
    systemNotificationCount,
    switchCategory,
    toggleHideReadDirectTrades,
    toggleDateGroup,
  } = useNotificationGroups({
    notifications,
    unreadCount,
    systemUnreadCount,
    directResultUnreadCount,
    unreadMessages,
    unreadMessageCount,
    directTrades,
    poolTrades,
    directTradeCount,
    poolTradeCount,
    messagesEnabled: false,
    shiftTradesEnabled:
      moduleAccess.shiftTrades,
  });

  function closeErrorDialog() {
    setErrorDialog(
      (current) => ({
        ...current,
        open: false,
      }),
    );
  }

  async function handleMarkNotificationAsRead(
    notificationId: number,
  ) {
    await markAsRead(
      notificationId,
    );
  }

  async function handleMarkActiveCategoryAsRead() {
    if (
      activeCategory !== "system" &&
      activeCategory !== "directTrades"
    ) {
      return;
    }

    await markCategoryAsRead(
      activeCategory,
    );
  }


  const loading =
    authLoading ||
    notificationsLoading ||
    extraLoading;

  if (loading) {
    return (
      <main
        className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
      >
        <div className="mx-auto max-w-5xl">
          <div
            className={
              styles.loadingCard
            }
            role="status"
            aria-live="polite"
          >
            Indlæser
            notifikationer...
          </div>
        </div>
        <InfoModal
          open={
            errorDialog.open
          }
          title={
            errorDialog.title
          }
          description={
            errorDialog.description
          }
          variant="error"
          buttonText="OK"
          onClose={
            closeErrorDialog
          }
        />
      </main>
    );
  }

  const messageOverviewIsLimited =
    activeCategory ===
      "messages" &&
    unreadMessageCount >
      unreadMessages.length;
  const shiftTradeOverviewLimit =
    activeCategory ===
      "directTrades" &&
    directTradeCount >
      directTrades.length
      ? {
          shown: directTrades.length,
          total: directTradeCount,
          label: "direkte vagtbytter",
        }
      : activeCategory ===
            "poolTrades" &&
          poolTradeCount >
            poolTrades.length
        ? {
            shown: poolTrades.length,
            total: poolTradeCount,
            label:
              "vagtbytter i puljen",
          }
        : null;

  return (
    <main
      className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <NotificationsHeader
          unreadCount={
            unreadCount
          }
        />
        <NotificationsOverview
          activeCategory={
            activeCategory
          }
          activeCategoryLabel={
            activeCategoryLabel
          }
          activeCount={
            activeCount
          }
          activeGroups={
            activeGroups
          }
          categories={
            visibleCategories
          }
          categoryCounts={
            categoryCounts
          }
          expandedDateKeys={
            expandedDateKeys
          }
          systemNotificationCount={
            systemNotificationCount
          }
          systemUnreadCount={
            systemUnreadCount
          }
          directResultUnreadCount={
            directResultUnreadCount
          }
          unreadOnly={
            unreadOnly
          }
          onToggleUnreadOnly={
            toggleUnreadOnly
          }
          hideReadDirectTrades={
            hideReadDirectTrades
          }
          onToggleHideReadDirectTrades={
            toggleHideReadDirectTrades
          }
          hasMore={hasMore}
          loadingMore={
            loadingMore
          }
          onLoadMore={
            loadMore
          }
          onSwitchCategory={
            switchCategory
          }
          onToggleDateGroup={
            toggleDateGroup
          }
          onMarkNotificationAsRead={
            handleMarkNotificationAsRead
          }
          onMarkCategoryAsRead={
            handleMarkActiveCategoryAsRead
          }
        />

        {messageOverviewIsLimited && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            <p>
              Viser de{" "}
              {unreadMessages.length}{" "}
              nyeste af{" "}
              {unreadMessageCount}{" "}
              ulæste beskeder.
            </p>
            <Link
              href="/messages"
              className="rounded-xl bg-blue-700 px-4 py-2 text-center font-semibold text-white transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
            >
              Åbn hele indbakken
            </Link>
          </div>
        )}
        {shiftTradeOverviewLimit && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            <p>
              Viser de{" "}
              {shiftTradeOverviewLimit.shown}{" "}
              nyeste af{" "}
              {shiftTradeOverviewLimit.total}{" "}
              {shiftTradeOverviewLimit.label}.
            </p>
            <Link
              href="/shift-trades"
              className="rounded-xl bg-blue-700 px-4 py-2 text-center font-semibold text-white transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
            >
              Åbn alle vagtbytter
            </Link>
          </div>
        )}
      </div>

      <InfoModal
        open={errorDialog.open}
        title={
          errorDialog.title
        }
        description={
          errorDialog.description
        }
        variant="error"
        buttonText="OK"
        onClose={
          closeErrorDialog
        }
      />
    </main>
  );
}
