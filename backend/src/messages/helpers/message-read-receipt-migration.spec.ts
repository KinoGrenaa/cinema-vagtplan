import {
  readFileSync,
} from 'node:fs';

describe('message read receipt relevance migration', () => {
  const schema =
    readFileSync(
      'prisma/schema.prisma',
      'utf8',
    );
  const migration =
    readFileSync(
      'prisma/migrations/20260907080500_message_read_receipts/migration.sql',
      'utf8',
    );

  it('bevarer recipient-rækker og markerer permanent udtræden fra læsekvitteringen', () => {
    expect(
      schema,
    ).toMatch(
      /receiptExcludedAt\s+DateTime\?/,
    );
    expect(
      migration,
    ).toContain(
      'receiptExcludedAt',
    );
    expect(
      migration,
    ).toContain(
      'OLD."isActive" = TRUE AND NEW."isActive" = FALSE',
    );
    expect(
      migration,
    ).toContain(
      "TG_OP = 'DELETE'",
    );
    expect(
      migration,
    ).toContain(
      'UserCinemaMembership_exclude_message_receipts',
    );
    expect(
      migration,
    ).toContain(
      'User_exclude_message_receipts',
    );
  });

  it('genaktivering nulstiller ikke gamle receipt-ekskluderinger', () => {
    expect(
      migration,
    ).not.toMatch(
      /SET\s+"receiptExcludedAt"\s*=\s*NULL/i,
    );
  });
});
