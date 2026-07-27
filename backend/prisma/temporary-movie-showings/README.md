# Midlertidige filmvisninger

Denne seed er kun til udvikling og test, indtil en rigtig filmkilde bliver besluttet.

Den køres aldrig automatisk af den almindelige Prisma-seed eller ved opstart.

Sikkerhedsregler:

- En konkret `cinemaId` er obligatorisk.
- Biografens præcise navn skal bekræftes med `--cinema-name`.
- Sletning og oprettelse er scoped til den valgte biograf og den valgte datoperiode.
- Andre biografers filmvisninger må ikke læses, slettes eller ændres af seed-kørslen.
- Uden `--apply` udføres kun en dry run.

Eksempel på dry run:

```powershell
docker compose exec -T backend npm run seed:temporary-movie-showings -- --cinema-id=1 --cinema-name="Kino Grenaa" --from=2026-07-01 --days=90
```

Eksempel på gennemførelse:

```powershell
docker compose exec -T backend npm run seed:temporary-movie-showings -- --cinema-id=1 --cinema-name="Kino Grenaa" --from=2026-07-01 --days=90 --apply
```
