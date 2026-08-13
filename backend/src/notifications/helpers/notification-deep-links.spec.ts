import {
  getMyShiftNotificationLink,
  getShiftTradeNotificationLink,
  getStaffingRequestNotificationLink,
} from './notification-deep-links';

describe(
  'notification deep links',
  () => {
    it('bygger et konkret link til vagten', () => {
      expect(
        getMyShiftNotificationLink(
          17,
        ),
      ).toBe(
        '/my-shifts?shiftId=17',
      );
    });

    it('bygger et konkret link til vagtbyttet', () => {
      expect(
        getShiftTradeNotificationLink(
          42,
        ),
      ).toBe(
        '/shift-trades?tradeId=42',
      );
    });

    it('bygger et konkret link til bemandingsforespørgslen', () => {
      expect(
        getStaffingRequestNotificationLink(
          31,
        ),
      ).toBe(
        '/shift-trades?requestId=31',
      );
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'afviser ugyldigt ID %s',
      (value) => {
        expect(() =>
          getMyShiftNotificationLink(
            value,
          ),
        ).toThrow(
          'Vagt-ID skal være et positivt heltal',
        );

        expect(() =>
          getShiftTradeNotificationLink(
            value,
          ),
        ).toThrow(
          'Vagtbytte-ID skal være et positivt heltal',
        );

        expect(() =>
          getStaffingRequestNotificationLink(
            value,
          ),
        ).toThrow(
          'Forespørgsels-ID skal være et positivt heltal',
        );
      },
    );
  },
);
