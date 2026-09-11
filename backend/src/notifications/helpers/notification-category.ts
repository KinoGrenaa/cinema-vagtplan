export type NotificationReadCategory =
  | 'system'
  | 'directTrades';

export const DIRECT_TRADE_RESULT_NOTIFICATION_TYPES = [
  'SHIFT_ACCEPTED',
  'SHIFT_REJECTED',
  'SHIFT_TRADE_CANCELLED',
];

export const SYSTEM_EXCLUDED_NOTIFICATION_TYPES = [
  'NEW_MESSAGE',
  ...DIRECT_TRADE_RESULT_NOTIFICATION_TYPES,
];

export function isNotificationReadCategory(
  value: unknown,
): value is NotificationReadCategory {
  return (
    value === 'system' ||
    value === 'directTrades'
  );
}

export function getNotificationReadCategoryTypeWhere(
  category: NotificationReadCategory,
) {
  return category === 'directTrades'
    ? {
        in: [
          ...DIRECT_TRADE_RESULT_NOTIFICATION_TYPES,
        ],
      }
    : {
        notIn: [
          ...SYSTEM_EXCLUDED_NOTIFICATION_TYPES,
        ],
      };
}

export function buildVisibleNotificationWhere() {
  return {
    OR: [
      {
        type: {
          notIn: [
            ...SYSTEM_EXCLUDED_NOTIFICATION_TYPES,
          ],
        },
      },
      {
        type: {
          in: [
            ...DIRECT_TRADE_RESULT_NOTIFICATION_TYPES,
          ],
        },
      },
    ],
  };
}
