export type NotificationType =
  | "SHIFT_TRADE"
  | "SHIFT_DIRECT"
  | "SHIFT_ASSIGNED"
  | "SHIFT_ACCEPTED"
  | "SHIFT_REJECTED"
  | "NEW_MESSAGE"
  | "TIME_ENTRY"
  | "STAFFING_ALERT"
  | "STAFFING_REQUEST"
  | "STAFFING_ACCEPTED"
  | "LEAVE_REQUEST_CREATED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_CANCELLED_BY_EMPLOYEE"
  | "LEAVE_REQUEST_CANCELLED_BY_ADMIN"
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
