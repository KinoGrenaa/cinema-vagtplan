"use client";

import {
  useCallback,
  useState,
} from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useConfirm,
} from "@/app/hooks/useConfirm";
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
  const confirmDialog =
    useConfirm();
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
    unreadOnly,
    loading:
      notificationsLoading,
    loadingMore,
    clearingRead,
    hasMore,
    markAsRead,
    markAllAsRead,
    clearRead,
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
    directTrades,
    poolTrades,
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
    switchCategory,
    toggleDateGroup,
  } = useNotificationGroups({
    notifications,
    unreadCount,
    unreadMessages,
    directTrades,
    poolTrades,
    messagesEnabled:
      moduleAccess.messages,
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

  async function handleMarkAllNotificationsAsRead() {
    await markAllAsRead();
  }

  function handleClearReadNotifications() {
    confirmDialog.confirm({
      title:
        "Ryd læste systemnotifikationer",
      description:
        "Alle dine læste systemnotifikationer i den aktive biograf slettes permanent. Ulæste notifikationer og auditloggen berøres ikke.",
      confirmText:
        "Ryd læste",
      cancelText:
        "Annuller",
      confirmVariant:
        "danger",
      onConfirm: async () => {
        await clearRead();
      },
    });
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

  return (
    <main
      className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <NotificationsHeader
          totalCount={
            totalCount
          }
          activeCategory={
            activeCategory
          }
          unreadCount={
            unreadCount
          }
          clearingRead={
            clearingRead
          }
          onMarkAllNotificationsAsRead={
            handleMarkAllNotificationsAsRead
          }
          onClearReadNotifications={
            handleClearReadNotifications
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
          notificationsCount={
            notifications.length
          }
          unreadCount={
            unreadCount
          }
          unreadOnly={
            unreadOnly
          }
          onToggleUnreadOnly={
            toggleUnreadOnly
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
        />
      </div>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={
          confirmDialog.description
        }
        confirmText={
          confirmDialog.confirmText
        }
        cancelText={
          confirmDialog.cancelText
        }
        confirmVariant={
          confirmDialog.confirmVariant
        }
        loading={
          confirmDialog.loading
        }
        onConfirm={
          confirmDialog.handleConfirm
        }
        onCancel={
          confirmDialog.handleCancel
        }
      />

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
