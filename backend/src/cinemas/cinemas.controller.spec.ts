import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';

describe('CinemasController boundaries', () => {
  const masterReq = {
    user: {
      sub: 1,
      email: 'master@example.com',
      role: 'MASTER',
      cinemaId: null,
    },
  };

  const adminReq = {
    user: {
      sub: 2,
      email: 'admin@example.com',
      role: 'ADMIN',
      cinemaId: 7,
    },
  };

  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    updateLogo: jest.Mock;
    updateSettings: jest.Mock;
  };
  let controller: CinemasController;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      updateLogo: jest.fn(),
      updateSettings: jest.fn(),
    };

    controller = new CinemasController(
      service as unknown as CinemasService,
    );
  });

  it('normalizes a cinema creation', () => {
    controller.create(
      {
        name: '  Kino Nord  ',
      },
      masterReq,
    );

    expect(service.create).toHaveBeenCalledWith({
      name: 'Kino Nord',
    });
  });

  it('allows an administrator to read own cinema', () => {
    controller.findOne('7', adminReq);

    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('rejects cross-cinema reads', () => {
    expect(() =>
      controller.findOne('8', adminReq),
    ).toThrow(ForbiddenException);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema ID %p', (id) => {
    expect(() =>
      controller.findOne(id, masterReq),
    ).toThrow(BadRequestException);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('normalizes valid settings', () => {
    controller.updateSettings(
      '7',
      {
        allowShiftTradePool: true,
        clockInDeviationToleranceMinutes: '15',
        dailyOvertimeThreshold: 8.5,
        payrollPeriodAnchorDate: '2026-07-21',
      },
      adminReq,
    );

    expect(service.updateSettings).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        allowShiftTradePool: true,
        clockInDeviationToleranceMinutes: 15,
        dailyOvertimeThreshold: 8.5,
        payrollPeriodAnchorDate: new Date(
          '2026-07-21T00:00:00.000Z',
        ),
      }),
    );
  });

  it('rejects invalid settings before service call', () => {
    expect(() =>
      controller.updateSettings(
        '7',
        {
          payrollPeriodAnchorDate: '2026-02-30',
        },
        adminReq,
      ),
    ).toThrow(BadRequestException);

    expect(service.updateSettings).not.toHaveBeenCalled();
  });

  it('rejects administrator name changes', () => {
    expect(() =>
      controller.updateSettings(
        '7',
        {
          name: 'Nyt navn',
        },
        adminReq,
      ),
    ).toThrow(BadRequestException);

    expect(service.updateSettings).not.toHaveBeenCalled();
  });

  it('allows master name changes', () => {
    controller.updateSettings(
      '9',
      {
        name: '  Kino Syd  ',
      },
      masterReq,
    );

    expect(service.updateSettings).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        name: 'Kino Syd',
      }),
    );
  });
});
