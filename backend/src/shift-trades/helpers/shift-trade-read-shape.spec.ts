import {
  shiftTradeInclude,
  shiftTradeParticipantSelect,
} from './shift-trade-service-helpers';

describe('shift trade relation read shape', () => {
  it('henter kun deltagerfelterne som frontend bruger', () => {
    expect(shiftTradeParticipantSelect).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
  });

  it('henter kun nødvendige vagt- og relationfelter', () => {
    expect(shiftTradeInclude).toEqual({
      shift: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          userId: true,
          user: {
            select: shiftTradeParticipantSelect,
          },
          workType: {
            select: {
              name: true,
              color: true,
            },
          },
        },
      },
      offeredByUser: {
        select: shiftTradeParticipantSelect,
      },
      targetUser: {
        select: shiftTradeParticipantSelect,
      },
      acceptedByUser: {
        select: shiftTradeParticipantSelect,
      },
      rejectedByUser: {
        select: shiftTradeParticipantSelect,
      },
    });
  });
});
