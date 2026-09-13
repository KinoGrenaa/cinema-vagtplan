import {
  staffingRequestInclude,
  staffingRequestParticipantSelect,
  staffingRequestJobFunctionSelect,
} from './staffing-request-helpers';

describe('staffing request relation read shape', () => {
  it('henter kun deltagerfelterne som frontend bruger', () => {
    expect(staffingRequestParticipantSelect).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
  });

  it('henter kun nødvendige jobfunktionsfelter', () => {
    expect(staffingRequestJobFunctionSelect).toEqual({
      id: true,
      name: true,
      color: true,
    });
  });

  it('henter relationerne som liste, historik, deep-link og actionsvar kræver', () => {
    expect(staffingRequestInclude).toMatchObject({
      cinema: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      jobFunction: {
        select: staffingRequestJobFunctionSelect,
      },
      requestedByUser: {
        select: staffingRequestParticipantSelect,
      },
      targetUser: {
        select: staffingRequestParticipantSelect,
      },
      acceptedByUser: {
        select: staffingRequestParticipantSelect,
      },
      declines: {
        select: {
          userId: true,
          declinedAt: true,
          user: {
            select: staffingRequestParticipantSelect,
          },
        },
        orderBy: {
          declinedAt: 'asc',
        },
      },
    });

    expect(staffingRequestInclude.shift).toEqual({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        userId: true,
        jobFunctionId: true,
        jobFunctionNameSnapshot: true,
        jobFunctionColorSnapshot: true,
        user: {
          select: staffingRequestParticipantSelect,
        },
        jobFunction: {
          select: staffingRequestJobFunctionSelect,
        },
      },
    });
  });
});
