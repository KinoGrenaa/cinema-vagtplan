import { BadRequestException } from '@nestjs/common';
import { PayrollTypesController } from './payroll-types.controller';
import { PayrollTypesService } from './payroll-types.service';

describe('PayrollTypesController input validation', () => {
  const req = {
    user: {
      sub: 10,
      email: 'master@example.com',
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let controller: PayrollTypesController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new PayrollTypesController(
      service as unknown as PayrollTypesService,
    );
  });

  it('parses a valid list cinema ID before forwarding it', () => {
    controller.findAll(req, '12');

    expect(service.findAll).toHaveBeenCalledWith(req.user, 12);
  });

  it('uses no selected cinema when the list query is omitted', () => {
    controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid list cinema ID %p',
    (value) => {
      expect(() => controller.findAll(req, value)).toThrow(
        BadRequestException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('parses a valid create-body cinema ID', () => {
    const body = {
      name: 'Normal tid',
      payrollCode: 'NORMAL',
      cinemaId: '4',
    };

    controller.create(req, body);

    expect(service.create).toHaveBeenCalledWith(req.user, {
      ...body,
      cinemaId: 4,
    });
  });

  it('preserves a null create-body cinema ID', () => {
    const body = {
      name: 'Normal tid',
      payrollCode: 'NORMAL',
      cinemaId: null,
    };

    controller.create(req, body);

    expect(service.create).toHaveBeenCalledWith(req.user, body);
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid create-body cinema ID %p',
    (value) => {
      expect(() =>
        controller.create(req, {
          name: 'Normal tid',
          payrollCode: 'NORMAL',
          cinemaId: value,
        }),
      ).toThrow(BadRequestException);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('parses valid update IDs and cinema contexts', () => {
    const body = {
      name: 'Aften',
      cinemaId: '6',
    };

    controller.update(req, '8', body, '3');

    expect(service.update).toHaveBeenCalledWith(
      req.user,
      8,
      {
        ...body,
        cinemaId: 6,
      },
      3,
    );
  });

  it.each(['1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid payroll-type ID %p',
    (value) => {
      expect(() =>
        controller.update(req, value, { name: 'Aften' }, '1'),
      ).toThrow(BadRequestException);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid update query cinema ID %p',
    (value) => {
      expect(() =>
        controller.update(req, '2', { name: 'Aften' }, value),
      ).toThrow(BadRequestException);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid update-body cinema ID %p',
    (value) => {
      expect(() =>
        controller.update(
          req,
          '2',
          {
            name: 'Aften',
            cinemaId: value,
          },
          '1',
        ),
      ).toThrow(BadRequestException);
      expect(service.update).not.toHaveBeenCalled();
    },
  );

  it('parses valid delete IDs and cinema context', () => {
    controller.remove(req, '9', '5');

    expect(service.remove).toHaveBeenCalledWith(req.user, 9, 5);
  });

  it.each(['1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid delete payroll-type ID %p',
    (value) => {
      expect(() => controller.remove(req, value, '1')).toThrow(
        BadRequestException,
      );
      expect(service.remove).not.toHaveBeenCalled();
    },
  );
});
