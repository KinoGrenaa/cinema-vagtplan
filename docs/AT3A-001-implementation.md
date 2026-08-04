# AT3A-001 – implementering og migrering

Denne pakke samler jobfunktioner, vagter, tidsregler og den versionsstyrede lønmodel. Den er beregnet til den rene baseline `231d02a6 Add production operations tooling`.

## Hovedændringer

- `JobFunction` er den aktive definition af en vagt.
- Nye vagter og bemandingsforespørgsler bruger `jobFunctionId` og historiske snapshots.
- Tidsreglen ligger direkte på jobfunktionen med tidsrum for filmvisninger, ankre, forskydninger, fallback, valgfri vinduesbegrænsning og kvartersafrunding.
- Jobfunktioner kan kopieres, og den samme `UserJobFunction`-relation administreres fra både jobfunktioner og brugere.
- `WorkType` og `DayPeriod` er read-only legacy-modeller i denne pakke. De fysiske tabeller slettes ikke.
- Eksisterende `PayrollType` videreføres som eksportkode og er ikke en lønregel.
- Biografens lønmodel, medarbejderens timeløn og avancerede tillægsregler er versionsstyrede med halvåbne gyldighedsperioder.
- Låste lønperioder får et uforanderligt beregningssnapshot og en kontrolsum. Eksport læser kun dette snapshot.
- Retroaktive ændringer genberegner åbne perioder og opretter idempotente efterreguleringer for låste eller eksporterede perioder.

## Sikker rækkefølge

Kør fra repository-roden efter udpakning:

```bash
cd backend
npm ci
npm run preflight:at3a -- --json ../at3a-preflight.json --text ../at3a-preflight.txt
npx prisma validate
npx prisma generate
npm test
npm run build
```

Preflight er read-only. Gennemgå både tekst- og JSON-rapporten, før migrationen anvendes. Blokerende fund skal afklares; migrationen må ikke tvinges igennem.

Når preflight er grøn, anvendes migrationen med projektets normale Prisma/Docker-flow. Derefter køres preflight igen og datatællinger sammenlignes.

Kør derefter fra repository-roden:

```bash
cd frontend
npm ci
npm run test:dashboard
npm run build
cd ..
npm run test:frontend-flows
npm run verify:release
```

Brug `npm run verify:release:restart`, når services også skal genskabes og runtime-smoke skal indgå.

## Migreringsprincipper

Migrationen er additiv og deterministisk:

1. Nye tabeller, felter og indekser tilføjes.
2. Jobfunktioner får normaliseret `nameKey`.
3. Entydige WorkType-relationer genbruger den eksisterende jobfunktion.
4. WorkTypes uden jobfunktion får en migreret jobfunktion.
5. Tvetydige WorkTypes får en særskilt migreret jobfunktion i stedet for et gæt.
6. Vagter og bemandingsforespørgsler backfilles med `jobFunctionId`.
7. Dagperioder konverteres til jobfunktionens tidsrum for filmvisninger og faste ankre.
8. `FIRST_MOVIE_ENDLAST_MOVIE_END` migreres som startanker til `FIRST_MOVIE_END` og som slutanker til `LAST_MOVIE_END`.
9. Alle eksisterende biografer starter konservativt i `HOURS_ONLY`.
10. Eksisterende låste/eksporterede perioder får et legacy-snapshot med timer og nul kroner; historisk løn gættes ikke.

Migrationen dropper ikke `WorkType`, `DayPeriod`, legacy-kolonner eller den fysiske `PayrollType`-tabel. Fysisk oprydning hører til en senere, særskilt opgave efter valideret drift.

## Kontroller efter migration

Kontrollér mindst:

- alle vagter og bemandingsforespørgsler har `jobFunctionId`;
- antal vagter, tidsregistreringer, perioder og efterreguleringer er uændret, bortset fra dokumenterede nye snapshots;
- ingen cross-cinema-relationer er opstået;
- låste og eksporterede perioder har en låst beregningskørsel;
- gamle `/work-types`- og `/day-periods`-writes returnerer den kontrollerede udfasningsfejl;
- jobfunktionens medarbejdere er ens fra begge administrationsveje;
- eksport fra en låst periode kan reproduceres fra dens snapshot og kontrolsum.

## Rollback og fejl

Der indgår ingen destruktiv drop-migration. Hvis backfill eller kontrol fejler, stoppes cutover, og fejlen rettes med legacy-data intakte. En låst eller eksporteret lønperiode må aldrig åbnes og omskrives for at skjule en fejl; rettelser håndteres som efterregulering.

## Bevidst uden for pakken

Pakken ændrer ikke FOM, filmscraping, filmbooking, infoskærme, Raspberry Pi-styring, fakturering, hosting, overvågning, backupudbydere eller anden produktionsteknik.
