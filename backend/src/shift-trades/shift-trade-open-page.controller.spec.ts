import {
  BadRequestException,
} from '@nestjs/common';
import {
  ShiftTradeType,
} from '@prisma/client';

import {
  ShiftTradeOpenPageController,
} from './shift-trade-open-page.controller';

describe(
  'ShiftTradeOpenPageController',
  () => {
    const service = {
      findPage: jest.fn(),
    };
    const controller =
      new ShiftTradeOpenPageController(
        service as never,
      );
    const req = {
      user: {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 2,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('videresender valideret cursor og type', () => {
      controller.findPage(
        req,
        'DIRECT',
        '2',
        '50',
        '81',
      );

      expect(
        service.findPage,
      ).toHaveBeenCalledWith(
        req.user,
        2,
        {
          type:
            ShiftTradeType.DIRECT,
          limit: 50,
          beforeId: 81,
        },
      );
    });

    it.each([
      undefined,
      '',
      'UNKNOWN',
    ])(
      'afviser ugyldig type %p',
      (type) => {
        expect(() =>
          controller.findPage(
            req,
            type,
          ),
        ).toThrow(
          BadRequestException,
        );

        expect(
          service.findPage,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
