# Backend dependency- og Docker-hardening

Denne pakke skelner konsekvent mellem det, der leveres i backendens runtime-image, og det der kun bruges til build, test og lint.

## Runtime

- Docker bygger reproducerbart med `npm ci` i et dependency-stage.
- Prisma Client genereres i build-kæden og kopieres med de prunede produktionsafhængigheder.
- Runtime-staget indeholder ikke Jest, Prisma CLI, TypeScript, ts-node eller Nest CLI.
- Det hurtige `/opt/backend-dist` -> `/app/runtime-dist` startflow fra `521de06a` er bevaret.
- Produktionsaudit (`npm audit --omit=dev --audit-level=low`) er en blokerende release-gate og skal have nul fund.

## ExcelJS og Archiver

ExcelJS 4.4.0 forventer CommonJS-kontrakten `Archiver('zip', options)`. Archiver 8 er ESM og eksporterer i stedet `ZipArchive`, `TarArchive` og `JsonArchive` som klasser.

`backend/vendor/archiver-compat` er derfor en lille lokal adapter, der:

1. installeres som modulet `archiver`, så ExcelJS ikke skal patches,
2. bevarer den gamle factory-kontrakt,
3. bruger `archiver@8.0.0` under aliaset `archiver-modern`,
4. trækker `readdir-glob@3.0.0`, `minimatch@10.2.6` og `brace-expansion@5.0.8` ind,
5. bygger ExcelJS 4's ældre `StreamBuf` over i en native `PassThrough` **før** Archiver normaliserer inputtet. `StreamBuf.pipe()` registrerer destinationen, men returnerer ikke destinationen som en normal Node-stream; uden broen bliver Archivers normaliserede kilde derfor `undefined`.

Jest 30 bruger sin egen modul-loader og kan ikke parse Archiver 8's rene ESM-entrypoint, når ExcelJS importeres. Unit- og e2e-konfigurationerne mapper derfor kun modulet `archiver` til `backend/test-support/archiver-jest-shim.cjs`. Shimmet gør det muligt at teste den almindelige løn-XLSX-eksport uden at skjule streamingadfærd.

Den rigtige adapter, stream-broen og ExcelJS streaming writer testes separat med almindelig Node gennem `npm run test:xlsx-hardening`. Denne kommando kører både Jest-regressionen for løneksporten og den reelle streaming-regression i `backend/scripts/check-exceljs-streaming.mjs`. Den er integreret i lokalt releaseflow og GitHub Actions.

Dermed fjernes runtime-kæden med `archiver-utils`, gammel `glob`, `inflight` og sårbar `brace-expansion` uden `npm audit fix --force`, samtidig med at testmiljøet ikke forsøger at fortolke Archiver 8 som CommonJS.

## DevDependencies

Den samlede audit køres fortsat som en synlig rapport. Fund, der kun ligger i Jest, ESLint, Nest CLI eller deres dæknings-/glob-værktøjer, blokerer ikke produktion, fordi de ikke kopieres til runtime-imaget. De må ikke skjules: `npm run audit:report` viser totaler, mens `npm run audit:all` kan bruges til den fulde manuelle rapport.

En major override af gamle dev-værktøjers `minimatch`/`brace-expansion` er bevidst undladt, fordi det ville ændre deres runtime-kontrakt uden en sikker upstream-opgradering.

## Prisma

`PrismaService` registreres kun i den globale `PrismaModule`. Feature-modulerne genbruger denne singleton, så backend ikke opretter fem Prisma-klienter ved opstart.


## Prisma optional peers in runtime

`@prisma/client` declares `prisma` and `typescript` as optional peer dependencies. Because the same packages are root `devDependencies`, npm marks them as `devOptional`. In this graph, `--omit=dev --omit=peer` is not sufficient: npm still materializes the `devOptional` packages. The production-dependency stage therefore performs a fresh `npm ci --omit=dev --omit=peer --omit=optional` and then copies only the generated `node_modules/.prisma` directory from the dependency stage. This keeps Prisma CLI, TypeScript and their optional-only dependency closure out of the runtime image while preserving Prisma Client and the fast `/opt/backend-dist` startup seed.

The runtime-image regression verifies that Prisma Client, bcrypt and ExcelJS streaming still work after optional packages are omitted.
