import { BadRequestException } from '@nestjs/common';
import { JobFunctionsController } from './job-functions.controller';
import { JobFunctionsService } from './job-functions.service';

describe('JobFunctionsController input validation', () => {
  const req = { user: { id: 10, role: 'MASTER' } };
  let service: {
    findAll: jest.Mock;
    findPayrollTypes: jest.Mock;
    getTimingRule: jest.Mock;
    removeUser: jest.Mock;
  };
  let controller: JobFunctionsController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findPayrollTypes: jest.fn(),
      getTimingRule: jest.fn(),
      removeUser: jest.fn(),
    };
    controller = new JobFunctionsController(
      service as unknown as JobFunctionsService,
    );
  });

  it('parses valid list query parameters before forwarding them', () => {
    controller.findAll(req, 'true', '7');

    expect(service.findAll).toHaveBeenCalledWith(req.user, true, 7);
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

  it('parses includeInactive and cinemaId for timing-rule reads', () => {
    controller.getTimingRule(req, '5', '9', 'false');

    expect(service.getTimingRule).toHaveBeenCalledWith(
      req.user,
      5,
      9,
      false,
    );
  });

  it.each(['', 'TRUE', '1', 'yes'])(
    'rejects invalid includeInactive value %p',
    (value) => {
      expect(() =>
        controller.getTimingRule(req, '5', '1', value),
      ).toThrow(BadRequestException);
      expect(service.getTimingRule).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc'])(
    'rejects invalid cinema ID %p',
    (value) => {
      expect(() => controller.findPayrollTypes(req, value)).toThrow(
        BadRequestException,
      );
      expect(service.findPayrollTypes).not.toHaveBeenCalled();
    },
  );

  it.each(['1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid employee ID %p',
    (value) => {
      expect(() =>
        controller.removeUser(req, '4', value, '1'),
      ).toThrow(BadRequestException);
      expect(service.removeUser).not.toHaveBeenCalled();
    },
  );

  it('forwards valid job-function and employee IDs as numbers', () => {
    controller.removeUser(req, '4', '12', '3');

    expect(service.removeUser).toHaveBeenCalledWith(req.user, 4, 12, 3);
  });
});
