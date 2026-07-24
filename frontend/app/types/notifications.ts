export type NotificationType =
  | "SHIFT_TRADE"
  | "SHIFT_ACCEPTED"
  | "SHIFT_REJECTED"
  | "NEW_MESSAGE"
  | "TIME_ENTRY"
  | "STAFFING_ALERT"
  | "SYSTEM";

export type NotificationRelationIds = {
  relatedShiftId?: number | null;
  relatedShiftTradeId?: number | null;
  relatedMessageId?: number | null;
};

export type Notification =
  NotificationRelationIds & {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: string;
    userId: number;
    cinemaId: number;
    linkUrl?: string | null;
  };
