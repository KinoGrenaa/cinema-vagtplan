"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import type {
  Notification,
} from "@/app/types/notifications";

import {
  formatDateTimeDK,
  getCategoryEmptyText,
  getCategoryLabel,
  getNotificationTypeLabel,
  getUserName,
} from "../../helpers/core/notificationHelpers";
import {
  getNotificationDestination,
} from "../../helpers/core/notificationNavigation";
import type {
  Message,
  NotificationCategory,
  NotificationGroup,
  ShiftTrade,
} from "../../helpers/core/notificationTypes";

type Props = {
  activeCategory:
    NotificationCategory;
  activeCategoryLabel: string;
  activeCount: number;
  activeGroups:
    NotificationGroup[];
  categories:
    NotificationCategory[];
  categoryCounts: Record<
    NotificationCategory,
    number
  >;
  expandedDateKeys: string[];
  notificationsCount: number;
  unreadCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore:
    () => Promise<unknown>;
  onSwitchCategory:
    (
      category:
        NotificationCategory,
    ) => void;
  onToggleDateGroup:
    (dateKey: string) => void;
  onMarkNotificationAsRead:
    (
      notificationId: number,
    ) => Promise<unknown>;
};

const itemClass =
  "block w-full p-5 text-left transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:hover:bg-gray-800/70 dark:active:bg-gray-800 dark:focus-visible:ring-blue-400";

function NotificationMeta({
  notification,
}: {
  notification: Notification;
}) {
  const destination =
    getNotificationDestination(
      notification,
    );

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {formatDateTimeDK(
          notification.createdAt,
        )}
      </span>

      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
        {destination
          ? "Åbn"
          : notification.isRead
            ? "Læst"
            : "Markér som læst"}
      </span>
    </div>
  );
}

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
  hasMore,
  loadingMore,
  onLoadMore,
  onSwitchCategory,
  onToggleDateGroup,
  onMarkNotificationAsRead,
}: Props) {
  const router = useRouter();

  async function handleSystemNotification(
    notification: Notification,
  ) {
    if (!notification.isRead) {
      await onMarkNotificationAsRead(
        notification.id,
      );
    }

    const destination =
      getNotificationDestination(
        notification,
      );

    if (destination) {
      router.push(destination);
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                aria-pressed={
                  isActive
                }
                className={`rounded-xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
                  isActive
                    ? "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:active:bg-blue-400"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600"
                }`}
              >
                <span className="font-semibold">
                  {getCategoryLabel(
                    category,
                  )}
                </span>
                <span className="mt-2 block text-2xl font-bold">
                  {
                    categoryCounts[
                      category
                    ]
                  }
                </span>
              </button>
            );
          },
        )}
      </div>

      <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
        {activeCategory ===
        "system"
          ? `Viser ${notificationsCount} hentede systemnotifikationer · ${unreadCount} ulæste`
          : `Viser ${activeCount} ${activeCategoryLabel.toLowerCase()}.`}
      </p>

      <div className="mt-4 space-y-4">
        {activeCount === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
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
                key={group.dateKey}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
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
                    <p className="font-semibold text-gray-950 dark:text-white">
                      {
                        group.dateLabel
                      }
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
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
                            onClick={() =>
                              void handleSystemNotification(
                                notification,
                              )
                            }
                            className={`${itemClass} ${
                              notification.isRead
                                ? "bg-white dark:bg-gray-900"
                                : "bg-blue-50 dark:bg-blue-950/30"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {!notification.isRead && (
                                <span className="rounded-full bg-blue-700 px-2 py-1 text-xs font-bold text-white dark:bg-blue-500">
                                  Ny
                                </span>
                              )}
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {getNotificationTypeLabel(
                                  notification.type,
                                )}
                              </span>
                            </div>

                            <p className="mt-3 font-semibold text-gray-950 dark:text-white">
                              {
                                notification.title
                              }
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                              {
                                notification.message
                              }
                            </p>

                            <NotificationMeta
                              notification={
                                notification
                              }
                            />
                          </button>
                        ),
                      )}

                    {activeCategory ===
                      "messages" &&
                      (
                        group.items as Message[]
                      ).map(
                        (message) => (
                          <Link
                            key={
                              message.id
                            }
                            href={`/messages?messageId=${message.id}`}
                            className={itemClass}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-blue-700 px-2 py-1 text-xs font-bold text-white dark:bg-blue-500">
                                Ulæst
                              </span>
                              {message.isBroadcast && (
                                <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-bold text-white">
                                  Sendt til
                                  alle
                                </span>
                              )}
                            </div>
                            <p className="mt-3 font-semibold text-gray-950 dark:text-white">
                              {
                                message.subject
                              }
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              Fra:{" "}
                              {getUserName(
                                message.sender,
                              ) ||
                                "System"}
                            </p>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                              {
                                message.body
                              }
                            </p>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTimeDK(
                                message.createdAt,
                              )}
                            </p>
                          </Link>
                        ),
                      )}

                    {(activeCategory ===
                      "directTrades" ||
                      activeCategory ===
                        "poolTrades") &&
                      (
                        group.items as ShiftTrade[]
                      ).map(
                        (trade) => (
                          <Link
                            key={
                              trade.id
                            }
                            href={`/shift-trades?tradeId=${trade.id}`}
                            className={itemClass}
                          >
                            <span className="rounded-full bg-orange-600 px-2 py-1 text-xs font-bold text-white">
                              {activeCategory ===
                              "directTrades"
                                ? "Direkte bytte"
                                : "Åben vagt"}
                            </span>
                            <p className="mt-3 font-semibold text-gray-950 dark:text-white">
                              {trade.shift
                                .workType
                                ?.name ||
                                "Vagt"}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              Fra:{" "}
                              {getUserName(
                                trade.offeredByUser,
                              ) ||
                                "Ukendt"}
                            </p>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTimeDK(
                                trade.shift
                                  .startTime,
                              )}
                            </p>
                          </Link>
                        ),
                      )}
                  </div>
                )}
              </section>
            );
          },
        )}

        {activeCategory ===
          "system" &&
          hasMore && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() =>
                void onLoadMore()
              }
              disabled={
                loadingMore
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              {loadingMore
                ? "Henter..."
                : "Hent ældre notifikationer"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
