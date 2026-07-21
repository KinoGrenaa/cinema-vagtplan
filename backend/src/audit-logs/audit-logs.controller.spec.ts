import { BadRequestException } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findAll: jest.Mock;
    findByEntity: jest.Mock;
  };
  let controller: AuditLogsController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findByEntity: jest.fn(),
    };

    controller = new AuditLogsController(
      service as unknown as AuditLogsService,
    );
  });

  it('parses a valid selected cinema for the list', () => {
    controller.getAuditLogs(req, '12');

    expect(service.findAll).toHaveBeenCalledWith(req.user, 12);
  });

  it('allows an omitted selected cinema query', () => {
    controller.getAuditLogs(req);

    expect(service.findAll).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid list cinema ID %p',
    (value) => {
      expect(() => controller.getAuditLogs(req, value)).toThrow(
        BadRequestException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('normalizes valid entity history input', () => {
    controller.getEntityHistory(
      req,
      '  TIME_ENTRY  ',
      '7',
      '3',
    );

    expect(service.findByEntity).toHaveBeenCalledWith(
      req.user,
      'TIME_ENTRY',
      7,
      3,
    );
  });

  it.each(['', '   ', `User\u0000`, 'x'.repeat(101)])(
    'rejects invalid entity type %p',
    (entityType) => {
      expect(() =>
        controller.getEntityHistory(
          req,
          entityType,
          '2',
          '1',
        ),
      ).toThrow(BadRequestException);
      expect(service.findByEntity).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid entity ID %p',
    (entityId) => {
      expect(() =>
        controller.getEntityHistory(
          req,
          'User',
          entityId,
          '1',
        ),
      ).toThrow(BadRequestException);
      expect(service.findByEntity).not.toHaveBeenCalled();
    },
  );

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid entity-history cinema ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getEntityHistory(
          req,
          'User',
          '2',
          cinemaId,
        ),
      ).toThrow(BadRequestException);
      expect(service.findByEntity).not.toHaveBeenCalled();
    },
  );
});
