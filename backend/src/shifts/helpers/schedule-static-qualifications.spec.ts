import {
  findScheduleStaticData,
  scheduleStaticUserSelect,
} from './schedule-static-data';

describe('schedule static staffing qualifications', () => {
  it('henter kun jobfunktionskvalifikationer fra den aktive biograf', async () => {
    const memberships = [
      {
        role: 'EMPLOYEE',
        user: {
          id: 21,
          email: 'test1@test.dk',
          firstName: 'Test 1',
          lastName: 'tester',
          profileImage: null,
          userJobFunctions: [
            {
              jobFunctionId: 51,
            },
          ],
        },
      },
    ];
    const prisma = {
      userCinemaMembership: {
        findMany: jest.fn().mockResolvedValue(
          memberships,
        ),
      },
      jobFunction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const result = await findScheduleStaticData(
      prisma as never,
      7,
    );

    expect(result.users).toEqual([
      {
        ...memberships[0].user,
        role: 'EMPLOYEE',
        cinemaId: 7,
      },
    ]);
    expect(
      prisma.userCinemaMembership.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          role: true,
          user: {
            select: {
              ...scheduleStaticUserSelect,
              userJobFunctions: {
                where: {
                  cinemaId: 7,
                },
                select: {
                  jobFunctionId: true,
                },
              },
            },
          },
        },
      }),
    );
  });
});
