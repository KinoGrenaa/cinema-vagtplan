# cinema-vagtplan
## Releasekontrol

Projektet har én samlet lokal releasekontrol fra repo root:

    npm run verify:release

Den fulde kontrol kører:
1. `git diff --check` og repository-hygiejne.
2. Regressionstests for releaseværktøjerne samt backend- og frontend-hardening.
3. Produktionsaudit og samlet auditrapport for både backendens og frontendens npm-tree.
4. Verifikation af backendens multi-stage runtime-image, produktionsafhængigheder og genererede Prisma Client.
5. Verifikation af frontendens standalone runtime-image, non-root-bruger og fravær af kildekode og devDependencies.
6. Hele backend-testsuiten.
7. Backendens målrettede release-regression.
8. Dashboardets frontend-regression.
9. Backend- og frontend-build.

Til den løbende ZIP-workflow kan den hurtige variant bruges:

    npm run verify:release:quick

Den springer kun den fulde backend-testsuite over. Hardening, audits, runtime-images, releaseværktøjstests, målrettet release-regression, dashboardtests og begge builds køres stadig.

Kør kontrol, recreate services og udfør aktiv runtime-verifikation:

    npm run verify:release -- --restart

Efter recreate kontrolleres automatisk, at backend og frontend kører, at backend er HTTP-tilgængelig på port 3001, at frontend svarer med 2xx/3xx på port 3000, og at logs fra den aktuelle recreate ikke indeholder nye fatale startupfejl. Backend må svare med en forventet 4xx-status på rodadressen, fordi projektet ikke har en offentlig `/`-route; 5xx-svar afvises fortsat. Runtime-kontrollen viser også den målte readiness-tid for hver service og venter som standard op til 120 sekunder.

Forventet `SIGTERM`-støj fra selve Docker-recreate ignoreres. Runtime-smoke kan også køres separat:

    npm run check:runtime

Kommandoerne bruger Docker Compose som standard. Backendtests, audits og build køres i den midlertidige `backend-build`-værktøjsservice. Frontendtests, audits og almindeligt kildekodebuild køres tilsvarende i `frontend-build`, fordi den normale `frontend`-service kun indeholder det færdige standalone runtime-output. Direkte host-kørsel er også mulig:

    npm run verify:release -- --host

Vis planen uden at udføre den:

    npm run verify:release -- --list

GitHub Actions kører automatisk repository-hygiejne, releaseværktøjstests, backend- og frontend-hardening, npm-audits, backendtests, release-regression, runtime-image-verifikation, dashboardtests og builds ved push og pull requests mod `main`.

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

## Frontend-start i Docker

Frontendens Dockerfile er multi-stage og bygges fra repository-roden, så både `frontend` og eventuelle runtime-imports fra `shared` kan indgå i Next.js output tracing. Dependency-stage bruger `npm ci`, build-stage genererer `output: "standalone"`, og runtime-stage kopierer kun standalone-serveren, statiske filer, `public` og det lille container-startscript.

Den normale `frontend`-service har ingen bind mounts og kører som den uprivilegerede bruger `nextjs`. TypeScript, ESLint, Tailwind-buildværktøjer og den øvrige frontendkilde findes ikke i runtime-imaget.

Kør dashboardtests eller et almindeligt frontend-build mod den aktuelle working tree gennem værktøjsservicen:

    docker compose run --rm --no-deps frontend-build npm run test:dashboard
    docker compose run --rm --no-deps frontend-build npm run build

Da `frontend` nu kører det build, der ligger i Docker-imaget, skal frontend genskabes efter enhver frontendkildeændring:

    docker compose up -d --build --force-recreate frontend

`NEXT_PUBLIC_API_URL` er en build-time-værdi i browserbundlen. Hvis den ændres, skal frontend-imaget derfor også bygges og genskabes.
