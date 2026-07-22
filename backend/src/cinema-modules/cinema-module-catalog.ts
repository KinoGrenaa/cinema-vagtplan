export const CINEMA_MODULE_CATALOG = [
  {
    key: 'SCHEDULE',
    name: 'Vagtplan',
    description:
      'Dagsplan, vagter, filmoverlay og den almindelige medarbejderplan.',
    group: 'PLANLÆGNING',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'SHIFT_PLANNING',
    name: 'Månedsplanlægning',
    description:
      'Vagtsskabeloner, månedsplan, kladder og AI-understøttet planlægning.',
    group: 'PLANLÆGNING',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'TIME_TRACKING',
    name: 'Tidsregistrering',
    description:
      'Ind- og udstempling, manuelle registreringer og godkendelsesflow.',
    group: 'TID_OG_LØN',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'PAYROLL',
    name: 'Løn',
    description:
      'Lønperioder, rapporter, eksport, låsning og efterreguleringer.',
    group: 'TID_OG_LØN',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'LEAVE',
    name: 'Ferie og fravær',
    description:
      'Fraværsansøgninger, godkendelse og fraværskalender.',
    group: 'MEDARBEJDERE',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'SHIFT_TRADES',
    name: 'Vagtbytte',
    description:
      'Åben byttepulje og direkte tilbud mellem medarbejdere.',
    group: 'MEDARBEJDERE',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'STAFFING_REQUESTS',
    name: 'Bemandingsforespørgsler',
    description:
      'Direkte og brede forespørgsler om ledige eller untildelte vagter.',
    group: 'MEDARBEJDERE',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'MESSAGES',
    name: 'Beskeder',
    description:
      'Interne beskeder, broadcast, arkiv og notifikationer.',
    group: 'KOMMUNIKATION',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'EMPLOYEE_DOCUMENTS',
    name: 'Medarbejderdokumenter',
    description:
      'Biografspecifikt dokumentarkiv med upload, download og sletning.',
    group: 'MEDARBEJDERE',
    billingBasis: 'PER_CINEMA',
  },
  {
    key: 'STAFFING_AI',
    name: 'Staffing AI',
    description:
      'Forslag, prognoser, belastningsanalyse og automatisk bemandingshjælp.',
    group: 'AI',
    billingBasis: 'PER_CINEMA',
  },
] as const;

export type CinemaModuleKey =
  (typeof CINEMA_MODULE_CATALOG)[number]['key'];

export type CinemaModuleGroup =
  (typeof CINEMA_MODULE_CATALOG)[number]['group'];

export const CINEMA_MODULE_KEYS =
  CINEMA_MODULE_CATALOG.map(
    (module) => module.key,
  ) as CinemaModuleKey[];

export function isCinemaModuleKey(
  value: unknown,
): value is CinemaModuleKey {
  return (
    typeof value === 'string' &&
    CINEMA_MODULE_KEYS.includes(
      value as CinemaModuleKey,
    )
  );
}
