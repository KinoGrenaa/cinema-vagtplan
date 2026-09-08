import {
  readFileSync,
} from 'node:fs';

describe('message conversation migration', () => {
  const schema = readFileSync(
    'prisma/schema.prisma',
    'utf8',
  );
  const migration = readFileSync(
    'prisma/migrations/20260907090000_message_groups_and_replies/migration.sql',
    'utf8',
  );

  it('giver alle beskeder en stabil samtaleidentitet', () => {
    expect(schema).toMatch(
      /conversationId\s+String\s+@default\(uuid\(\)\)/,
    );
    expect(migration).toContain(
      `SET "conversationId" = 'legacy-' || "id"::text`,
    );
  });

  it('bevarer samtalen hvis den konkrete besked senere fjernes', () => {
    expect(schema).toMatch(
      /replyToMessage\s+Message\?.*onDelete: SetNull/,
    );
    expect(migration).toContain('ON DELETE SET NULL');
  });
});
