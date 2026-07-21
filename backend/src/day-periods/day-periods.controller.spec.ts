import { BadRequestException } from '@nestjs/common';
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

  it('forwards create input unchanged', () => {
    const body = {
      name: 'Aften',
      startMinute: 960,
      endMinute: 1200,
      cinemaId: 4,
    };

    controller.create(req, body);

    expect(service.create).toHaveBeenCalledWith(req.user, body);
  });

  it.each([
    ['update', 'update'],
    ['remove', 'remove'],
    ['reactivate', 'reactivate'],
  ] as const)(
    'normalizes valid IDs and cinema context for %s',
    (methodName, serviceMethodName) => {
      if (methodName === 'update') {
        controller.update(req, '8', { name: 'Aften' }, '3');

        expect(service[serviceMethodName]).toHaveBeenCalledWith(
          req.user,
          8,
          { name: 'Aften' },
          3,
        );
        return;
      }

      controller[methodName](req, '8', '3');

      expect(service[serviceMethodName]).toHaveBeenCalledWith(
        req.user,
        8,
        3,
      );
    },
  );

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid day-period ID %p', (id) => {
    expect(() =>
      controller.update(req, id, { name: 'Aften' }, '1'),
    ).toThrow(BadRequestException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid mutation cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.reactivate(req, '2', cinemaId),
    ).toThrow(BadRequestException);
    expect(service.reactivate).not.toHaveBeenCalled();
  });
});
