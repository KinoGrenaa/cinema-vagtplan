import {
  buildVisibleNotificationWhere,
} from './helpers/notification-category';

describe('Direct trade notification history visibility', () => {
  it('bevarer direkte bytteresultater i feedet efter de er læst', () => {
    const where =
      buildVisibleNotificationWhere();

    expect(where).toEqual({
      OR: [
        {
          type: {
            notIn: expect.any(Array),
          },
        },
        {
          type: {
            in: expect.arrayContaining([
              'SHIFT_ACCEPTED',
              'SHIFT_REJECTED',
              'SHIFT_TRADE_CANCELLED',
            ]),
          },
        },
      ],
    });

    expect(
      JSON.stringify(where),
    ).not.toContain('"isRead":false');
  });
});
