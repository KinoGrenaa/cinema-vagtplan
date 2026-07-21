import { BadRequestException } from '@nestjs/common';
import { MonthPlansController } from './month-plans.controller';
import { MonthPlansService } from './month-plans.service';

describe('MonthPlansController input validation', () => {
  const req = {
    user: {
      id: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findMonth: jest.Mock;
    findDay: jest.Mock;
    upsertDay: jest.Mock;
  };
  let controller: MonthPlansController;

  beforeEach(() => {
    service = {
      findMonth: jest.fn(),
      findDay: jest.fn(),
      upsertDay: jest.fn(),
    };

    controller = new MonthPlansController(
      service as unknown as MonthPlansService,
    );
  });

  it('normalizes valid month input', () => {
    controller.findMonth(req, '2026', '07', '4');

    expect(service.findMonth).toHaveBeenCalledWith(
      req.user,
      '2026',
      '7',
      '4',
    );
  });

  it.each([
    ['1e3', '7', '4'],
    ['2026.5', '7', '4'],
    ['1999', '7', '4'],
    ['2101', '7', '4'],
    ['2026', '0', '4'],
    ['2026', '13', '4'],
    ['2026', '7', '1e2'],
    ['2026', '7', '9007199254740992'],
  ])(
    'rejects invalid month input',
    (year, month, cinemaId) => {
      expect(() =>
        controller.findMonth(req, year, month, cinemaId),
      ).toThrow(BadRequestException);
      expect(service.findMonth).not.toHaveBeenCalled();
    },
  );

  it.each(['2024-02-29', '2026-07-21'])(
    'accepts valid calendar date %p',
    (date) => {
      controller.findDay(req, date, '3');

      expect(service.findDay).toHaveBeenCalledWith(
        req.user,
        date,
        '3',
      );

      service.findDay.mockClear();
    },
  );

  it.each([
    '',
    '2026-2-01',
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    'tekst',
  ])('rejects invalid calendar date %p', (date) => {
    expect(() => controller.findDay(req, date, '1')).toThrow(
      BadRequestException,
    );
    expect(service.findDay).not.toHaveBeenCalled();
  });

  it('validates and forwards a day update', () => {
    const body = {
      scheduleTemplateId: 6,
      note: 'Sommerplan',
    };

    controller.upsertDay(req, '2026-07-21', body, '5');

    expect(service.upsertDay).toHaveBeenCalledWith(
      req.user,
      '2026-07-21',
      body,
      '5',
    );
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid day cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.upsertDay(
        req,
        '2026-07-21',
        {},
        cinemaId,
      ),
    ).toThrow(BadRequestException);
    expect(service.upsertDay).not.toHaveBeenCalled();
  });
});
