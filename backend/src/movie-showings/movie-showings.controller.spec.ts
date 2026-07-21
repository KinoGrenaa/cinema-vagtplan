import { BadRequestException } from '@nestjs/common';
import { MovieShowingsController } from './movie-showings.controller';
import { MovieShowingsService } from './movie-showings.service';

describe('MovieShowingsController', () => {
  let service: {
    findAll: jest.Mock;
  };
  let controller: MovieShowingsController;

  const req = {
    user: {
      sub: 7,
      role: 'EMPLOYEE',
      cinemaId: 2,
    },
  };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
    };
    controller = new MovieShowingsController(
      service as unknown as MovieShowingsService,
    );
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.getAllMovieShowings(
          req,
          '2026-07-21',
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('videresender dato og strikt biografkontekst', () => {
    controller.getAllMovieShowings(
      req,
      '2026-07-21',
      '2',
    );

    expect(service.findAll).toHaveBeenCalledWith({
      date: '2026-07-21',
      user: req.user,
      selectedCinemaId: 2,
    });
  });

  it('tillader udeladt valgfri biograf', () => {
    controller.getAllMovieShowings(
      req,
      undefined,
      undefined,
    );

    expect(service.findAll).toHaveBeenCalledWith({
      date: undefined,
      user: req.user,
      selectedCinemaId: undefined,
    });
  });
});
