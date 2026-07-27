import {
  BadRequestException,
} from '@nestjs/common';

import {
  ScheduleTimeEntriesController,
} from './schedule-time-entries.controller';

describe(
  'ScheduleTimeEntriesController',
  () => {
    const service = {
      findForDay:
        jest.fn(),
    };
    const controller =
      new ScheduleTimeEntriesController(
        service as never,
      );
    const req = {
      user: {
        sub: 9,
        role:
          'EMPLOYEE',
        cinemaId: 7,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('videresender valideret dato og biograf', () => {
      controller.findForDay(
        req,
        '2026-08-10',
        '7',
      );

      expect(
        service.findForDay,
      ).toHaveBeenCalledWith(
        req.user,
        '2026-08-10',
        7,
      );
    });

    it.each([
      undefined,
      '',
      '2026-8-10',
      '2026-02-30',
      'ukendt',
    ])(
      'afviser ugyldig dato %p',
      (date) => {
        expect(() =>
          controller.findForDay(
            req,
            date,
            '7',
          ),
        ).toThrow(
          BadRequestException,
        );

        expect(
          service.findForDay,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
