import { BadRequestException, GoneException } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

describe('PayrollController input validation', () => {
  const req = {
    user: {
      sub: 10,
      email: 'master@example.com',
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    getPayrollReport: jest.Mock;
    getPeriod: jest.Mock;
    getPayrollPeriodForDate: jest.Mock;
    getPayrollAuditHistory: jest.Mock;
    lockPeriod: jest.Mock;
    unlockPeriod: jest.Mock;
    unlockTimeEntry: jest.Mock;
    exportPayrollCsv: jest.Mock;
    exportPayrollXlsx: jest.Mock;
    exportPayrollPdf: jest.Mock;
    exportUnicontaCsv: jest.Mock;
  };
  let controller: PayrollController;

  beforeEach(() => {
    service = {
      getPayrollReport: jest.fn(),
      getPeriod: jest.fn(),
      getPayrollPeriodForDate: jest.fn(),
      getPayrollAuditHistory: jest.fn(),
      lockPeriod: jest.fn(),
      unlockPeriod: jest.fn(),
      unlockTimeEntry: jest.fn(),
      exportPayrollCsv: jest.fn(),
      exportPayrollXlsx: jest.fn(),
      exportPayrollPdf: jest.fn(),
      exportUnicontaCsv: jest.fn(),
    };

    controller = new PayrollController(
      service as unknown as PayrollService,
    );
  });

  it('normalizes valid report input', () => {
    controller.getPayrollReport(
      req,
      '2026-06-21',
      '2026-07-20',
      '8',
      '4',
    );

    expect(service.getPayrollReport).toHaveBeenCalledWith(
      req.user,
      '2026-06-21',
      '2026-07-20',
      '8',
      4,
    );
  });

  it('normalizes a valid reference date', () => {
    controller.getPeriodForDate(req, '2024-02-29', '3');

    expect(
      service.getPayrollPeriodForDate,
    ).toHaveBeenCalledWith(req.user, '2024-02-29', 3);
  });

  it('normalizes a valid lock request', () => {
    controller.lockPeriod(
      req,
      '2026-06-21',
      '2026-07-20',
      '5',
    );

    expect(service.lockPeriod).toHaveBeenCalledWith(
      req.user,
      '2026-06-21',
      '2026-07-20',
      5,
    );
  });

  it('allows an omitted lock cinema', () => {
    controller.lockPeriod(
      req,
      '2026-06-21',
      '2026-07-20',
      null,
    );

    expect(service.lockPeriod).toHaveBeenCalledWith(
      req.user,
      '2026-06-21',
      '2026-07-20',
      undefined,
    );
  });

  it('normalizes a valid payroll-period reopen request', () => {
    controller.unlockPeriod(
      req,
      '12',
      'Rettelse efter kontrol',
      '5',
    );

    expect(service.unlockPeriod).toHaveBeenCalledWith(
      req.user,
      12,
      'Rettelse efter kontrol',
      5,
    );
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid payroll-period reopen ID %p',
    (periodId) => {
      expect(() =>
        controller.unlockPeriod(
          req,
          periodId,
          'Rettelse efter kontrol',
          '5',
        ),
      ).toThrow(BadRequestException);
      expect(service.unlockPeriod).not.toHaveBeenCalled();
    },
  );

  it('keeps individual time-entry unlock immutable', () => {
    expect(() => controller.unlockTimeEntry()).toThrow(GoneException);
    expect(service.unlockTimeEntry).not.toHaveBeenCalled();
  });
  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid report user ID %p', (userId) => {
    expect(() =>
      controller.getPayrollReport(
        req,
        '2026-06-21',
        '2026-07-20',
        userId,
        '1',
      ),
    ).toThrow(BadRequestException);
    expect(service.getPayrollReport).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid report cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.getPayrollReport(
        req,
        '2026-06-21',
        '2026-07-20',
        '2',
        cinemaId,
      ),
    ).toThrow(BadRequestException);
    expect(service.getPayrollReport).not.toHaveBeenCalled();
  });

  it.each([
    ['', '2026-07-20'],
    ['2026-06-21', ''],
    ['2026-02-30', '2026-03-01'],
    ['2026-07-21', '2026-07-20'],
  ])(
    'rejects invalid report period %p to %p',
    (startDate, endDate) => {
      expect(() =>
        controller.getPayrollReport(
          req,
          startDate,
          endDate,
          undefined,
          '1',
        ),
      ).toThrow(BadRequestException);
      expect(service.getPayrollReport).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    '2026-2-01',
    '2026-02-30',
    '2025-02-29',
    'tekst',
  ])('rejects invalid reference date %p', (date) => {
    expect(() =>
      controller.getPeriodForDate(req, date, '1'),
    ).toThrow(BadRequestException);
    expect(
      service.getPayrollPeriodForDate,
    ).not.toHaveBeenCalled();
  });

  it('uses normalized dates in CSV export and filename', async () => {
    service.exportPayrollCsv.mockResolvedValue('data');
    const response = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await controller.exportCsv(
      req,
      response as any,
      '2026-06-21',
      '2026-07-20',
      '8',
      '4',
    );

    expect(service.exportPayrollCsv).toHaveBeenCalledWith(
      req.user,
      '2026-06-21',
      '2026-07-20',
      '8',
      4,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="payroll-2026-06-21-til-2026-07-20.csv"',
    );
    expect(response.send).toHaveBeenCalledWith('\uFEFFdata');
  });
});
