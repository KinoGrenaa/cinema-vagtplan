import type { Notification } from "@/app/types/notifications";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
};

export type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  isBroadcast: boolean;
  sender?: User | null;
  receiver?: User | null;
};

export type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  offeredByUserId: number;
  targetUserId?: number | null;
  offeredByUser?: User | null;
  shift: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  };
};

export type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

export type NotificationCategory =
  | "system"
  | "messages"
  | "directTrades"
  | "poolTrades";

export type DateGroup<T> = {
  dateKey: string;
  dateLabel: string;
  items: T[];
  unreadCount?: number;
};

export type NotificationGroup =
  | DateGroup<Notification>
  | DateGroup<Message>
  | DateGroup<ShiftTrade>;
