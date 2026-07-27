import {
  DEFAULT_LEAVE_REQUEST_PAGE_SIZE,
} from './helpers/leave-request-page';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  it('should be defined', () => {
    const service =
      new LeaveRequestsService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

    expect(service).toBeDefined();
  });

  it('bevarer array-svaret men begrænser kompatibilitetslæsningen til 50', async () => {
    const service =
      new LeaveRequestsService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
    const items = [
      {
        id: 81,
      },
    ];
    const findPage = jest
      .spyOn(
        service,
        'findPage',
      )
      .mockResolvedValue({
        items,
        hasMore: true,
        nextBeforeId: 31,
        totalCount: 73,
        statusCounts: {
          PENDING: 5,
          APPROVED: 60,
          REJECTED: 4,
          CANCELLED: 3,
          EXPIRED: 1,
        },
        target: null,
      });

    await expect(
      service.findAll(
        {
          sub: 9,
          role: 'ADMIN',
          cinemaId: 7,
        },
        7,
        true,
      ),
    ).resolves.toEqual(items);

    expect(
      findPage,
    ).toHaveBeenCalledWith(
      {
        sub: 9,
        role: 'ADMIN',
        cinemaId: 7,
      },
      7,
      {
        includeAll: true,
        limit:
          DEFAULT_LEAVE_REQUEST_PAGE_SIZE,
      },
    );
  });
});
