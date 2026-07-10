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
  archivedAt?: string | null;
  sender?: User | null;
  receiver?: User | null;
  isBroadcast: boolean;
};

export type ArchiveSection = "received" | "sent";

export type MessageDateGroup = {
  dateKey: string;
  dateLabel: string;
  messages: Message[];
};
