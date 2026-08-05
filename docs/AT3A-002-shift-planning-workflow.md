# AT3A-002 – tydelig arbejdsgang i vagtplanlægning

Denne delpakke bygger oven på Pakke 1 fra baseline `2f74c86edcf6358b4a56ed0c167778246b445c23`.

## Ændret arbejdsgang

1. Kalenderen og valg af vagtsskabeloner vises før kladdeberegningen.
2. En kompakt trinviser linker direkte til kalender, beregning og gennemgang.
3. "Forhåndsvisning" omtales som et vagtforslag eller en kladde.
4. UI forklarer, at en genberegning kan opdatere samme åbne kladde, så kladde-ID'et ikke nødvendigvis ændres.
5. Efter beregning rulles brugeren til gennemgangen.
6. Åbne kladdedetaljer nulstilles ved genberegning, så gamle detaljer ikke fremstår som aktuelle.
7. Ekstreme minutværdier vises ikke længere som klokkeslæt som `573:35`; gyldige sluttider efter midnat vises med "næste dag".

## Afgrænsning

Denne delpakke ændrer ikke backendens kladdemodel og opretter ikke flere samtidige åbne kladder for samme måned. Automatisk oprettelse af enkeltvagter på `/schedule` håndteres i en efterfølgende AT3A-002-pakke.

## Pakke 2B – kalenderen er den eneste datoredigering

- Den gentagne datoliste under beregningen er fjernet.
- Kalenderen flyttes og valideres som første arbejdsflade før beregning og gennemgang.
- Beregningsområdet viser kun en kompakt opsummering og én beregningsknap.
- Åbne kladder vises som standard; tidligere kladder findes via filtrene.
- Terminologien bruger vagtforslag, kladde og fast medarbejder frem for forhåndsvisning, standard og tom.
