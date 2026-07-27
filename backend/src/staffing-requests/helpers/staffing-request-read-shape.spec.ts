import {
  staffingRequestInclude,
  staffingRequestParticipantSelect,
  staffingRequestWorkTypeSelect,
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
    expect(staffingRequestWorkTypeSelect).toEqual({
      id: true,
      name: true,
      color: true,
    });
  });

  it('henter præcise relationer for liste-, deep-link- og actionsvar', () => {
    expect(staffingRequestInclude).toEqual({
      cinema: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      shift: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          userId: true,
          workTypeId: true,
          user: {
            select: staffingRequestParticipantSelect,
          },
          workType: {
            select: staffingRequestWorkTypeSelect,
          },
        },
      },
      workType: {
        select: staffingRequestWorkTypeSelect,
      },
      requestedByUser: {
        select: staffingRequestParticipantSelect,
      },
      targetUser: {
        select: staffingRequestParticipantSelect,
      },
    });
  });
});
