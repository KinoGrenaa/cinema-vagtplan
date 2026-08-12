import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.$transaction(
    async (tx) =>
      tx.$queryRaw(
        Prisma.sql`
          SELECT CAST(COUNT(*) AS integer) AS "lockAcquired"
          FROM pg_advisory_xact_lock(
            CAST(53001 AS integer),
            CAST(2147483000 AS integer)
          )
        `,
      ),
  );

  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    rows[0]?.lockAcquired !== 1
  ) {
    throw new Error(
      `Uventet advisory-lock-resultat: ${JSON.stringify(rows)}`,
    );
  }

  console.log(
    "Advisory-lock probe OK: PostgreSQL-låsen kan udføres og deserialiseres som integer.",
  );
} finally {
  await prisma.$disconnect();
}
