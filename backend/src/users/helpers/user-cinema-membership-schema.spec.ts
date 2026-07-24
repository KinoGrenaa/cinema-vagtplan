import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('membership-scoped user fields migration', () => {
  const schema = readFileSync(
    resolve(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    resolve(
      process.cwd(),
      'prisma/migrations/20260724090000_expand_user_cinema_memberships/migration.sql',
    ),
    'utf8',
  );

  it('defines cinema-scoped role, employment and permissions', () => {
    expect(schema).toContain('enum CinemaRole');
    expect(schema).toContain(
      'role                       CinemaRole',
    );
    expect(schema).toContain(
      'employmentType             EmploymentType',
    );
    expect(schema).toContain(
      'canManageSchedule          Boolean',
    );
    expect(schema).toContain(
      'canManageUsers             Boolean',
    );
    expect(schema).toContain(
      'canManagePayroll           Boolean',
    );
    expect(schema).toContain(
      'canManageLeaveRequests     Boolean',
    );
    expect(schema).toContain(
      'canManageCinemaSettings    Boolean',
    );
    expect(schema).toContain(
      'canSendBroadcastMessages   Boolean',
    );
  });

  it('backfills existing memberships without removing legacy fields yet', () => {
    expect(migration).toContain(
      'UPDATE "UserCinemaMembership" AS membership',
    );
    expect(migration).toContain(
      'FROM "User" AS app_user',
    );
    expect(migration).toContain(
      '"employmentType" = app_user."employmentType"',
    );
    expect(migration).toContain(
      '"canManageUsers" = app_user."canManageUsers"',
    );
    expect(migration).not.toContain(
      'DROP COLUMN',
    );
  });
});
