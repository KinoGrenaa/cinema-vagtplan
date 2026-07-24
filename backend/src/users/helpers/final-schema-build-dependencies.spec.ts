import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe(
  'final schema build dependencies',
  () => {
    const seed = readFileSync(
      resolve(
        process.cwd(),
        'prisma/seed.ts',
      ),
      'utf8',
    );
    const scheduleTemplateHelpers =
      readFileSync(
        resolve(
          process.cwd(),
          'src/schedule-templates/helpers/schedule-template-service-helpers.ts',
        ),
        'utf8',
      );
    const membershipRead =
      readFileSync(
        resolve(
          process.cwd(),
          'src/users/helpers/user-cinema-membership-read.ts',
        ),
        'utf8',
      );

    it('opretter seed-brugeren med medlemskab og standardbiograf', () => {
      expect(seed).toContain(
        'defaultCinemaId:',
      );
      expect(seed).toContain(
        'userCinemaMembership.upsert',
      );
      expect(seed).toContain(
        'role: CinemaRole.ADMIN',
      );
      const userUpsertSection =
        seed.slice(
          seed.indexOf(
            'prisma.user.upsert',
          ),
          seed.indexOf(
            'prisma.userCinemaMembership.upsert',
          ),
        );

      expect(
        userUpsertSection,
      ).not.toContain(
        'cinemaId:',
      );
    });

    it('vælger ikke det fjernede User.cinemaId i vagtsskabeloner', () => {
      const includeSection =
        scheduleTemplateHelpers.slice(
          0,
          scheduleTemplateHelpers.indexOf(
            'function parseStrictInteger',
          ),
        );

      expect(
        includeSection,
      ).not.toContain(
        'cinemaId: true',
      );
    });

    it('beregner medlemskabslistens gamle hjemmebiograf-alias fra standardbiografen', () => {
      expect(
        membershipRead,
      ).toContain(
        'defaultCinemaId: true',
      );
      expect(
        membershipRead,
      ).toContain(
        'user.defaultCinemaId',
      );
      expect(
        membershipRead,
      ).not.toContain(
        'user.cinemaId',
      );
    });
  },
);
