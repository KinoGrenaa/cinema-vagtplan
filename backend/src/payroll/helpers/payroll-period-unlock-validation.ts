import { BadRequestException } from '@nestjs/common';

export function getRequiredPayrollUnlockNote(note?: string) {
  const normalizedNote = note?.trim() ?? '';

  if (!normalizedNote) {
    throw new BadRequestException(
      'Intern note er påkrævet ved genåbning.',
    );
  }

  return normalizedNote;
}

export function ensurePayrollPeriodCanBeUnlocked(status: string) {
  if (status === 'LOCKED' || status === 'EXPORTED') {
    return;
  }

  throw new BadRequestException(
    'Kun låste eller eksporterede lønperioder kan genåbnes.',
  );
}

export function ensurePayrollTimeEntryCanBeUnlocked(
  payrollLocked: boolean,
) {
  if (payrollLocked) {
    return;
  }

  throw new BadRequestException(
    'Tidsregistreringen er ikke låst og kan derfor ikke genåbnes.',
  );
}
