import {
  BadRequestException,
} from '@nestjs/common';

import {
  StaffingRequestsController,
} from './staffing-requests.controller';

describe(
  'staffing request pending page controller',
  () => {
    const service = {
      findPendingPage:
        jest.fn(),
    };
    const controller =
      new StaffingRequestsController(
        service as never,
      );
    const req = {
      user: {
        sub: 7,
        email:
          'employee@example.com',
        role:
          'EMPLOYEE' as const,
        cinemaId: 2,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('videresender valideret side og limit', () => {
      controller.findPendingPage(
        req,
        '2',
        '50',
        '3',
      );

      expect(
        service.findPendingPage,
      ).toHaveBeenCalledWith(
        req.user,
        2,
        {
          limit: 50,
          page: 3,
        },
      );
    });

    it.each([
      '0',
      '-1',
      '1.5',
      '1e2',
      '+2',
      ' 2',
      '2 ',
      'ukendt',
      '',
    ])(
      'afviser ugyldig side %p',
      (page) => {
        expect(() =>
          controller.findPendingPage(
            req,
            '2',
            '50',
            page,
          ),
        ).toThrow(
          BadRequestException,
        );

        expect(
          service.findPendingPage,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
