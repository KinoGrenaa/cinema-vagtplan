import { BadRequestException } from '@nestjs/common';
import { ShiftPlanningDraftsController } from './shift-planning-drafts.controller';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

describe('ShiftPlanningDraftsController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findMonth: jest.Mock;
    prepareMonth: jest.Mock;
    validateDraft: jest.Mock;
    deleteDraft: jest.Mock;
    findOne: jest.Mock;
  };
  let controller: ShiftPlanningDraftsController;

  beforeEach(() => {
    service = {
      findMonth: jest.fn(),
      prepareMonth: jest.fn(),
      validateDraft: jest.fn(),
      deleteDraft: jest.fn(),
      findOne: jest.fn(),
    };

    controller = new ShiftPlanningDraftsController(
      service as unknown as ShiftPlanningDraftsService,
    );
  });

  it('normalizes valid month-list input', () => {
    controller.findMonth(req, '2026', '7', '4');

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
    'rejects invalid month-list input',
    (year, month, cinemaId) => {
      expect(() =>
        controller.findMonth(req, year, month, cinemaId),
      ).toThrow(BadRequestException);
      expect(service.findMonth).not.toHaveBeenCalled();
    },
  );

  it('uses body values before query values when preparing', () => {
    controller.prepareMonth(
      req,
      {
        year: '2027',
        month: '8',
        cinemaId: '5',
        note: 'Test',
      },
      '2026',
      '7',
      '4',
    );

    expect(service.prepareMonth).toHaveBeenCalledWith(req.user, {
      year: 2027,
      month: 8,
      cinemaId: 5,
      note: 'Test',
    });
  });

  it('allows a null prepare note', () => {
    controller.prepareMonth(
      req,
      {
        year: '2027',
        month: '8',
        cinemaId: '5',
        note: null,
      },
      '2026',
      '7',
      '4',
    );

    expect(service.prepareMonth).toHaveBeenCalledWith(req.user, {
      year: 2027,
      month: 8,
      cinemaId: 5,
      note: null,
    });
  });

  it('uses query values when prepare body omits them', () => {
    controller.prepareMonth(
      req,
      {
        note: 'Test',
      },
      '2026',
      '7',
      '4',
    );

    expect(service.prepareMonth).toHaveBeenCalledWith(req.user, {
      note: 'Test',
      year: 2026,
      month: 7,
      cinemaId: 4,
    });
  });

  it.each(['tekst', [], 12])(
    'rejects invalid prepare body %p',
    (body) => {
      expect(() =>
        controller.prepareMonth(
          req,
          body,
          '2026',
          '7',
          '4',
        ),
      ).toThrow(BadRequestException);
      expect(service.prepareMonth).not.toHaveBeenCalled();
    },
  );

  it.each([12, {}, [], true])(
    'rejects invalid prepare note %p',
    (note) => {
      expect(() =>
        controller.prepareMonth(
          req,
          {
            note,
          },
          '2026',
          '7',
          '4',
        ),
      ).toThrow(BadRequestException);
      expect(service.prepareMonth).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['1e3', '7', '4'],
    ['2026', '1.5', '4'],
    ['2026', '7', '-1'],
  ])(
    'rejects invalid prepare period or cinema',
    (year, month, cinemaId) => {
      expect(() =>
        controller.prepareMonth(
          req,
          {},
          year,
          month,
          cinemaId,
        ),
      ).toThrow(BadRequestException);
      expect(service.prepareMonth).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['validateDraft', 'validateDraft'],
    ['deleteDraft', 'deleteDraft'],
    ['findOne', 'findOne'],
  ] as const)(
    'normalizes valid IDs for %s',
    (methodName, serviceMethodName) => {
      controller[methodName](req, '8', '3');

      expect(service[serviceMethodName]).toHaveBeenCalledWith(
        req.user,
        8,
        '3',
      );
    },
  );

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid draft ID %p', (id) => {
    expect(() => controller.findOne(req, id, '1')).toThrow(
      BadRequestException,
    );
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid draft cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.validateDraft(req, '2', cinemaId),
    ).toThrow(BadRequestException);
    expect(service.validateDraft).not.toHaveBeenCalled();
  });
});
