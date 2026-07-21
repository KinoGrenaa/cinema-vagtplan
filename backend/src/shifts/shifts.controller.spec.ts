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

  it.each(['0', '-1', '1.5', 'ukendt'])(
    'afviser ugyldigt vagt-ID %s',
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
            workTypeId: 3,
          },
        ),
      ).toThrow(BadRequestException);
    },
  );

  it.each(['0', '-1', '2.5', 'ukendt'])(
    'afviser ugyldigt biograf-ID %s',
    (cinemaId) => {
      expect(() =>
        controller.getAllShifts(
          req,
          undefined,
          cinemaId,
        ),
      ).toThrow(BadRequestException);
    },
  );

  it('videresender gyldig oprettelse', () => {
    const body = {
      startTime:
        '2026-08-10T08:00:00.000Z',
      endTime:
        '2026-08-10T12:00:00.000Z',
      workTypeId: 3,
      userId: 7,
      cinemaId: 2,
      note: 'Kasse',
    };

    controller.createShift(req, body);

    expect(
      service.createShift,
    ).toHaveBeenCalledWith(req.user, body);
  });
});
