import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  it('should be defined', () => {
    const service = new LeaveRequestsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
