import { BadRequestException } from '@nestjs/common';
import { MovieShowingsController } from './movie-showings.controller';
import { MovieShowingsService } from './movie-showings.service';

describe('MovieShowingsController', () => {
  const service = {
    findAll: jest.fn(),
  };
  const controller =
    new MovieShowingsController(
      service as unknown as MovieShowingsService,
    );
  const req = {
    user: {
      sub: 7,
      role: 'EMPLOYEE',
      cinemaId: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['0', '-1', '1.5', 'ukendt'])(
    'afviser ugyldigt biograf-ID %s',
    (cinemaId) => {
      expect(() =>
        controller.getAllMovieShowings(
          req,
          '2026-07-21',
          cinemaId,
        ),
      ).toThrow(BadRequestException);
    },
  );

  it('videresender dato og biografkontekst', () => {
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

  it('tillader manglende valgfri biograf', () => {
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
