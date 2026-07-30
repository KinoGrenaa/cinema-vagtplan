# cinema-vagtplan

## Releasekontrol

Projektet har én samlet lokal releasekontrol fra repo root:

```powershell
npm run verify:release
```

Den fulde kontrol kører:

1. `git diff --check` og repository-hygiejne.
2. Hele backend-testsuiten.
3. Backendens målrettede release-regression.
4. Dashboardets frontend-regression.
5. Backend- og frontend-build.

Til den løbende ZIP-workflow kan den hurtige variant bruges:

```powershell
npm run verify:release:quick
```

Den springer kun den fulde backend-testsuite over. Målrettet release-regression, dashboardtests og begge builds køres stadig.

Kør kontrol, genstart services og vis runtime-logs samlet:

```powershell
npm run verify:release -- --restart
```

Kommandoerne bruger Docker Compose som standard. Direkte host-kørsel er også mulig:

```powershell
npm run verify:release -- --host
```

Vis planen uden at udføre den:

```powershell
npm run verify:release -- --list
```

GitHub Actions kører automatisk repository-hygiejne, backendtests, release-regression, dashboardtests og builds ved push og pull requests mod `main`.
