import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController boundaries', () => {
  let service: {
    login: jest.Mock;
    switchCinema: jest.Mock;
    getCinemaStartOverview: jest.Mock;
    getDefaultCinemaOptions: jest.Mock;
    updateDefaultCinema: jest.Mock;
  };
  let controller: AuthController;

  beforeEach(() => {
    service = {
      login: jest.fn(),
      switchCinema: jest.fn(),
      getCinemaStartOverview: jest.fn(),
      getDefaultCinemaOptions: jest.fn(),
      updateDefaultCinema: jest.fn(),
    };

    controller = new AuthController(
      service as unknown as AuthService,
    );
  });

  it('forwards valid login input unchanged', () => {
    controller.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(service.login).toHaveBeenCalledWith(
      'user@example.com',
      'password123',
    );
  });

  it('normalizes valid switch-cinema input', () => {
    controller.switchCinema(
      {
        user: {
          sub: '7',
        },
      },
      {
        cinemaId: '3' as unknown as number,
      },
    );

    expect(service.switchCinema).toHaveBeenCalledWith(
      7,
      3,
    );
  });

  it('forwards the authenticated user to the cinema start overview', () => {
    controller.getCinemaStartOverview({
      user: {
        sub: '7',
      },
    });

    expect(
      service.getCinemaStartOverview,
    ).toHaveBeenCalledWith(7);
  });

  it('uses fallback authenticated user ID', () => {
    controller.getDefaultCinemaOptions({
      user: {
        id: '8',
      },
    });

    expect(
      service.getDefaultCinemaOptions,
    ).toHaveBeenCalledWith(8);
  });

  it('allows MASTER to clear default cinema', () => {
    controller.updateDefaultCinema(
      {
        user: {
          sub: 7,
        },
      },
      {
        cinemaId: null,
      },
    );

    expect(
      service.updateDefaultCinema,
    ).toHaveBeenCalledWith(7, null);
  });

  it('normalizes a valid default cinema ID', () => {
    controller.updateDefaultCinema(
      {
        user: {
          sub: 7,
        },
      },
      {
        cinemaId: '4' as unknown as number,
      },
    );

    expect(
      service.updateDefaultCinema,
    ).toHaveBeenCalledWith(7, 4);
  });

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '9007199254740992',
  ])('rejects invalid authenticated user ID %p', (sub) => {
    expect(() =>
      controller.getDefaultCinemaOptions({
        user: {
          sub,
        },
      }),
    ).toThrow(ForbiddenException);

    expect(
      service.getDefaultCinemaOptions,
    ).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '9007199254740992',
  ])('rejects invalid switch cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.switchCinema(
        {
          user: {
            sub: 7,
          },
        },
        {
          cinemaId: cinemaId as number,
        },
      ),
    ).toThrow(BadRequestException);

    expect(service.switchCinema).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    '9007199254740992',
  ])('rejects invalid default cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.updateDefaultCinema(
        {
          user: {
            sub: 7,
          },
        },
        {
          cinemaId: cinemaId as number,
        },
      ),
    ).toThrow(BadRequestException);

    expect(
      service.updateDefaultCinema,
    ).not.toHaveBeenCalled();
  });
});
