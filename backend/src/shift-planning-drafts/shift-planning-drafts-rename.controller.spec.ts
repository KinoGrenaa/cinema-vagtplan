import { BadRequestException } from '@nestjs/common';
import { ShiftPlanningDraftsController } from './shift-planning-drafts.controller';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

describe('ShiftPlanningDraftsController rename', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let renameNamedDraft: jest.Mock;
  let controller: ShiftPlanningDraftsController;

  beforeEach(() => {
    renameNamedDraft = jest.fn();
    controller = new ShiftPlanningDraftsController(
      {
        renameNamedDraft,
      } as unknown as ShiftPlanningDraftsService,
    );
  });

  it('normalizes rename input and forwards name and cinema', () => {
    controller.renameNamedDraft(
      req,
      '8',
      {
        name: 'Nyt kladdenavn',
        cinemaId: '3',
      },
      undefined,
    );

    expect(renameNamedDraft).toHaveBeenCalledWith(req.user, 8, {
      name: 'Nyt kladdenavn',
      cinemaId: 3,
    });
  });

  it.each(['', '1.5', '1e2', '-1', 'abc', '9007199254740992'])(
    'rejects invalid draft ID %p',
    (id) => {
      expect(() =>
        controller.renameNamedDraft(
          req,
          id,
          {
            name: 'Nyt navn',
          },
          '3',
        ),
      ).toThrow(BadRequestException);

      expect(renameNamedDraft).not.toHaveBeenCalled();
    },
  );

  it.each([12, {}, [], true])(
    'rejects invalid rename name %p',
    (name) => {
      expect(() =>
        controller.renameNamedDraft(
          req,
          '8',
          {
            name,
          },
          '3',
        ),
      ).toThrow(BadRequestException);

      expect(renameNamedDraft).not.toHaveBeenCalled();
    },
  );
});
