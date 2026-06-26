import { RealtimeGateway } from '../../realtime/realtime.gateway';

export function emitStaffingRequestsUpdate(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.server.to(`cinema-${cinemaId}`).emit('staffingRequestsUpdated', {
    cinemaId,
  });
}
