export type MessageUser = {
  id: number;
  firstName: string;
  lastName: string;
};

export type Message = {
  id: number;

  subject: string;
  body: string;

  createdAt: string;

  isRead?: boolean;
  readAt?: string | null;

  isBroadcast: boolean;

  sender?: MessageUser | null;
  receiver?: MessageUser | null;
};
