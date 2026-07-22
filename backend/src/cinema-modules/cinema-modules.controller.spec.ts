import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CinemaModulesController } from './cinema-modules.controller';

describe('CinemaModulesController', () => {
  const service = {
    findForCinema: jest.fn(),
    updateForCinema: jest.fn(),
  };
  const controller =
    new CinemaModulesController(
      service as never,
    );
  const masterRequest = {
    user: {
      sub: 7,
      email:
        'master@example.com',
      role: 'MASTER',
      cinemaId: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns current cinema modules for ADMIN session cinema', () => {
    controller.findCurrentCinemaModules(
      {
        user: {
          sub: 8,
          email:
            'admin@example.com',
          role: 'ADMIN',
          cinemaId: 2,
        },
      },
    );

    expect(
      service.findForCinema,
    ).toHaveBeenCalledWith(2);
  });

  it('returns current cinema modules for MASTER selected cinema header', () => {
    controller.findCurrentCinemaModules(
      masterRequest,
      '3',
    );

    expect(
      service.findForCinema,
    ).toHaveBeenCalledWith(3);
  });

  it('requires a selected cinema for MASTER current modules', () => {
    expect(() =>
      controller.findCurrentCinemaModules(
        masterRequest,
      ),
    ).toThrow(BadRequestException);
  });

  it('routes normalized module updates for MASTER', () => {
    controller.updateForCinema(
      '2',
      {
        modules: [
          {
            key: 'PAYROLL',
            enabled: false,
          },
        ],
      },
      masterRequest,
    );

    expect(
      service.updateForCinema,
    ).toHaveBeenCalledWith(
      2,
      [
        {
          key: 'PAYROLL',
          enabled: false,
        },
      ],
      7,
    );
  });

  it('rejects non-master users', () => {
    expect(() =>
      controller.findForCinema(
        '2',
        {
          user: {
            ...masterRequest.user,
            role: 'ADMIN',
            cinemaId: 2,
          },
        },
      ),
    ).toThrow(ForbiddenException);
  });

  it.each([
    '0',
    '-1',
    '1e2',
    '2.5',
    ' 2',
    '2 ',
  ])(
    'rejects invalid cinema ID %p',
    (cinemaId) => {
      expect(() =>
        controller.findForCinema(
          cinemaId,
          masterRequest,
        ),
      ).toThrow(
        BadRequestException,
      );
    },
  );
});
