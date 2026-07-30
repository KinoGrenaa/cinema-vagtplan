# cinema-vagtplan

## Releasekontrol

Projektet har én samlet lokal releasekontrol fra repo root:

    npm run verify:release

Den fulde kontrol kører:

1. `git diff --check` og repository-hygiejne.
2. Regressionstests for releaseværktøjerne og backend-hardening.
3. Produktionsaudit samt samlet high/critical-audit for backendens npm-tree.
4. Verifikation af multi-stage runtime-image, produktionsafhængigheder og genereret Prisma Client.
5. Hele backend-testsuiten.
6. Backendens målrettede release-regression.
7. Dashboardets frontend-regression.
8. Backend- og frontend-build.

Til den løbende ZIP-workflow kan den hurtige variant bruges:

    npm run verify:release:quick

Den springer kun den fulde backend-testsuite over. Hardening, audits, runtime-image, releaseværktøjstests, målrettet release-regression, dashboardtests og begge builds køres stadig.

Kør kontrol, genstart services og udfør aktiv runtime-verifikation:

    npm run verify:release -- --restart

Efter genstart kontrolleres automatisk, at backend og frontend kører, at backend er HTTP-tilgængelig på port 3001, at frontend svarer med 2xx/3xx på port 3000, og at logs fra den aktuelle genstart ikke indeholder nye fatale startupfejl. Backend må svare med en forventet 4xx-status på rodadressen, fordi projektet ikke har en offentlig `/`-route; 5xx-svar afvises fortsat. Runtime-kontrollen viser også den målte readiness-tid for hver service og venter som standard op til 120 sekunder.

Forventet `SIGTERM`-støj fra selve Docker-genstarten ignoreres. Runtime-smoke kan også køres separat:

    npm run check:runtime

Kommandoerne bruger Docker Compose som standard. Backendtests, audits og build køres i den midlertidige `backend-build`-værktøjsservice, fordi den almindelige `backend`-service bevidst kun indeholder produktionsafhængigheder. Direkte host-kørsel er også mulig:

    npm run verify:release -- --host

Vis planen uden at udføre den:

    npm run verify:release -- --list

GitHub Actions kører automatisk repository-hygiejne, releaseværktøjstests, dependency-/Docker-hardening, npm-audits, backendtests, release-regression, runtime-image-verifikation, dashboardtests og builds ved push og pull requests mod `main`.

## Backend-start i Docker

Backendens Dockerfile er multi-stage. `dependencies` og `build` indeholder udviklingsværktøjerne, mens `runtime` kun kopierer produktionsafhængigheder fra `production-dependencies`, den genererede Prisma Client og det kompilerede image-seed.

Backendcontaineren starter fortsat fra allerede kompileret JavaScript i en særskilt `backend_dist`-volume monteret på `/app/runtime-dist`. Projektets almindelige buildmappe er fortsat `/app/dist`, så `nest build` frit kan rydde og genskabe outputtet uden at forsøge at slette et aktivt Docker-mountpoint.

Når backendkoden er ændret, køres build i værktøjsservicen og backend genstartes eksplicit:

    docker compose run --rm --no-deps backend-build npm run build
    docker compose restart backend

Efter ændringer i `Dockerfile`, `docker-compose.yml`, dependencies eller containerens startflow skal backend-imaget bygges og containeren genskabes:

    docker compose up -d --build --force-recreate backend

Ved hver containerstart kopieres et aktuelt projektbuild fra `/app/dist` til `/app/runtime-dist`, før Node-processen startes. Hvis projektbuildet mangler, genbruges eksisterende runtime-output; er volumen også tom, initialiseres den fra Docker-imagets seed-kopi af `dist`. `npm run start:dev` er fortsat tilgængelig til direkte watch-udvikling uden for det normale ZIP-/build-/restart-flow.

Backendloggeren viser separat tiden til databaseforbindelse, oprettelse af Nest-applikationen og samlet proces-readiness. Releasekontrollens runtime-smoke viser den eksternt målte HTTP-readiness, så containerstart og selve applikationsinitialiseringen kan sammenlignes.
