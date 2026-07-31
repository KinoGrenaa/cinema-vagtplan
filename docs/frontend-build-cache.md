# Frontend build-cache

Frontendens Dockerfile bruger BuildKit-cache mounts til to ting:

- npm-downloadcache på `/root/.npm` i både dependency- og Playwright-staget.
- Next.js' inkrementelle build-cache på `/app/frontend/.next/cache` i build-staget.

Cacheindholdet bruges kun under build og kopieres ikke til standalone-runtime-imaget. Første build kan derfor fortsat vise `No build cache found`; efterfølgende lokale Docker-builds kan genbruge cachen, også når et buildtrin skal køres igen.

GitHub Actions bruger to lag:

- `actions/cache@v4` bevarer `frontend/.next/cache` for det almindelige `npm run build`.
- Docker Buildx importerer og eksporterer særskilte `type=gha`-lagcaches for runtime-imaget og Playwright-flowtest-imaget.

BuildKit cache mounts ikke eksporteres til GitHub Actions-cachen som standard. Derfor fremskynder `type=gha` især uændrede Docker-lag, mens Next.js' inkrementelle cache i CI dækkes af det almindelige host-build. Projektet bruger bevidst ikke en tredjeparts cache-dance-action til at flytte cache mounts ind og ud af CI.

Kontrollér konfigurationen fra repo-roden:

```powershell
npm run check:frontend-build-cache
```

En lokal cache kan ryddes manuelt med Docker Desktop eller `docker builder prune`, men det bør kun gøres ved konkret cachemistanke, da næste build derefter bliver koldt.
