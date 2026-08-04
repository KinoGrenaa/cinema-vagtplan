import { BadRequestException } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

describe('ShiftsController', () => {
  const service = {
    findAll: jest.fn(),
    createShift: jest.fn(),
    updateShift: jest.fn(),
    deleteShift: jest.fn(),
  };
  const controller = new ShiftsController(
    service as unknown as ShiftsService,
  );
  const req = {
    user: {
      sub: 7,
      role: 'ADMIN',
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
    '+8',
    ' 8',
    '8 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt vagt-ID %p',
    (id) => {
      expect(() =>
        controller.updateShift(
          req,
          id,
          {
            startTime:
              '2026-08-10T08:00:00.000Z',
            endTime:
              '2026-08-10T12:00:00.000Z',
            jobFunctionId: 3,
          },
        ),
      ).toThrow(BadRequestException);

      expect(
        service.updateShift,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '2.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getAllShifts(
          req,
          undefined,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender gyldig oprettelse', () => {
    const body = {
      startTime:
        '2026-08-10T08:00:00.000Z',
      endTime:
        '2026-08-10T12:00:00.000Z',
      jobFunctionId: 3,
      userId: 7,
      cinemaId: 2,
      note: 'Kasse',
    };

    controller.createShift(req, body);

    expect(
      service.createShift,
    ).toHaveBeenCalledWith(
      req.user,
      body,
    );
  });

  it('videresender validerede delete-IDer', () => {
    controller.deleteShift(
      req,
      '8',
      '2',
    );

    expect(
      service.deleteShift,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      2,
    );
  });

  it('tillader helt udeladt query-biograf', () => {
    controller.getAllShifts(
      req,
      '2026-08-10',
      undefined,
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      '2026-08-10',
      undefined,
    );
  });
});
