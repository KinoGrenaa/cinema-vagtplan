# Produktionsmonitorering og operationelle backups

Denne procedure bygger oven på production Compose, preflight, kontrolleret deploy og recoveryværktøjerne. Den starter ikke en ny overvågningsplatform og sender ikke selv mails eller webhooks. I stedet leverer den stabile engangskommandoer med tydelige exitkoder, som kan køres af systemd, cron, en ekstern monitor eller et driftsværktøj.

## Read-only produktionsmonitor

```bash
npm run production:monitor -- \
  --env-file .env.production \
  --report backups/production-monitor/latest.json
```

Monitoren kontrollerer:

- at database, backend, frontend og Caddy findes præcis én gang, kører og er healthy;
- at services har samme kendte deploymentrevision;
- at den seneste migrationscontainer er afsluttet med exitkode 0;
- at frontend, `/auth/login` og Socket.IO svarer gennem den offentlige origin;
- at den seneste operationelle backup er verificeret, frisk og bekræftet kopieret off-host.

Standardgrænserne er 26 timer for backupalder og 30 timer for off-host-bekræftelse. De kan strammes:

```bash
npm run production:monitor -- \
  --env-file .env.production \
  --max-backup-age-hours 25 \
  --max-offsite-age-hours 29
```

Exitkode 0 betyder, at alle kontroller er grønne. Exitkode 1 betyder, at overvågningen skal alarmere. `--json` giver et maskinlæsbart resumé uden secrets. En rapport under `backups/` får restriktive filrettigheder, hvor operativsystemet understøtter det.

Et praktisk udgangspunkt er at køre monitoren hver 5. minut. Den eksterne scheduler bør alarmere ved første fejl, gentage med passende dæmpning og sende en recovery-besked, når kommandoen igen returnerer 0.

## Opret operationel production-backup

```bash
npm run production:backup -- --env-file .env.production
```

Kommandoen:

1. kræver en komplet, revisionsmærket production-stack;
2. tager PostgreSQL custom dump og hele `/app/uploads` gennem production Compose;
3. verificerer SHA-256, filstørrelser og begge arkivers læsbarhed;
4. skriver `operational-backup.json` uden credentials;
5. markerer backupen som lokalt verificeret, men endnu ikke off-host-bekræftet.

Den anbefalede lokale schedule er hver nat kl. 02:30 efter `Europe/Copenhagen`. Backupjobbet bør have en eksklusiv schedulerlås, så to kopier ikke kører samtidigt.

## Krypteret off-host-kopi

En lokal Docker-host er ikke en selvstændig backupdestination. Kopiér hele backupmappen krypteret til et separat system eller objektlager med adgangskontrol, versionshistorik og revisionsspor. Brug eksempelvis virksomhedens godkendte restic-, borg-, rclone- eller objektlagerworkflow; credentials skal ligge uden for repositoryet.

Efter at den eksterne kopi er kontrolleret, registreres en ufølsom reference:

```bash
npm run production:backup -- \
  --mark-offsite backups/production-backup-<tid>-<revision> \
  --offsite-reference "object-lock:2026-07-31/backup-id"
```

Backupen verificeres igen lokalt før markeringen. Referencen må ikke indeholde adgangskoder, tokens eller andre secrets.

## Retention

Standardplanen er:

- 7 daglige kopier;
- 4 ugentlige kopier;
- 12 månedlige kopier.

Se altid planen først:

```bash
npm run production:backup -- --prune-only --dry-run
```

Udfør derefter retention:

```bash
npm run production:backup -- --prune-only
```

Retention må kun slette mapper, som:

- ligger direkte under `backups/`;
- har det kontrollerede `production-backup-`-navn;
- har en gyldig operationel markeringsfil;
- er verificerede;
- er eksplicit bekræftet kopieret off-host;
- ikke er udvalgt til daglig, ugentlig eller månedlig opbevaring.

Ukendte mapper, ufuldstændige backups og backups uden off-host-bekræftelse røres aldrig automatisk. Der bruges ikke `docker compose down -v`, `migrate reset`, automatisk database-restore eller generelle volume-sletninger.

En natlig backup kan kombineres med retention efter den nye backup er oprettet:

```bash
npm run production:backup -- --env-file .env.production --prune
```

Den nye lokale backup er stadig beskyttet mod sletning, indtil den eksterne kopi er bekræftet.

## Foreslået driftsplan

- Hver 5. minut: `production:monitor`.
- Hver nat kl. 02:30: `production:backup`.
- Efter vellykket krypteret off-host-sync: `production:backup -- --mark-offsite ...`.
- Efter off-host-bekræftelse: retention dry-run og derefter retention.
- Ugentligt: gennemgå monitorrapporter og backupreferencer.
- Månedligt: kør `backup:rehearse` på en nyere off-host-kopi.
- Før højrisikodeployments: behold den automatiske verificerede pre-deploy-backup.

## Alarmering

Denne pakke vælger bevidst ikke leverandør. Kobl exitkode 1 og JSON-rapporten til den løsning, der faktisk skal bruges i produktion, eksempelvis systemd `OnFailure`, Uptime Kuma, Better Stack, Grafana/Prometheus-agent eller virksomhedens eksisterende overvågning.

Minimumsalarmer bør være:

- en service mangler, er stoppet eller unhealthy;
- revisionslabels er uens eller unmanaged;
- migrationen fejlede;
- frontend, API eller Socket.IO fejler;
- seneste verificerede backup er for gammel;
- seneste backup mangler frisk off-host-bekræftelse.

Før rigtig drift skal alarmmodtager, eskalationsvej, vedligeholdelsesvinduer og forventet responstid dokumenteres.
