import { BadRequestException } from '@nestjs/common';
import { ShiftTradesController } from './shift-trades.controller';
import { ShiftTradesService } from './shift-trades.service';

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
  const controller = new ShiftTradesController(
    service as unknown as ShiftTradesService,
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

  it.each(['0', '-1', '1.5', 'ikke-et-id'])(
    'afviser ugyldigt vagtbytte-ID %s',
    (id) => {
      expect(() =>
        controller.acceptTrade(req, id),
      ).toThrow(BadRequestException);
    },
  );

  it.each(['0', '-1', '2.5', 'ukendt'])(
    'afviser ugyldigt biograf-ID %s',
    (cinemaId) => {
      expect(() =>
        controller.findAll(req, cinemaId),
      ).toThrow(BadRequestException);
    },
  );

  it('sender hele actor-konteksten ved annullering', () => {
    service.cancelTrade.mockReturnValue({
      id: 12,
    });

    controller.cancelTrade(req, '12');

    expect(
      service.cancelTrade,
    ).toHaveBeenCalledWith(12, req.user);
  });

  it('sender create-input uden klientstyret bruger eller biograf', () => {
    service.create.mockReturnValue({
      id: 13,
    });

    controller.create(
      req,
      {
        shiftId: '21',
        offeredByUserId: 999,
        cinemaId: 999,
        type: 'DIRECT',
        targetUserId: '8',
        message: '  Kan du tage den?  ',
      },
      undefined,
    );

    expect(service.create).toHaveBeenCalledWith(
      req.user,
      {
        shiftId: 21,
        type: 'DIRECT',
        targetUserId: 8,
        message: '  Kan du tage den?  ',
      },
      undefined,
    );
  });
});
