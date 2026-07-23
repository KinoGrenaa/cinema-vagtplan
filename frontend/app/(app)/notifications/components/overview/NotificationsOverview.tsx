import type { Notification } from "@/app/types/notifications";

import {
  formatDateTimeDK,
  getCategoryEmptyText,
  getCategoryLabel,
  getNotificationTypeLabel,
  getUserName,
} from "../../helpers/core/notificationHelpers";
import type {
  Message,
  NotificationCategory,
  NotificationGroup,
  ShiftTrade,
} from "../../helpers/core/notificationTypes";

type NotificationsOverviewProps = {
  activeCategory: NotificationCategory;
  activeCategoryLabel: string;
  activeCount: number;
  activeGroups: NotificationGroup[];
  categories: NotificationCategory[];
  categoryCounts: Record<
    NotificationCategory,
    number
  >;
  expandedDateKeys: string[];
  notificationsCount: number;
  unreadCount: number;
  onSwitchCategory: (
    category: NotificationCategory,
  ) => void;
  onToggleDateGroup: (
    dateKey: string,
  ) => void;
  onMarkNotificationAsRead: (
    notificationId: number,
  ) => Promise<void>;
};

export default function NotificationsOverview({
  activeCategory,
  activeCategoryLabel,
  activeCount,
  activeGroups,
  categories,
  categoryCounts,
  expandedDateKeys,
  notificationsCount,
  unreadCount,
  onSwitchCategory,
  onToggleDateGroup,
  onMarkNotificationAsRead,
}: NotificationsOverviewProps) {
  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-2 md:grid-cols-4">
          {categories.map(
            (category) => {
              const isActive =
                activeCategory ===
                category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    onSwitchCategory(
                      category,
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
                    isActive
                      ? "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:active:bg-blue-400"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {getCategoryLabel(
                        category,
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        isActive
                          ? "bg-white text-gray-900 dark:bg-gray-950 dark:text-white"
                          : "bg-white text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                      }`}
                    >
                      {
                        categoryCounts[
                          category
                        ]
                      }
                    </span>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          {activeCategory ===
          "system"
            ? `Viser ${notificationsCount} systemnotifikationer · ${unreadCount} ulæste`
            : `Viser ${activeCount} ${activeCategoryLabel.toLowerCase()}.`}
        </div>

        {activeCount === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            {getCategoryEmptyText(
              activeCategory,
            )}
          </div>
        )}

        {activeGroups.map(
          (group) => {
            const isExpanded =
              expandedDateKeys.includes(
                group.dateKey,
              );

            return (
              <section
                key={
                  group.dateKey
                }
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() =>
                    onToggleDateGroup(
                      group.dateKey,
                    )
                  }
                  aria-expanded={
                    isExpanded
                  }
                  className="flex w-full flex-col gap-2 border-b border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:border-gray-800 dark:hover:bg-gray-800/70 dark:active:bg-gray-800 dark:focus-visible:ring-blue-400 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {
                        group.dateLabel
                      }
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {
                        group.items
                          .length
                      }{" "}
                      {activeCategoryLabel.toLowerCase()}
                      {activeCategory ===
                        "system" &&
                      group.unreadCount
                        ? ` · ${group.unreadCount} ulæste`
                        : ""}
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
                    {isExpanded
                      ? "Skjul"
                      : "Vis"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {activeCategory ===
                      "system" &&
                      (
                        group.items as Notification[]
                      ).map(
                        (
                          notification,
                        ) => (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={async () => {
                              if (
                                !notification.isRead
                              ) {
                                await onMarkNotificationAsRead(
                                  notification.id,
                                );
                              }
                            }}
                            className={`block w-full p-5 text-left transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:hover:bg-gray-800/70 dark:active:bg-gray-800 dark:focus-visible:ring-blue-400 ${
                              notification.isRead
                                ? "bg-white dark:bg-gray-900"
                                : "bg-blue-50 dark:bg-blue-950/30"
                            }`}
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  {!notification.isRead && (
                                    <span className="rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                                      Ny
                                    </span>
                                  )}
                                  <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white">
                                    {getNotificationTypeLabel(
                                      notification.type,
                                    )}
                                  </span>
                                </div>

                                <div className="font-bold">
                                  {
                                    notification.title
                                  }
                                </div>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                  {
                                    notification.message
                                  }
                                </div>
                              </div>

                              <div className="shrink-0 text-sm text-gray-400 dark:text-gray-500 md:text-right">
                                {formatDateTimeDK(
                                  notification.createdAt,
                                )}
                              </div>
                            </div>
                          </button>
                        ),
                      )}

                    {activeCategory ===
                      "messages" &&
                      (
                        group.items as Message[]
                      ).map(
                        (message) => (
                          <a
                            key={
                              message.id
                            }
                            href="/messages"
                            className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                                Ulæst
                              </span>
                              {message.isBroadcast && (
                                <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                                  Sendt til
                                  alle
                                </span>
                              )}
                            </div>

                            <div className="font-bold">
                              {
                                message.subject
                              }
                            </div>
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Fra:{" "}
                              {getUserName(
                                message.sender,
                              ) ||
                                "System"}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                              {
                                message.body
                              }
                            </div>
                            <div className="mt-3 text-sm text-gray-400 dark:text-gray-500">
                              {formatDateTimeDK(
                                message.createdAt,
                              )}
                            </div>
                          </a>
                        ),
                      )}

                    {activeCategory ===
                      "directTrades" &&
                      (
                        group.items as ShiftTrade[]
                      ).map(
                        (trade) => (
                          <a
                            key={
                              trade.id
                            }
                            href="/shift-trades"
                            className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                          >
                            <div className="mb-2">
                              <span className="rounded-full bg-orange-600 px-2 py-1 text-xs font-semibold text-white">
                                Direkte
                                bytte
                              </span>
                            </div>
                            <div className="font-bold">
                              {trade
                                .shift
                                .workType
                                ?.name ||
                                "Vagt"}
                            </div>
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Fra:{" "}
                              {getUserName(
                                trade.offeredByUser,
                              ) ||
                                "Ukendt"}
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTimeDK(
                                trade
                                  .shift
                                  .startTime,
                              )}
                            </div>
                          </a>
                        ),
                      )}

                    {activeCategory ===
                      "poolTrades" &&
                      (
                        group.items as ShiftTrade[]
                      ).map(
                        (trade) => (
                          <a
                            key={
                              trade.id
                            }
                            href="/shift-trades"
                            className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                          >
                            <div className="mb-2">
                              <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">
                                Åben vagt
                              </span>
                            </div>
                            <div className="font-bold">
                              {trade
                                .shift
                                .workType
                                ?.name ||
                                "Vagt"}
                            </div>
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Fra:{" "}
                              {getUserName(
                                trade.offeredByUser,
                              ) ||
                                "Ukendt"}
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTimeDK(
                                trade
                                  .shift
                                  .startTime,
                              )}
                            </div>
                          </a>
                        ),
                      )}
                  </div>
                )}
              </section>
            );
          },
        )}
      </section>
    </>
  );
}
