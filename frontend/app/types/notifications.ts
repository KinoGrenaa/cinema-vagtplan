export type NotificationType =
  | "SHIFT_TRADE"
  | "SHIFT_ACCEPTED"
  | "SHIFT_REJECTED"
  | "NEW_MESSAGE"
  | "TIME_ENTRY"
  | "STAFFING_ALERT"
  | "SYSTEM";

export type Notification = {
  id: number;

  title: string;
  message: string;

  type: NotificationType;

  isRead: boolean;

  createdAt: string;

  userId: number;
  cinemaId: number;

  relatedShiftId?: number | null;
  relatedShiftTradeId?: number | null;
  relatedMessageId?: number | null;
};
