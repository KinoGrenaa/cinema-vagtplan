import { PrismaClient } from '@prisma/client';
import { buildTemporaryMovieShowingSeedPlan } from '../src/movie-showings/helpers/temporary-movie-showing-seed';

const prisma = new PrismaClient();

function getOption(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();

  return value || undefined;
}

function parsePositiveInteger(value: string | undefined, label: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} skal være et positivt heltal`);
  }

  return parsed;
}

async function main() {
  const cinemaId = parsePositiveInteger(
    getOption('cinema-id'),
    'Biograf-ID',
  );
  const expectedCinemaName = getOption('cinema-name');
  const startDate = getOption('from');
  const dayCount = parsePositiveInteger(getOption('days'), 'Antal dage');
  const apply = process.argv.slice(2).includes('--apply');

  if (!expectedCinemaName) {
    throw new Error(
      'Angiv --cinema-name med biografens præcise navn som sikkerhedskontrol',
    );
  }
  if (!startDate) {
    throw new Error('Angiv --from=ÅÅÅÅ-MM-DD');
  }

  const cinema = await prisma.cinema.findUnique({
    where: {
      id: cinemaId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!cinema) {
    throw new Error(`Biograf ${cinemaId} findes ikke`);
  }
  if (cinema.name !== expectedCinemaName) {
    throw new Error(
      `Biograf ${cinemaId} hedder "${cinema.name}" og ikke "${expectedCinemaName}"`,
    );
  }

  const plan = buildTemporaryMovieShowingSeedPlan({
    cinemaId,
    startDate,
    dayCount,
  });

  console.log('');
  console.log('MIDLERTIDIGE FILMDATA');
  console.log(`Biograf: ${cinema.name} (ID ${cinema.id})`);
  console.log(`Fra dato: ${plan.startDate}`);
  console.log(`Antal dage: ${plan.dayCount}`);
  console.log(`Filmvisninger: ${plan.createData.length}`);
  console.log(
    `Periode i UTC: ${plan.periodStart.toISOString()} til ${plan.periodEndExclusive.toISOString()}`,
  );
  console.log(
    'Kun filmvisninger for denne biograf og denne periode kan blive erstattet.',
  );

  if (!apply) {
    console.log('');
    console.log('DRY RUN: Databasen er ikke ændret.');
    console.log('Tilføj --apply for at gennemføre importen.');
    return;
  }

  const result = await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.movieShowing.deleteMany({
      where: plan.deleteWhere,
    });
    const created = await transaction.movieShowing.createMany({
      data: plan.createData,
    });

    return {
      deleted: deleted.count,
      created: created.count,
    };
  });

  console.log('');
  console.log(`Slettede tidligere rækker i perioden: ${result.deleted}`);
  console.log(`Oprettede midlertidige filmvisninger: ${result.created}`);
  console.log('Andre biografers filmdata er ikke ændret.');
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(`Fejl: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
