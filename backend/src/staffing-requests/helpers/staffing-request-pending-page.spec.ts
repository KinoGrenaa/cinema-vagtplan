import {
  findPendingStaffingRequestPage,
  pendingStaffingRequestOrderBy,
} from './staffing-request-page';
import {
  staffingRequestInclude,
} from './staffing-request-helpers';

describe(
  'pending staffing request pagination',
  () => {
    const employee = {
      sub: 9,
      email:
        'employee@example.com',
      role: 'EMPLOYEE' as const,
      cinemaId: 7,
    };

    it('afgrænser og paginerer åbne forespørgsler server-side', async () => {
      const items = [
        {
          id: 52,
        },
      ];
      const prisma = {
        staffingRequest: {
          findMany:
            jest.fn().mockResolvedValue(
              items,
            ),
          count:
            jest.fn().mockResolvedValue(
              73,
            ),
        },
      };

      await expect(
        findPendingStaffingRequestPage(
          prisma as never,
          employee,
          7,
          {
            page: 2,
            limit: 50,
          },
        ),
      ).resolves.toEqual({
        items,
        page: 2,
        pageSize: 50,
        totalCount: 73,
        hasMore: true,
      });

      const where = {
        cinemaId: 7,
        OR: [
          {
            targetUserId: 9,
          },
          {
            requestedByUserId: 9,
          },
          {
            targetUserId: null,
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        ],
        status: 'PENDING',
      };

      expect(
        prisma.staffingRequest.findMany,
      ).toHaveBeenCalledWith({
        where,
        include:
          staffingRequestInclude,
        orderBy:
          pendingStaffingRequestOrderBy,
        skip: 50,
        take: 50,
      });
      expect(
        prisma.staffingRequest.count,
      ).toHaveBeenCalledWith({
        where,
      });
    });
  },
);
