# cinema-vagtplan
## Releasekontrol

Projektet har én samlet lokal releasekontrol fra repo root:

```powershell
npm run verify:release
```

Den fulde kontrol kører:

1. `git diff --check` og repository-hygiejne.
2. Regressionstests for releaseværktøjerne.
3. Hele backend-testsuiten.
4. Backendens målrettede release-regression.
5. Dashboardets frontend-regression.
6. Backend- og frontend-build.

Til den løbende ZIP-workflow kan den hurtige variant bruges:

```powershell
npm run verify:release:quick
```

Den springer kun den fulde backend-testsuite over. Releaseværktøjstests, målrettet release-regression, dashboardtests og begge builds køres stadig.

Kør kontrol, genstart services og udfør aktiv runtime-verifikation:

```powershell
npm run verify:release -- --restart
```

Efter genstart kontrolleres automatisk, at backend og frontend kører, at backend er HTTP-tilgængelig på port 3001, at frontend svarer med 2xx/3xx på port 3000, og at logs fra den aktuelle genstart ikke indeholder nye fatale startupfejl. Backend må svare med en forventet 4xx-status på rodadressen, fordi projektet ikke har en offentlig `/`-route; 5xx-svar afvises fortsat. Runtime-kontrollen venter som standard op til 120 sekunder, da backendens udviklingsserver kan være længe om at kompilere efter genstart. Forventet `SIGTERM`-støj fra selve Docker-genstarten ignoreres.

Runtime-smoke kan også køres separat:

```powershell
npm run check:runtime
```

Kommandoerne bruger Docker Compose som standard. Direkte host-kørsel er også mulig:

```powershell
npm run verify:release -- --host
```

Vis planen uden at udføre den:

```powershell
npm run verify:release -- --list
```

GitHub Actions kører automatisk repository-hygiejne, releaseværktøjstests, backendtests, release-regression, dashboardtests og builds ved push og pull requests mod `main`.
