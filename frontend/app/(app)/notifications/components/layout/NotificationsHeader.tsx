import type { NotificationCategory } from "../../helpers/core/notificationTypes";

type NotificationsHeaderProps = {
  totalCount: number;
  activeCategory: NotificationCategory;
  unreadCount: number;
  onMarkAllNotificationsAsRead: () => Promise<void>;
};

export default function NotificationsHeader({
  totalCount,
  activeCategory,
  unreadCount,
  onMarkAllNotificationsAsRead,
}: NotificationsHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifikationer</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Du har {totalCount} aktive notifikationer.
          </p>
        </div>

        {activeCategory === "system" && unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllNotificationsAsRead}
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Markér systemnotifikationer som læst
          </button>
        )}
      </div>
    </section>
  );
}
