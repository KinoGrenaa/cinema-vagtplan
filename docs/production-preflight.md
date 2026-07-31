# Production-preflight og secrets

Denne kontrol skal køres før første production deployment og efter ændringer i domæne, TLS, database-login eller applikationssecrets. Den starter ikke produktionsstacken og ændrer ingen volumes.

## Opret den rigtige miljøfil

Kopiér eksemplet og erstat alle eksempelværdier:

```powershell
Copy-Item .env.production.example .env.production
```

Generér separate tilfældige værdier til `POSTGRES_PASSWORD` og `JWT_SECRET`. Genbrug ikke samme secret til flere formål:

```powershell
function New-HexSecret([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    [Convert]::ToHexString($buffer).ToLowerInvariant()
}

$postgresPassword = New-HexSecret
$jwtSecret = New-HexSecret
```

`POSTGRES_PASSWORD` skal også percent-encodes korrekt i `DATABASE_URL`, hvis den indeholder tegn med særlig betydning i en URL. Hex-værdien ovenfor er URL-sikker. `DATABASE_URL` skal bruge Compose-hostnavnet `database`, intern port `5432` og `schema=public`.

## Beskyt filen

`.env.production` må aldrig committes, kopieres til tickets eller indsættes i chat/logs. Kontrollen kræver, at filen er Git-ignoreret og ikke tracket.

På Linux:

```bash
chmod 600 .env.production
```

På Windows bør NTFS-rettighederne begrænses til den konto, som driver deploymentet. Kontrollér dem med:

```powershell
icacls .env.production
```

## Kontroller kun secrets

```powershell
npm run check:production-env -- --env-file .env.production
```

Kontrollen verificerer blandt andet:

- HTTPS og samme origin i `APP_ORIGIN` og `CADDY_SITE_ADDRESS`.
- ingen eksempelværdier eller placeholders.
- separat, stærk `POSTGRES_PASSWORD` og `JWT_SECRET`.
- at `DATABASE_URL` matcher PostgreSQL-bruger, adgangskode og database.
- korrekte interne host-/portværdier.
- komplet VAPID-konfiguration, når push bruges.
- at secretfilen ikke kan blive tilføjet til Git ved en fejl.

Secretværdier udskrives aldrig. Kun ikke-følsomme felter og secretlængder vises.

## Kør fuld preflight

```powershell
npm run production:preflight -- --env-file .env.production
```

Preflight kører desuden:

- production Compose-kontrollen.
- `docker compose config --quiet` med den konkrete miljøfil.
- Caddys egen validering af `deploy/Caddyfile` i det fastlåste Caddy-image.
- kontrol af ren Git working tree.

`--allow-http`, `--allow-dirty`, `--skip-git-safety` og `--skip-caddy-validation` er kun udviklings-/testmuligheder. De må ikke bruges ved et rigtigt deployment.

## Rotation

Ændring af `JWT_SECRET` logger alle aktive brugere ud. Planlæg rotation i et vedligeholdelsesvindue.

Ved rotation af `POSTGRES_PASSWORD` skal `POSTGRES_PASSWORD` og den percent-encodede adgangskode i `DATABASE_URL` ændres samlet. Tag og verificér en backup før ændringen.

Efter enhver secretrotation køres målrettet:

```powershell
npm run check:production-env -- --env-file .env.production
npm run production:preflight -- --env-file .env.production
npm run production:rehearse
```

Fuld releasekontrol er kun nødvendig, hvis rotationen kombineres med applikations-, migrations- eller runtimeændringer.
