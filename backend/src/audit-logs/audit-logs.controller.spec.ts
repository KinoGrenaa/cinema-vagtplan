import { BadRequestException } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';

describe('AuditLogsController boundaries', () => {
  const service = {
    findAll: jest.fn(),
    findByEntity: jest.fn(),
  };
  const controller =
    new AuditLogsController(
      service as never,
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

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+8',
    ' 8',
    '8 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt entitets-ID %p',
    (entityId) => {
      expect(() =>
        controller.getEntityHistory(
          req,
          'User',
          entityId,
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findByEntity,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '2.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getAuditLogs(
          req,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    ' User',
    'User ',
    'User/Entry',
    'User Entry',
    '7User',
    'x'.repeat(101),
  ])(
    'afviser ugyldig entitetstype %p',
    (entityType) => {
      expect(() =>
        controller.getEntityHistory(
          req,
          entityType,
          '8',
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findByEntity,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender valideret listekald', () => {
    controller.getAuditLogs(
      req,
      '2',
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      2,
    );
  });

  it('tillader helt udeladt valgfri biograf', () => {
    controller.getAuditLogs(
      req,
      undefined,
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it('videresender valideret entitetshistorik', () => {
    controller.getEntityHistory(
      req,
      'TimeEntry',
      '8',
      '2',
    );

    expect(
      service.findByEntity,
    ).toHaveBeenCalledWith(
      req.user,
      'TimeEntry',
      8,
      2,
    );
  });
});
