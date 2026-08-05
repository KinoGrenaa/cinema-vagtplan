# AT3A-002 – Automatisk oprettelse på /schedule

Den normale oprettelse af en untildelt vagt på `/schedule` tager udgangspunkt
i jobfunktionen og den valgte planlægningsdato.

## Standardforløb

1. Administratoren vælger en jobfunktion. Valget står sammen med resten af
   oprettelsesforløbet i venstre side.
2. Tiderne genberegnes automatisk, når datoen eller jobfunktionen ændres. Der er
   derfor ingen særskilt knap til manuel genberegning.
3. Backend beregner mødetid og fyraften i `Europe/Copenhagen` ud fra:
   - filmvisninger på den konkrete planlægningsdag,
   - jobfunktionens aktive tidsregel,
   - start- og slutanker samt offsets,
   - fallbacktider,
   - de valgte afrundinger.
4. Siden viser det beregnede tidsrum, filmgrundlag eller fallback samt overlap.
5. **Opret untildelt vagt** opretter vagten med de viste ISO-tider.

## Manuel undtagelse

Manuel placering på tidslinjen er bevaret som en sekundær handling. Den er ikke
længere standardforløbet og markeres tydeligt som en manuel undtagelse.

## Tidszone

Timing-preview-responsen indeholder både relative minutter og konkrete
`startTime`/`endTime` ISO-tider beregnet server-side i
`Europe/Copenhagen`. Frontend skal derfor ikke gætte sommertidsforskydningen.
