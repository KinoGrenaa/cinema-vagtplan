import { BadRequestException } from '@nestjs/common';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsController', () => {
  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };
  const controller =
    new LeaveRequestsController(
      service as unknown as LeaveRequestsService,
    );
  const req = {
    user: {
      sub: 7,
      role: 'EMPLOYEE',
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
    'afviser ugyldigt fraværs-ID %p',
    (id) => {
      expect(() =>
        controller.updateStatus(
          req,
          id,
          {
            status: 'CANCELLED',
          },
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.updateStatus,
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
        controller.getAllLeaveRequests(
          req,
          cinemaId,
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '1',
    'yes',
    'TRUE',
    ' false ',
  ])(
    'afviser ugyldigt includeAll %p',
    (includeAll) => {
      expect(() =>
        controller.getAllLeaveRequests(
          req,
          undefined,
          includeAll,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender valideret listekald', () => {
    controller.getAllLeaveRequests(
      req,
      '2',
      'true',
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      2,
      true,
    );
  });

  it('tillader helt udeladt valgfri biograf', () => {
    controller.getAllLeaveRequests(
      req,
      undefined,
      undefined,
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
      false,
    );
  });

  it('videresender en gyldig oprettelse', () => {
    const body = {
      startDate:
        '2026-08-10T08:00:00.000Z',
      endDate:
        '2026-08-10T12:00:00.000Z',
      reason: 'Privat',
      cinemaId: 2,
      userId: 7,
    };

    controller.createLeaveRequest(
      req,
      body,
    );

    expect(
      service.create,
    ).toHaveBeenCalledWith(
      req.user,
      body,
    );
  });

  it('videresender valideret statusændring', () => {
    controller.updateStatus(
      req,
      '8',
      {
        status: 'APPROVED',
      },
      '2',
    );

    expect(
      service.updateStatus,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      'APPROVED',
      2,
    );
  });
});
