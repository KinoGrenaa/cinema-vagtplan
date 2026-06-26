import { RealtimeGateway } from '../../realtime/realtime.gateway';

import { withTimeEntryDeviation } from './time-entry-deviation';

export function notifyTimeEntryUpdated(realtimeGateway: RealtimeGateway, entry: any) {
  const response = withTimeEntryDeviation(entry);

  realtimeGateway.notifyCinema(entry.cinemaId, 'timeEntriesUpdated', response);

  return response;
}
