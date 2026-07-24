import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe(
  'final auth user schema preparation',
  () => {
    const authService =
      readFileSync(
        resolve(
          process.cwd(),
          'src/auth/auth.service.ts',
        ),
        'utf8',
      );
    const defaultCinemaFlow =
      readFileSync(
        resolve(
          process.cwd(),
          'src/auth/helpers/auth-default-cinema-flow.ts',
        ),
        'utf8',
      );

    it('bruger ikke længere User.cinemaId i auth-service', () => {
      expect(
        authService,
      ).not.toContain(
        'user.cinemaId',
      );
      expect(
        authService,
      ).not.toContain(
        'formerPrimaryMembership',
      );
      expect(
        authService,
      ).not.toContain(
        'cinemaId: number | null;\n  defaultCinemaId?:',
      );
    });

    it('beregner gamle API-aliaser fra standardbiografen', () => {
      expect(
        authService,
      ).toContain(
        'homeCinemaId:\n        user.defaultCinemaId',
      );
      expect(
        authService,
      ).toContain(
        'isHomeCinema:\n          cinema.id === user.defaultCinemaId',
      );
      expect(
        authService,
      ).toContain(
        'isPrimaryCinema:\n        user.defaultCinemaId === cinemaId',
      );
    });

    it('læser ikke legacy cinemaId ved ændring af standardbiograf', () => {
      expect(
        defaultCinemaFlow,
      ).not.toContain(
        'cinemaId: true',
      );
      expect(
        defaultCinemaFlow,
      ).toContain(
        'defaultCinemaId: cinemaId',
      );
    });
  },
);
