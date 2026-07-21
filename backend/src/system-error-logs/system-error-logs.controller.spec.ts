import { BadRequestException } from '@nestjs/common';
import { SystemErrorLogsController } from './system-error-logs.controller';
import { SystemErrorLogsService } from './system-error-logs.service';

describe('SystemErrorLogsController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findAll: jest.Mock;
    updateStatus: jest.Mock;
  };
  let controller: SystemErrorLogsController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      updateStatus: jest.fn(),
    };

    controller = new SystemErrorLogsController(
      service as unknown as SystemErrorLogsService,
    );
  });

  it('normalizes valid list filters', () => {
    controller.findAll(' error ', 'seen', '4', '300');

    expect(service.findAll).toHaveBeenCalledWith({
      severity: 'ERROR',
      status: 'SEEN',
      cinemaId: 4,
      take: 300,
    });
  });

  it('allows omitted list filters', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith({
      severity: undefined,
      status: undefined,
      cinemaId: undefined,
      take: undefined,
    });
  });

  it.each([
    ['', undefined, undefined, undefined],
    ['fatal', undefined, undefined, undefined],
    [undefined, '', undefined, undefined],
    [undefined, 'closed', undefined, undefined],
    [undefined, undefined, '1e2', undefined],
    [undefined, undefined, '9007199254740992', undefined],
    [undefined, undefined, undefined, '1.5'],
  ])(
    'rejects invalid list filters',
    (severity, status, cinemaId, take) => {
      expect(() =>
        controller.findAll(
          severity,
          status,
          cinemaId,
          take,
        ),
      ).toThrow(BadRequestException);
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('marks a valid error as seen', () => {
    controller.markSeen('8');

    expect(service.updateStatus).toHaveBeenCalledWith({
      id: 8,
      status: 'SEEN',
    });
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid seen error ID %p',
    (id) => {
      expect(() => controller.markSeen(id)).toThrow(
        BadRequestException,
      );
      expect(service.updateStatus).not.toHaveBeenCalled();
    },
  );

  it('normalizes a valid resolution request', () => {
    controller.resolve(req, '9', '  Rettet i deploy  ');

    expect(service.updateStatus).toHaveBeenCalledWith({
      id: 9,
      status: 'RESOLVED',
      changedByUserId: 10,
      note: 'Rettet i deploy',
    });
  });

  it('normalizes a valid ignore request', () => {
    controller.ignore(req, '11', '  Forventet brugerfejl  ');

    expect(service.updateStatus).toHaveBeenCalledWith({
      id: 11,
      status: 'IGNORED',
      changedByUserId: 10,
      note: 'Forventet brugerfejl',
    });
  });

  it.each([
    undefined,
    '',
    '   ',
    'x'.repeat(2001),
    'Ugyldig\u0000note',
  ])('rejects invalid resolution note %p', (note) => {
    expect(() => controller.resolve(req, '9', note)).toThrow(
      BadRequestException,
    );
    expect(service.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects an invalid authenticated user ID', () => {
    expect(() =>
      controller.ignore(
        {
          user: {
            ...req.user,
            sub: '1e2',
          },
        },
        '11',
        'Dublet',
      ),
    ).toThrow(BadRequestException);

    expect(service.updateStatus).not.toHaveBeenCalled();
  });
});
