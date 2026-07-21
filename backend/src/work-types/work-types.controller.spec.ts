import { BadRequestException } from '@nestjs/common';
import { WorkTypesController } from './work-types.controller';
import { WorkTypesService } from './work-types.service';

describe('WorkTypesController input validation', () => {
  const req = { user: { id: 10, role: 'MASTER' } };
  let service: {
    findAll: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let controller: WorkTypesController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new WorkTypesController(
      service as unknown as WorkTypesService,
    );
  });

  it('parses valid list query parameters before forwarding them', () => {
    controller.findAll(req, 'false', '6');

    expect(service.findAll).toHaveBeenCalledWith(req.user, false, 6);
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

  it.each(['1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid work-type ID %p',
    (value) => {
      expect(() => controller.remove(req, value, '1')).toThrow(
        BadRequestException,
      );
      expect(service.remove).not.toHaveBeenCalled();
    },
  );

  it('forwards valid update IDs as numbers', () => {
    const body = { name: 'Aften' };

    controller.update(req, '4', body, '3');

    expect(service.update).toHaveBeenCalledWith(req.user, 4, body, 3);
  });
});
