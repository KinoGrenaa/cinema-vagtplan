import { BadRequestException, GoneException } from '@nestjs/common';
import { DayPeriodsController } from './day-periods.controller';
import { DayPeriodsService } from './day-periods.service';

describe('DayPeriodsController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    reactivate: jest.Mock;
  };
  let controller: DayPeriodsController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      reactivate: jest.fn(),
    };

    controller = new DayPeriodsController(
      service as unknown as DayPeriodsService,
    );
  });

  it('normalizes valid list input', () => {
    controller.findAll(req, 'true', '4');

    expect(service.findAll).toHaveBeenCalledWith(
      req.user,
      true,
      4,
    );
  });

  it('uses false and no cinema when list queries are omitted', () => {
    controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(
      req.user,
      false,
      undefined,
    );
  });

  it.each(['', 'TRUE', '1', 'yes'])(
    'rejects invalid includeArchived value %p',
    (includeArchived) => {
      expect(() =>
        controller.findAll(req, includeArchived, '1'),
      ).toThrow(BadRequestException);
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid list cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.findAll(req, 'false', cinemaId),
    ).toThrow(BadRequestException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it.each([
    ['create', () => controller.create()],
    ['update', () => controller.update()],
    ['remove', () => controller.remove()],
    ['reactivate', () => controller.reactivate()],
  ] as const)('returns DAY_PERIOD_RETIRED for %s', (_name, action) => {
    expect(action).toThrow(GoneException);
  });
});
