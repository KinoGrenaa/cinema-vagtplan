import type { NotificationCategory } from "../../helpers/notificationTypes";

type NotificationsHeaderProps = {
  totalCount: number;
  pushLoading: boolean;
  pushEnabled: boolean;
  pushMessage: string;
  activeCategory: NotificationCategory;
  unreadCount: number;
  onEnablePush: () => Promise<void>;
  onDisablePush: () => Promise<void>;
  onMarkAllNotificationsAsRead: () => Promise<void>;
};

export default function NotificationsHeader({
  totalCount,
  pushLoading,
  pushEnabled,
  pushMessage,
  activeCategory,
  unreadCount,
  onEnablePush,
  onDisablePush,
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onEnablePush}
              disabled={pushLoading || pushEnabled}
              className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pushLoading
                ? "Arbejder..."
                : pushEnabled
                  ? "Push er aktiveret"
                  : "Aktivér push-notifikationer"}
            </button>
            <button
              type="button"
              onClick={onDisablePush}
              disabled={pushLoading || !pushEnabled}
              className="rounded-xl bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Deaktivér push-notifikationer
            </button>
          </div>

          {pushMessage && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {pushMessage}
            </p>
          )}
        </div>

        {activeCategory === "system" && unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllNotificationsAsRead}
            className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Markér systemnotifikationer som læst
          </button>
        )}
      </div>
    </section>
  );
}
