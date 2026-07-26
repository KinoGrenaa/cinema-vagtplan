import type {
  NotificationCategory,
} from "../../helpers/core/notificationTypes";

type NotificationsHeaderProps = {
  totalCount: number;
  activeCategory:
    NotificationCategory;
  unreadCount: number;
  clearingRead: boolean;
  onMarkAllNotificationsAsRead:
    () => Promise<void>;
  onClearReadNotifications:
    () => void;
};

export default function NotificationsHeader({
  totalCount,
  activeCategory,
  unreadCount,
  clearingRead,
  onMarkAllNotificationsAsRead,
  onClearReadNotifications,
}: NotificationsHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Notifikationer
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Du har {totalCount} aktive
            notifikationer.
          </p>
        </div>

        {activeCategory ===
          "system" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={
                  onMarkAllNotificationsAsRead
                }
                className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              >
                Markér
                systemnotifikationer
                som læst
              </button>
            )}

            <button
              type="button"
              onClick={
                onClearReadNotifications
              }
              disabled={
                clearingRead
              }
              className="rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-500 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              {clearingRead
                ? "Rydder..."
                : "Ryd læste"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
