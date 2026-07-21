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

  it.each(['0', '-1', '1.5', 'ukendt'])(
    'afviser ugyldigt fraværs-ID %s',
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
    },
  );

  it.each(['0', '-1', '2.5', 'ukendt'])(
    'afviser ugyldigt biograf-ID %s',
    (cinemaId) => {
      expect(() =>
        controller.getAllLeaveRequests(
          req,
          cinemaId,
          undefined,
        ),
      ).toThrow(BadRequestException);
    },
  );

  it.each(['1', 'yes', 'TRUE'])(
    'afviser ugyldigt includeAll %s',
    (includeAll) => {
      expect(() =>
        controller.getAllLeaveRequests(
          req,
          undefined,
          includeAll,
        ),
      ).toThrow(BadRequestException);
    },
  );

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

    expect(service.create).toHaveBeenCalledWith(
      req.user,
      body,
    );
  });
});
