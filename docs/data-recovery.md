# Backup og datagendannelse

Denne pakke beskytter de to datakilder, der tilsammen udgør en komplet Cinema-vagtplan-installation:

1. PostgreSQL-databasen.
2. Hele `/app/uploads`, herunder medarbejderdokumenter, profilbilleder og biograflogoer.

En databasebackup uden uploads er ikke komplet, fordi databasen kun indeholder filreferencer. En uploadbackup uden databasen mangler adgangs-, ejer- og biografkonteksten.

## Opret backup

Docker Compose-servicerne `database` og `backend` skal køre.

```powershell
npm run backup:create
```

Backupen oprettes som standard under `backups/<UTC-tidspunkt>` og indeholder:

- `database.dump`: PostgreSQL custom-format fra `pg_dump`.
- `uploads.tar.gz`: komprimeret kopi af `/app/uploads`.
- `manifest.json`: filstørrelser og SHA-256 for begge arkiver.

En bestemt lokal mappe kan vælges:

```powershell
npm run backup:create -- --output backups/foer-opgradering
```

`backups` er ignoreret af Git. Det er kun en lokal stagingmappe og må ikke være den eneste kopi.

## Verificér backup

```powershell
npm run backup:verify -- backups/<backupmappe>
```

Kontrollen bekræfter:

- at filstørrelser og SHA-256 matcher manifestet;
- at PostgreSQL-arkivet kan læses af `pg_restore --list`;
- at uploadarkivet kan læses;
- at uploadarkivet ikke indeholder absolutte stier eller `..`-stiudbrud.

## Kør restore-rehearsal

```powershell
npm run backup:rehearse -- backups/<backupmappe>
```

Restore-rehearsal opretter en midlertidig PostgreSQL 16-container og midlertidige Docker-volumes. Databasearkivet gendannes, public-tabeller tælles, uploadarkivet pakkes ud, og alle midlertidige ressourcer slettes bagefter. Den aktive database og aktive `/app/uploads` berøres ikke.

Kør en restore-rehearsal regelmæssigt og altid før større migrations- eller deploymentændringer. En backup er ikke dokumenteret brugbar, før den er gendannet med succes.

## Opbevaring og sikkerhed

Backupen kan indeholde personoplysninger, ansættelsesdokumenter og kontaktoplysninger. Derfor skal den:

- krypteres ved lagring og transport;
- kopieres off-host til et separat system eller objektlager;
- have adgangskontrol og revisionsspor;
- have dokumenteret retention og sikker sletning.

Et muligt udgangspunkt er 7 daglige, 4 ugentlige og 12 månedlige kopier. Den endelige retention skal følge virksomhedens juridiske, lønmæssige og GDPR-relaterede slettekrav.

Fastlæg desuden:

- **RPO**: hvor meget nyt data virksomheden maksimalt kan tåle at miste;
- **RTO**: hvor lang tid en fuld gendannelse maksimalt må tage.

Backupfrekvensen skal være mindst lige så stram som RPO-kravet. Restore-rehearsalens målte tid skal kunne holdes inden for RTO-kravet.

## Live restore

Live restore er bevidst ikke automatiseret i denne pakke. Den kan overskrive eller blande aktive data og kræver derfor en godkendt driftsprocedure:

1. Sæt systemet i vedligeholdelsestilstand og stop skriveadgang.
2. Opret og verificér en ny sikkerhedsbackup af den aktuelle tilstand.
3. Gendan helst til en ny, tom database og et nyt uploadvolume.
4. Kør migrations- og applikationskontrol mod den gendannede kopi.
5. Skift først trafik, når database, uploads, login og kritiske flows er verificeret.
6. Bevar den tidligere installation, indtil rollback-vinduet er udløbet.

Den senere production-Compose-pakke skal montere `/app/uploads` som et selvstændigt persistent volume og begrænse database- og værktøjsporte. Backupkommandoerne er allerede designet til at læse data gennem de kørende services og virker derfor både med bind mount og named volume.
