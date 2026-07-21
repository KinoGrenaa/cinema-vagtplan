export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type SavePushSubscriptionInput = {
  userId: unknown;
  cinemaId: unknown;
  endpoint: unknown;
  p256dh: unknown;
  auth: unknown;
};

export type ValidatedPushSubscriptionInput = {
  userId: number;
  cinemaId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushSubscriptionForDelivery = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushDeliverySummary = {
  attempted: number;
  sent: number;
  failed: number;
  removed: number;
};
