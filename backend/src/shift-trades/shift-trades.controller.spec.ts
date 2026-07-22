import { BadRequestException } from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';
import { ShiftTradesController } from './shift-trades.controller';

describe('ShiftTradesController', () => {
  const service = {
    getPoolCount: jest.fn(),
    getDirectCount: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    acceptTrade: jest.fn(),
    rejectTrade: jest.fn(),
    cancelTrade: jest.fn(),
  };
  const controller =
    new ShiftTradesController(
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

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt query-biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.findAll(
          req,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+8',
    ' 8',
    '8 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt vagtbytte-ID %p',
    (id) => {
      expect(() =>
        controller.acceptTrade(
          req,
          id,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.acceptTrade,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+4',
    ' 4',
    '4 ',
    '9007199254740992',
    'ukendt',
  ])(
    'afviser ugyldigt targetUserId %p',
    (targetUserId) => {
      expect(() =>
        controller.create(
          req,
          {
            shiftId: 3,
            targetUserId,
          },
          '2',
        ),
      ).toThrow(BadRequestException);

      expect(
        service.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender et valideret direkte tilbud med aktør og valgt biograf', () => {
    controller.create(
      req,
      {
        shiftId: '3',
        targetUserId: '4',
        type: ShiftTradeType.DIRECT,
        message: 'Kan du tage vagten?',
      },
      '2',
    );

    expect(
      service.create,
    ).toHaveBeenCalledWith(
      req.user,
      {
        shiftId: 3,
        type: ShiftTradeType.DIRECT,
        targetUserId: 4,
        message: 'Kan du tage vagten?',
      },
      2,
    );
  });

  it('bevarer manglende modtager og valgt biograf som udeladt', () => {
    controller.create(
      req,
      {
        shiftId: 3,
        targetUserId: null,
      },
      undefined,
    );

    expect(
      service.create,
    ).toHaveBeenCalledWith(
      req.user,
      {
        shiftId: 3,
        type: undefined,
        targetUserId: undefined,
        message: undefined,
      },
      undefined,
    );
  });

  it('bruger de aktuelle count-signatures', () => {
    controller.getPoolCount(
      req,
      '2',
    );
    controller.getDirectCount(
      req,
      undefined,
    );

    expect(
      service.getPoolCount,
    ).toHaveBeenCalledWith(
      req.user,
      2,
    );
    expect(
      service.getDirectCount,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it('videresender hele aktøren ved annullering', () => {
    controller.cancelTrade(
      req,
      '8',
    );

    expect(
      service.cancelTrade,
    ).toHaveBeenCalledWith(
      8,
      req.user,
    );
  });
});
