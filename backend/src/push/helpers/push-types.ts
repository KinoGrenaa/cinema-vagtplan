export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type SavePushSubscriptionInput = {
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
