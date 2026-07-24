import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

function getModelBody(
  schema: string,
  modelName: string,
) {
  const match = schema.match(
    new RegExp(
      `model ${modelName} \\{([\\s\\S]*?)\\n\\}`,
    ),
  );

  if (!match) {
    throw new Error(
      `Prisma-modellen ${modelName} blev ikke fundet`,
    );
  }

  return match[1];
}

describe(
  'final legacy User column migration',
  () => {
    const schema = readFileSync(
      resolve(
        process.cwd(),
        'prisma/schema.prisma',
      ),
      'utf8',
    );
    const migration = readFileSync(
      resolve(
        process.cwd(),
        'prisma/migrations/20260724122000_remove_legacy_user_columns/migration.sql',
      ),
      'utf8',
    );
    const userModel =
      getModelBody(
        schema,
        'User',
      );
    const membershipModel =
      getModelBody(
        schema,
        'UserCinemaMembership',
      );
    const cinemaModel =
      getModelBody(
        schema,
        'Cinema',
      );

    it('bevarer globale konto- og systemfelter', () => {
      expect(userModel).toMatch(
        /^\s*role\s+Role/m,
      );
      expect(userModel).toMatch(
        /^\s*isActive\s+Boolean/m,
      );
      expect(userModel).toMatch(
        /^\s*deactivatedAt\s+DateTime\?/m,
      );
      expect(userModel).toMatch(
        /^\s*defaultCinemaId\s+Int\?/m,
      );
      expect(userModel).toMatch(
        /^\s*defaultCinema\s+Cinema\?/m,
      );
    });

    it('fjerner gamle biograf-, ansættelses- og rettighedsfelter fra User', () => {
      const removedFields = [
        'cinemaId',
        'cinema',
        'hireDate',
        'employeeNumber',
        'payrollEmployeeId',
        'employmentType',
        'canManageSchedule',
        'canManageUsers',
        'canManagePayroll',
        'canManageLeaveRequests',
        'canManageCinemaSettings',
        'canSendBroadcastMessages',
      ];

      for (
        const field of
        removedFields
      ) {
        expect(userModel).not.toMatch(
          new RegExp(
            `^\\s*${field}\\s+`,
            'm',
          ),
        );
      }

      expect(cinemaModel).not.toContain(
        'UserPrimaryCinema',
      );
    });

    it('bevarer alle biografspecifikke felter på medlemskabet', () => {
      const membershipFields = [
        'role',
        'isActive',
        'deactivatedAt',
        'employmentType',
        'hireDate',
        'employeeNumber',
        'payrollEmployeeId',
        'canManageSchedule',
        'canManageUsers',
        'canManagePayroll',
        'canManageLeaveRequests',
        'canManageCinemaSettings',
        'canSendBroadcastMessages',
      ];

      for (
        const field of
        membershipFields
      ) {
        expect(
          membershipModel,
        ).toMatch(
          new RegExp(
            `^\\s*${field}\\s+`,
            'm',
          ),
        );
      }
    });

    it('stopper ved uventede legacy-data og dropper de overflødige kolonner', () => {
      expect(migration).toContain(
        'migration stopped to avoid data loss',
      );
      expect(migration).toContain(
        'resolved_defaults',
      );
      expect(migration).toContain(
        'DROP CONSTRAINT IF EXISTS "User_cinemaId_fkey"',
      );

      for (
        const column of [
          'cinemaId',
          'hireDate',
          'employeeNumber',
          'payrollEmployeeId',
          'employmentType',
          'canManageSchedule',
          'canManageUsers',
          'canManagePayroll',
          'canManageLeaveRequests',
          'canManageCinemaSettings',
          'canSendBroadcastMessages',
        ]
      ) {
        expect(migration).toContain(
          `DROP COLUMN IF EXISTS "${column}"`,
        );
      }
    });
  },
);
