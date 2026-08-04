import { BadRequestException, GoneException } from '@nestjs/common';
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

  it.each([
    ['create', () => controller.create()],
    ['update', () => controller.update()],
    ['remove', () => controller.remove()],
    ['reactivate', () => controller.reactivate()],
  ] as const)('returns WORK_TYPE_RETIRED for %s', (_name, action) => {
    expect(action).toThrow(GoneException);
  });
});
