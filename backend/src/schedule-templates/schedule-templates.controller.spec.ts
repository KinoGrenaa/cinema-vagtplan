import { BadRequestException } from '@nestjs/common';
import { ScheduleTemplatesController } from './schedule-templates.controller';
import { ScheduleTemplatesService } from './schedule-templates.service';

describe('ScheduleTemplatesController input validation', () => {
  const req = { user: { id: 10, role: 'MASTER' } };
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    upsertDay: jest.Mock;
    addJobFunction: jest.Mock;
  };
  let controller: ScheduleTemplatesController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      upsertDay: jest.fn(),
      addJobFunction: jest.fn(),
    };
    controller = new ScheduleTemplatesController(
      service as unknown as ScheduleTemplatesService,
    );
  });

  it('parses valid list query parameters before forwarding them', () => {
    controller.findAll(req, 'true', '12');

    expect(service.findAll).toHaveBeenCalledWith(req.user, true, 12);
  });

  it('uses false and no cinema when optional parameters are omitted', () => {
    controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(req.user, false, undefined);
  });

  it.each(['', 'TRUE', '1', 'yes'])(
    'rejects invalid includeArchived value %p',
    (value) => {
      expect(() => controller.findAll(req, value, '1')).toThrow(
        BadRequestException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc'])(
    'rejects invalid cinema ID %p',
    (value) => {
      expect(() => controller.findAll(req, 'false', value)).toThrow(
        BadRequestException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('rejects unsafe template IDs before calling the service', () => {
    expect(() =>
      controller.findOne(req, '9007199254740992', '1'),
    ).toThrow(BadRequestException);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each(['0', '8', '1.5', 'abc'])(
    'rejects invalid weekday %p',
    (weekday) => {
      expect(() =>
        controller.upsertDay(req, '2', weekday, {}, '1'),
      ).toThrow(BadRequestException);
      expect(service.upsertDay).not.toHaveBeenCalled();
    },
  );

  it('forwards a valid weekday as a number', () => {
    const body = { isActive: true };

    controller.upsertDay(req, '2', '7', body, '3');

    expect(service.upsertDay).toHaveBeenCalledWith(
      req.user,
      2,
      7,
      body,
      3,
    );
  });
});
