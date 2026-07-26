import { RealtimeGateway } from '../../realtime/realtime.gateway';

export const messageParticipantSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export const messageInclude = {
  sender: {
    select: messageParticipantSelect,
  },
  receiver: {
    select: messageParticipantSelect,
  },
} as const;

export function notifyMessagesUpdated(
  realtime: RealtimeGateway,
  message: { cinemaId: number },
) {
  realtime.notifyCinema(
    message.cinemaId,
    'messagesUpdated',
    message,
  );
}
