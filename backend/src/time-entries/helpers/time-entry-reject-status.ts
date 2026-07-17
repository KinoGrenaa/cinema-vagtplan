import { BadRequestException } from '@nestjs/common';

export function ensureTimeEntryCanBeSentBack(existingEntry: {
  status: string;
}) {
  if (existingEntry.status === 'APPROVED') {
    throw new BadRequestException(
      'Fjern godkendelsen, før tidsregistreringen sendes retur til rettelse.',
    );
  }

  if (existingEntry.status === 'VOIDED') {
    throw new BadRequestException(
      'En annulleret tidsregistrering kan ikke sendes retur til rettelse.',
    );
  }
}
