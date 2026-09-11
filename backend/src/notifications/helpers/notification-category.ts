export type NotificationReadCategory =
  | 'system'
  | 'directTrades'
  | 'poolTrades';

export const DIRECT_TRADE_RESULT_NOTIFICATION_TYPES = [
  'SHIFT_ACCEPTED',
  'SHIFT_REJECTED',
  'SHIFT_TRADE_CANCELLED',
];

export const POOL_TRADE_NOTIFICATION_TYPES = [
  'SHIFT_TRADE',
];

export const SYSTEM_EXCLUDED_NOTIFICATION_TYPES = [
  'NEW_MESSAGE',
  ...DIRECT_TRADE_RESULT_NOTIFICATION_TYPES,
  ...POOL_TRADE_NOTIFICATION_TYPES,
];

export function isNotificationReadCategory(
  value: unknown,
): value is NotificationReadCategory {
  return (
    value === 'system' ||
    value === 'directTrades' ||
    value === 'poolTrades'
  );
}

export function getNotificationReadCategoryTypeWhere(
  category: NotificationReadCategory,
) {
  if (category === 'directTrades') {
    return {
      in: [
        ...DIRECT_TRADE_RESULT_NOTIFICATION_TYPES,
      ],
    };
  }

  if (category === 'poolTrades') {
    return {
      in: [
        ...POOL_TRADE_NOTIFICATION_TYPES,
      ],
    };
  }

  return {
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
            ...POOL_TRADE_NOTIFICATION_TYPES,
          ],
        },
      },
    ],
  };
}
