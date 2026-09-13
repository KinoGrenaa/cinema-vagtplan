import {
  buildPendingStaffingRequestWhere,
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

      const result =
        await findPendingStaffingRequestPage(
          prisma as never,
          employee,
          7,
          {
            page: 2,
            limit: 50,
          },
        );

      expect(result).toMatchObject({
        page: 2,
        pageSize: 50,
        totalCount: 73,
        hasMore: true,
      });
      expect(result.items).toEqual([
        expect.objectContaining({
          id: 52,
          acceptanceConflictShift:
            null,
        }),
      ]);

      const where =
        buildPendingStaffingRequestWhere(
          employee,
          7,
        );

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
