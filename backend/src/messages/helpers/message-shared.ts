import { RealtimeGateway } from '../../realtime/realtime.gateway';

export const messageInclude = {
  sender: true,
  receiver: true,
} as const;

export function notifyMessagesUpdated(
  realtime: RealtimeGateway,
  message: { cinemaId: number },
) {
  realtime.notifyCinema(message.cinemaId, 'messagesUpdated', message);
}
