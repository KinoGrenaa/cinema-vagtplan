import { BadRequestException } from '@nestjs/common';
import { ShiftPlanningDraftPublicationController } from './shift-planning-drafts-publication.controller';
import { ShiftPlanningDraftPublicationService } from './shift-planning-drafts-publication.service';

describe('ShiftPlanningDraftPublicationController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    getPublicationPreview: jest.Mock;
    publishDraft: jest.Mock;
  };
  let controller: ShiftPlanningDraftPublicationController;

  beforeEach(() => {
    service = {
      getPublicationPreview: jest.fn(),
      publishDraft: jest.fn(),
    };

    controller = new ShiftPlanningDraftPublicationController(
      service as unknown as ShiftPlanningDraftPublicationService,
    );
  });

  it('normalizes valid publication preview input', () => {
    controller.getPublicationPreview(req, '8', '3');

    expect(
      service.getPublicationPreview,
    ).toHaveBeenCalledWith(req.user, 8, '3');
  });

  it('normalizes valid publish input and preserves body', () => {
    const body = {
      confirmationText: 'OPRET VAGTER',
      note: 'Månedsplan',
    };

    controller.publishDraft(req, '9', '4', body);

    expect(service.publishDraft).toHaveBeenCalledWith(
      req.user,
      9,
      '4',
      body,
    );
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid publication draft ID %p', (id) => {
    expect(() =>
      controller.getPublicationPreview(req, id, '1'),
    ).toThrow(BadRequestException);
    expect(
      service.getPublicationPreview,
    ).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid publication cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.publishDraft(
        req,
        '2',
        cinemaId,
        {
          confirmationText: 'OPRET VAGTER',
        },
      ),
    ).toThrow(BadRequestException);
    expect(service.publishDraft).not.toHaveBeenCalled();
  });
});
