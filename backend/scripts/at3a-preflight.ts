import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

type CountRow = { count: number };
type IdRow = { id: number; cinemaId?: number; name?: string; detail?: string };
type WorkTypeMappingRow = {
  cinemaId: number;
  workTypeId: number;
  workTypeName: string;
  jobFunctionCount: number;
  shiftCount: number;
  staffingRequestCount: number;
};

type PreflightReport = {
  generatedAt: string;
  mode: 'READ_ONLY';
  summary: Record<string, number>;
  workTypeMappings: WorkTypeMappingRow[];
  findings: Record<string, IdRow[]>;
  blockers: Array<{ code: string; count: number; message: string }>;
};

function parseOutputArgument(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} kræver en filsti.`);
  }
  return resolve(value);
}

async function writeOutput(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

function formatTextReport(report: PreflightReport) {
  const lines = [
    'AT3A-001 migrations-preflight',
    `Genereret: ${report.generatedAt}`,
    'Tilstand: READ_ONLY',
    '',
    'Oversigt',
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'Vagttype-mapping',
    ...report.workTypeMappings.map(
      (row) =>
        `- Biograf ${row.cinemaId}, WorkType #${row.workTypeId} “${row.workTypeName}”: ` +
        `${row.jobFunctionCount} jobfunktion(er), ${row.shiftCount} vagt(er), ` +
        `${row.staffingRequestCount} bemandingsforespørgsel/forespørgsler`,
    ),
    '',
    'Fund',
    ...Object.entries(report.findings).flatMap(([key, rows]) => [
      `- ${key}: ${rows.length}`,
      ...rows.slice(0, 50).map((row) => `  - ${JSON.stringify(row)}`),
      ...(rows.length > 50 ? [`  - … ${rows.length - 50} yderligere`] : []),
    ]),
    '',
    'Blokeringer',
    ...(report.blockers.length
      ? report.blockers.map(
          (blocker) => `- ${blocker.code} (${blocker.count}): ${blocker.message}`,
        )
      : ['- Ingen']),
    '',
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const report = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

      const query = async <TRow>(sql: string): Promise<TRow[]> =>
        (await tx.$queryRawUnsafe(sql)) as TRow[];

      const count = async (table: string) => {
        const rows = await query<CountRow>(
          `SELECT count(*)::int AS count FROM "${table}"`,
        );
        return rows[0]?.count ?? 0;
      };

      const [
        cinemaCount,
        jobFunctionCount,
        workTypeCount,
        dayPeriodCount,
        shiftCount,
        staffingRequestCount,
        payrollTypeCount,
        payrollPeriodCount,
        payrollAdjustmentCount,
      ] = await Promise.all([
        count('Cinema'),
        count('JobFunction'),
        count('WorkType'),
        count('DayPeriod'),
        count('Shift'),
        count('StaffingRequest'),
        count('PayrollType'),
        count('PayrollPeriod'),
        count('PayrollAdjustment'),
      ]);

      const workTypeMappings = await query<WorkTypeMappingRow>(`
        SELECT
          wt."cinemaId",
          wt."id" AS "workTypeId",
          wt."name" AS "workTypeName",
          count(DISTINCT jf."id")::int AS "jobFunctionCount",
          count(DISTINCT s."id")::int AS "shiftCount",
          count(DISTINCT sr."id")::int AS "staffingRequestCount"
        FROM "WorkType" wt
        LEFT JOIN "JobFunction" jf
          ON jf."workTypeId" = wt."id" AND jf."cinemaId" = wt."cinemaId"
        LEFT JOIN "Shift" s ON s."workTypeId" = wt."id"
        LEFT JOIN "StaffingRequest" sr ON sr."workTypeId" = wt."id"
        GROUP BY wt."cinemaId", wt."id", wt."name"
        ORDER BY wt."cinemaId", wt."id"
      `);

      const findings: Record<string, IdRow[]> = {
        workTypesWithoutJobFunction: workTypeMappings
          .filter((row) => row.jobFunctionCount === 0)
          .map((row) => ({
            id: row.workTypeId,
            cinemaId: row.cinemaId,
            name: row.workTypeName,
          })),
        workTypesWithMultipleJobFunctions: workTypeMappings
          .filter((row) => row.jobFunctionCount > 1)
          .map((row) => ({
            id: row.workTypeId,
            cinemaId: row.cinemaId,
            name: row.workTypeName,
            detail: `${row.jobFunctionCount} jobfunktioner`,
          })),
        jobFunctionsWithoutWorkType: await query<IdRow>(`
          SELECT "id", "cinemaId", "name"
          FROM "JobFunction"
          WHERE "workTypeId" IS NULL
          ORDER BY "cinemaId", "id"
        `),
        duplicateJobFunctionNames: await query<IdRow>(`
          SELECT min("id") AS id, "cinemaId", lower(regexp_replace(btrim("name"), '\\s+', ' ', 'g')) AS name,
                 count(*)::text AS detail
          FROM "JobFunction"
          GROUP BY "cinemaId", lower(regexp_replace(btrim("name"), '\\s+', ' ', 'g'))
          HAVING count(*) > 1
          ORDER BY "cinemaId", lower(regexp_replace(btrim("name"), '\\s+', ' ', 'g'))
        `),
        mergedTimingAnchorValues: await query<IdRow>(`
          SELECT "id", "cinemaId",
            CASE
              WHEN "startAnchor"::text = 'FIRST_MOVIE_ENDLAST_MOVIE_END'
                AND "endAnchor"::text = 'FIRST_MOVIE_ENDLAST_MOVIE_END'
                THEN 'start+end'
              WHEN "startAnchor"::text = 'FIRST_MOVIE_ENDLAST_MOVIE_END'
                THEN 'start'
              ELSE 'end'
            END AS detail
          FROM "JobFunctionTimingRule"
          WHERE "startAnchor"::text = 'FIRST_MOVIE_ENDLAST_MOVIE_END'
             OR "endAnchor"::text = 'FIRST_MOVIE_ENDLAST_MOVIE_END'
          ORDER BY "cinemaId", "id"
        `),
        staffingRequestsWithoutMappingSource: await query<IdRow>(`
          SELECT "id", "cinemaId", 'Mangler både shiftId og workTypeId' AS detail
          FROM "StaffingRequest"
          WHERE "shiftId" IS NULL AND "workTypeId" IS NULL
          ORDER BY "cinemaId", "id"
        `),
        crossCinemaShiftWorkTypes: await query<IdRow>(`
          SELECT s."id", s."cinemaId",
                 ('WorkType cinema=' || wt."cinemaId"::text) AS detail
          FROM "Shift" s
          JOIN "WorkType" wt ON wt."id" = s."workTypeId"
          WHERE wt."cinemaId" <> s."cinemaId"
          ORDER BY s."cinemaId", s."id"
        `),
        crossCinemaJobFunctionRelations: await query<IdRow>(`
          SELECT jf."id", jf."cinemaId",
                 concat_ws(', ',
                   CASE WHEN wt."id" IS NOT NULL AND wt."cinemaId" <> jf."cinemaId"
                     THEN 'WorkType cinema=' || wt."cinemaId"::text END,
                   CASE WHEN dp."id" IS NOT NULL AND dp."cinemaId" <> jf."cinemaId"
                     THEN 'DayPeriod cinema=' || dp."cinemaId"::text END
                 ) AS detail
          FROM "JobFunction" jf
          LEFT JOIN "WorkType" wt ON wt."id" = jf."workTypeId"
          LEFT JOIN "DayPeriod" dp ON dp."id" = jf."dayPeriodId"
          WHERE (wt."id" IS NOT NULL AND wt."cinemaId" <> jf."cinemaId")
             OR (dp."id" IS NOT NULL AND dp."cinemaId" <> jf."cinemaId")
          ORDER BY jf."cinemaId", jf."id"
        `),
        invalidUserJobFunctions: await query<IdRow>(`
          SELECT ujf."id", ujf."cinemaId",
                 concat_ws(', ',
                   CASE WHEN jf."cinemaId" <> ujf."cinemaId"
                     THEN 'JobFunction cinema=' || jf."cinemaId"::text END,
                   CASE WHEN membership."id" IS NULL
                     THEN 'Mangler medlemskab' END,
                   CASE WHEN u."role" = 'MASTER'
                     THEN 'MASTER-bruger' END
                 ) AS detail
          FROM "UserJobFunction" ujf
          JOIN "JobFunction" jf ON jf."id" = ujf."jobFunctionId"
          JOIN "User" u ON u."id" = ujf."userId"
          LEFT JOIN "UserCinemaMembership" membership
            ON membership."userId" = ujf."userId"
           AND membership."cinemaId" = ujf."cinemaId"
          WHERE jf."cinemaId" <> ujf."cinemaId"
             OR membership."id" IS NULL
             OR u."role" = 'MASTER'
          ORDER BY ujf."cinemaId", ujf."id"
        `),
        closedEntriesWithoutMembership: await query<IdRow>(`
          SELECT entry."id", entry."cinemaId",
                 ('User #' || entry."userId"::text) AS detail
          FROM "TimeEntry" entry
          JOIN "PayrollPeriod" period ON period."id" = entry."payrollPeriodId"
          LEFT JOIN "UserCinemaMembership" membership
            ON membership."userId" = entry."userId"
           AND membership."cinemaId" = entry."cinemaId"
          WHERE period."status" IN ('LOCKED', 'EXPORTED')
            AND membership."id" IS NULL
          ORDER BY entry."cinemaId", entry."id"
        `),
      };

      const closedPeriods = await query<CountRow>(`
        SELECT count(*)::int AS count
        FROM "PayrollPeriod"
        WHERE "status" IN ('LOCKED', 'EXPORTED')
      `);

      const blockers = [
        {
          code: 'DUPLICATE_JOB_FUNCTION_NAMES',
          rows: findings.duplicateJobFunctionNames,
          message: 'Normaliserede jobfunktionsnavne er ikke unikke inden for biografen.',
        },
        {
          code: 'STAFFING_REQUEST_WITHOUT_MAPPING_SOURCE',
          rows: findings.staffingRequestsWithoutMappingSource,
          message: 'Bemandingsforespørgsler uden vagt eller vagttype kan ikke migreres deterministisk.',
        },
        {
          code: 'CROSS_CINEMA_SHIFT_WORK_TYPE',
          rows: findings.crossCinemaShiftWorkTypes,
          message: 'En eller flere vagter refererer til en vagttype i en anden biograf.',
        },
        {
          code: 'CROSS_CINEMA_JOB_FUNCTION_RELATION',
          rows: findings.crossCinemaJobFunctionRelations,
          message: 'En jobfunktion har en legacy-relation til en anden biograf.',
        },
        {
          code: 'INVALID_USER_JOB_FUNCTION',
          rows: findings.invalidUserJobFunctions,
          message: 'En medarbejderrelation mangler medlemskab, krydser biograf eller peger på MASTER.',
        },
        {
          code: 'CLOSED_ENTRY_WITHOUT_MEMBERSHIP',
          rows: findings.closedEntriesWithoutMembership,
          message: 'En afsluttet lønpost mangler biografmedlemskab til legacy-snapshot.',
        },
      ]
        .filter((item) => item.rows.length > 0)
        .map(({ code, rows, message }) => ({ code, count: rows.length, message }));

      return {
        generatedAt: new Date().toISOString(),
        mode: 'READ_ONLY' as const,
        summary: {
          cinemas: cinemaCount,
          jobFunctions: jobFunctionCount,
          workTypes: workTypeCount,
          dayPeriods: dayPeriodCount,
          shifts: shiftCount,
          staffingRequests: staffingRequestCount,
          payrollTypes: payrollTypeCount,
          payrollPeriods: payrollPeriodCount,
          closedPayrollPeriods: closedPeriods[0]?.count ?? 0,
          payrollAdjustments: payrollAdjustmentCount,
        },
        workTypeMappings,
        findings,
        blockers,
      } satisfies PreflightReport;
    });

    const json = `${JSON.stringify(report, null, 2)}\n`;
    const text = formatTextReport(report);
    const jsonPath = parseOutputArgument('--json');
    const textPath = parseOutputArgument('--text');

    if (jsonPath) await writeOutput(jsonPath, json);
    if (textPath) await writeOutput(textPath, text);

    process.stdout.write(text);
    if (jsonPath) process.stdout.write(`JSON: ${jsonPath}\n`);
    if (textPath) process.stdout.write(`Tekst: ${textPath}\n`);

    if (report.blockers.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`AT3A-preflight fejlede: ${message}\n`);
  process.exitCode = 1;
});
