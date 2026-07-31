# Kontrolleret production-deploy og rollback

Denne procedure bygger oven på `production:preflight`, production Compose og recoveryværktøjerne. Den ændrer ikke databasen uden den eksisterende `prisma migrate deploy`, og den udfører aldrig automatisk database-restore.

## Før deployment

Repositoryet skal være rent, `.env.production` skal være gyldig, og production-stacken skal være komplet. Brug en dry-run først:

```powershell
npm run production:deploy -- --env-file .env.production --dry-run
```

Ved første deployment findes der ingen live production-data at sikkerhedskopiere. Det skal angives eksplicit efter den dokumenterede cutover- og recovery-rehearsal:

```powershell
npm run production:deploy -- --env-file .env.production --dry-run --first-deploy
npm run production:deploy -- --env-file .env.production --first-deploy
```

`--first-deploy` afvises, hvis production-stacken allerede findes.

## Normal deployment

```powershell
npm run production:deploy -- --env-file .env.production
```

Scriptet udfører i rækkefølge:

1. production-preflight og Git-sikkerhed;
2. identifikation af kørende og ny Git-revision;
3. pre-deploy-backup af PostgreSQL og `/app/uploads`;
4. SHA-256- og arkivverifikation;
5. build af migration-, backend- og frontendimages;
6. `docker compose up -d --remove-orphans`;
7. kontrol af migrationens exitkode og alle healthchecks;
8. smoke af frontend, `/auth/login` og Socket.IO gennem den offentlige origin;
9. `deployment.json` under den Git-ignorerede deploymentmappe.

Et deploymentrecord indeholder revisionskæde, backupsti og ufølsomme smoke-resultater. Secrets skrives ikke til recordet.

Deploymentet kan få en længere ventetid uden at lempe kontrollerne:

```powershell
npm run production:deploy -- --env-file .env.production --timeout-seconds 600
```

## Fejl under deployment

Der udføres ikke automatisk rollback. Det er bevidst, fordi en migration kan gøre en tidligere applikationsversion inkompatibel med databasen.

Ved fejl:

1. bevar pre-deploy-backup, deploymentrecord og logs;
2. undersøg migrationens exitkode og service-health;
3. kør rollback dry-run mod recordet;
4. gennemfør kun applikationsrollback, hvis værktøjet bekræfter identiske Prisma-migrationer.

## Rollback dry-run

```powershell
npm run production:rollback -- `
    --env-file .env.production `
    --record backups/production-deploy-<tid>-<revision>/deployment.json `
    --dry-run
```

En eksplicit Git-revision er kun tilladt ved dry-run:

```powershell
npm run production:rollback -- `
    --env-file .env.production `
    --revision <git-sha> `
    --dry-run
```

## Kontrolleret applikationsrollback

```powershell
npm run production:rollback -- `
    --env-file .env.production `
    --record backups/production-deploy-<tid>-<revision>/deployment.json
```

Rollbackværktøjet:

- kræver at recordets target-revision matcher den kørende revisionslabel;
- verificerer pre-deploy-backuppen igen;
- blokerer hvis `backend/prisma/schema.prisma` eller migrationsfiler er forskellige;
- opretter en ny backup af den aktuelle production-tilstand;
- bygger den tidligere revision i et midlertidigt Git-worktree;
- genbruger production-volumes uden `down -v`;
- venter på healthchecks og kører frontend/API/Socket.IO-smoke;
- skriver et separat rollbackrecord;
- bevarer det aktive rollback-worktree under `backups/`, fordi Caddyfile og Compose-kilde skal forblive tilgængelige for den kørende rollbackversion.

Der udføres **ingen automatisk database-restore**. Hvis Prisma-schema eller migrationer er ændret, skal rollback ske som isoleret recovery/cutover med den verificerede pre-deploy-backup og et matchende uploadarkiv.

## Revisionslabels

Production Compose mærker services med:

```text
com.kinogrenaa.cinema-vagtplan.revision
```

Deployværktøjet sætter labelen til den fulde Git-revision. En stack startet manuelt uden deployværktøjet får `unmanaged`, og automatisk rollback blokeres, indtil revisionen igen er kendt.

## Sikkerhedsregler

- Kør aldrig `docker compose down -v` mod production.
- Commit aldrig `.env.production` eller backupmapper.
- Kopiér verificerede backups krypteret off-host.
- Brug vedligeholdelsesvindue ved migrationer eller forventet nedetid.
- Gem deployment- og rollbackrecords sammen med den relevante backup.
- Fjern først et bevaret rollback-worktree efter et senere vellykket deployment har erstattet rollbackversionen.
