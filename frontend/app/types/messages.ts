export type MessageParticipant = {
  id: number;
  firstName: string;
  lastName: string;
};

export type MessageReadReceipt = {
  totalRecipients: number;
  readCount: number;
  allRead: boolean;
  readBy: MessageParticipant[];
  unreadBy: MessageParticipant[];
};

export type Message = {
  id: number;

  subject: string;
  body: string;

  createdAt: string;

  isRead?: boolean;
  readAt?: string | null;

  isBroadcast: boolean;

  sender?: MessageParticipant | null;
  receiver?: MessageParticipant | null;

  conversationId?: string;
  replyToMessageId?: number | null;
  recipientParticipants?: MessageParticipant[];
  conversationLastActivityId?: number;
  conversationLastActivityAt?: string;
  conversationMessageCount?: number;
  conversationUnreadCount?: number;

  readReceipt?: MessageReadReceipt | null;
};

export type MessageConversation = {
  messageId: number;
  conversationId: string;
  messages: Message[];
  reply: {
    canReply: boolean;
    canReplyAll: boolean;
    replyRecipients: MessageParticipant[];
    replyAllRecipients: MessageParticipant[];
  };
};
