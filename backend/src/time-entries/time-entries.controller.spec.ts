import { BadRequestException } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';

describe('TimeEntriesController boundaries', () => {
  const service = {
    findForUser: jest.fn(),
    findAll: jest.fn(),
    findOpenEntry: jest.fn(),
    submitManualEntry: jest.fn(),
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    approveEntry: jest.fn(),
    unapproveEntry: jest.fn(),
    rejectEntry: jest.fn(),
    voidEntry: jest.fn(),
    updateOwnEntry: jest.fn(),
    findRevisionsForEntry: jest.fn(),
    updateEntry: jest.fn(),
  };
  const controller = new TimeEntriesController(
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
    'afviser ugyldigt tidsregistrerings-ID %p',
    (id) => {
      expect(() =>
        controller.approveEntry(
          req,
          id,
          undefined,
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.approveEntry,
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
    'afviser ugyldigt query-biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getEntries(
          req,
          undefined,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '7.5',
    '1e2',
    '+7',
    ' 7',
    '7 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt query-bruger-ID %p',
    (userId) => {
      expect(() =>
        controller.getEntries(
          req,
          userId,
          undefined,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findForUser,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender validerede liste-IDer', () => {
    controller.getEntries(
      req,
      '7',
      '2',
    );

    expect(
      service.findForUser,
    ).toHaveBeenCalledWith(
      7,
      req.user,
      2,
    );
  });

  it('bevarer udeladte listefiltre', () => {
    controller.getEntries(
      req,
      undefined,
      undefined,
    );

    expect(
      service.findAll,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });

  it('normaliserer clock-in body-IDer', () => {
    controller.clockIn(
      req,
      {
        userId: '7',
        cinemaId: '2',
        shiftId: '9',
        clockIn:
          '2026-08-10T08:00:00.000Z',
      } as never,
    );

    expect(
      service.clockIn,
    ).toHaveBeenCalledWith(
      req.user,
      {
        userId: 7,
        cinemaId: 2,
        shiftId: 9,
        clockIn:
          '2026-08-10T08:00:00.000Z',
      },
    );
  });

  it('bevarer null shiftId ved clock-in', () => {
    controller.clockIn(
      req,
      {
        shiftId: null,
      },
    );

    expect(
      service.clockIn,
    ).toHaveBeenCalledWith(
      req.user,
      {
        userId: undefined,
        cinemaId: undefined,
        shiftId: null,
      },
    );
  });

  it.each([
    {
      userId: '1e2',
    },
    {
      cinemaId: ' 2',
    },
    {
      shiftId: 0,
    },
    {
      shiftId:
        Number.MAX_SAFE_INTEGER + 1,
    },
  ])(
    'afviser ugyldige clock-in body-IDer %p',
    (body) => {
      expect(() =>
        controller.clockIn(
          req,
          body as never,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.clockIn,
      ).not.toHaveBeenCalled();
    },
  );

  it('videresender en strikt payroll-bekræftelse', () => {
    controller.approveEntry(
      req,
      '8',
      '2',
      {
        confirmPayrollAdjustment: true,
      },
    );

    expect(
      service.approveEntry,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      2,
      true,
    );
  });

  it.each([
    'true',
    'false',
    1,
    0,
    {},
  ])(
    'afviser ugyldig payroll-bekræftelse %p',
    (confirmPayrollAdjustment) => {
      expect(() =>
        controller.approveEntry(
          req,
          '8',
          undefined,
          {
            confirmPayrollAdjustment,
          } as never,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.approveEntry,
      ).not.toHaveBeenCalled();
    },
  );

  it('bevarer udeladt payroll-bekræftelse som false', () => {
    controller.unapproveEntry(
      req,
      '8',
      undefined,
      undefined,
    );

    expect(
      service.unapproveEntry,
    ).toHaveBeenCalledWith(
      8,
      req.user,
      undefined,
      false,
    );
  });

  it('bruger samme strict IDs på øvrige handlinger', () => {
    controller.clockOut(
      req,
      '8',
      {},
      '2',
    );
    controller.rejectEntry(
      req,
      '8',
      {
        adminNote: 'Afvist',
      },
      '2',
    );
    controller.voidEntry(
      req,
      '8',
      {
        adminNote: 'Annulleret',
        confirmPayrollAdjustment: false,
      },
      '2',
    );
    controller.updateMyEntry(
      req,
      '8',
      {
        clockIn:
          '2026-08-10T08:00:00.000Z',
      },
    );
    controller.getEntryRevisions(
      req,
      '8',
      '2',
    );
    controller.updateEntry(
      req,
      '8',
      {} as never,
      '2',
    );

    expect(
      service.clockOut,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      {},
      2,
    );
    expect(
      service.rejectEntry,
    ).toHaveBeenCalledWith(
      8,
      'Afvist',
      req.user,
      2,
    );
    expect(
      service.voidEntry,
    ).toHaveBeenCalledWith(
      8,
      'Annulleret',
      req.user,
      2,
      false,
    );
    expect(
      service.updateOwnEntry,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      {
        clockIn:
          '2026-08-10T08:00:00.000Z',
      },
    );
    expect(
      service.findRevisionsForEntry,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      2,
    );
    expect(
      service.updateEntry,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      {},
      2,
    );
  });
});
