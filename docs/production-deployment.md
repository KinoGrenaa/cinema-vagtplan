# Production deployment med Docker Compose

`docker-compose.production.yml` er en selvstændig produktionsstack. Den almindelige `docker-compose.yml` forbliver udviklings- og releaseværktøjsmiljøet.

## Arkitektur

Kun Caddy publicerer porte. PostgreSQL, migration, backend og frontend er kun tilgængelige på Compose-netværket:

- Caddy: HTTP 80, HTTPS 443 og HTTP/3 på 443/UDP.
- Frontend: intern Next.js standalone på port 3000.
- Backend: intern NestJS/Socket.IO på port 3001.
- PostgreSQL: intern port 5432.
- `migrate`: kører `prisma migrate deploy` og skal afslutte korrekt før backend starter.

Caddy sender Socket.IO og `/uploads` direkte til backend. Mutationer, autoriserede requests og JSON-requests sendes også til backend, mens almindelige HTML-navigationer går til frontend. Det gør `APP_ORIGIN` til én offentlig same-origin-adresse for både browser, API, uploads og realtime.

## Persistens

Stacken bruger separate named volumes:

- `production_postgres_data` til PostgreSQL.
- `production_backend_runtime` til backendens synkroniserede buildoutput.
- `production_uploads` til medarbejderdokumenter, profilbilleder og biograflogoer under `/app/uploads`.
- `production_caddy_data` og `production_caddy_config` til TLS-certifikater og Caddy-tilstand.

Kør aldrig `docker compose down -v` mod den rigtige produktionsstack, medmindre alle data bevidst skal slettes og en verificeret backup er klar.

## Konfiguration og secrets

Kopiér eksemplet og indsæt rigtige værdier:

```powershell
Copy-Item .env.production.example .env.production
```

Generér eksempelvis lange alfanumeriske secrets i PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToHexString($bytes).ToLowerInvariant()
```

`APP_ORIGIN` og `CADDY_SITE_ADDRESS` skal normalt være samme HTTPS-origin, eksempelvis `https://vagtplan.example.dk`. DNS skal pege på serveren, og firewall/NAT skal tillade 80/TCP, 443/TCP og eventuelt 443/UDP. PostgreSQL, 3000, 3001 og 5555 må ikke åbnes i firewall.

Valider konfigurationen uden at starte noget:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
npm run check:production-compose
```

## Isoleret rehearsal

Kør altid rehearsal før første deployment og efter ændringer i production Compose eller Caddy:

```powershell
npm run production:rehearse
```

Rehearsalen opretter et unikt Compose-projekt med tilfældige lokale porte, en tom database og separate volumes. Den kontrollerer frontend, API, Socket.IO, skjulte interne porte og uploadpersistens gennem en backend-recreate. Til sidst køres `down -v --remove-orphans` kun mod rehearsal-projektet.

## Første deployment

Tag og verificér en backup før ændringer:

```powershell
npm run backup:create -- --output backups/foer-production-cutover
npm run backup:verify -- backups/foer-production-cutover
npm run backup:rehearse -- backups/foer-production-cutover
```

Start derefter stacken:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 migrate backend frontend proxy
```

En eksisterende udviklingsdatabase og eksisterende uploads flyttes ikke automatisk til production-volumes. Cutover skal bruge den dokumenterede backup-/restoreprocedure og må ikke åbne offentlig trafik, før login, biografvalg, uploads og de kritiske flows er verificeret.

## Backup af produktionsstacken

Recovery-scripts bruger `docker compose` og kan målrettes production Compose med de officielle Compose-miljøvariable:

```powershell
$env:COMPOSE_FILE = "docker-compose.production.yml"
$env:COMPOSE_ENV_FILES = ".env.production"

npm run backup:create
npm run backup:verify -- backups/<backupmappe>
npm run backup:rehearse -- backups/<backupmappe>

Remove-Item Env:COMPOSE_FILE
Remove-Item Env:COMPOSE_ENV_FILES
```

Kopiér backupen krypteret off-host og følg retention-, RPO- og RTO-kravene i `docs/data-recovery.md`.

## Opdatering

```powershell
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Migrationen skal være `Exited (0)`, og de fire langkørende services skal blive healthy/running. Gennemgå logs før trafiktesten.

## Rollback

Ved rollback skal databasekompatibilitet vurderes først. En tidligere applikationsversion kan ikke nødvendigvis køre mod en nyere migration.

1. Stop ny trafik eller aktivér vedligeholdelsesvindue.
2. Bevar den aktuelle installation og opret en ny verificeret backup.
3. Gendan den tidligere applikationsversion til et separat Compose-projekt.
4. Brug en kompatibel databasekopi og et matchende uploadvolume.
5. Skift først trafik tilbage efter runtime-smoke, login og kritiske flows er grønne.
