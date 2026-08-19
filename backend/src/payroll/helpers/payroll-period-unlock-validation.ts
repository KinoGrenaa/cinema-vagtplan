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
  if (status === 'LOCKED') {
    return;
  }

  if (status === 'EXPORTED') {
    throw new BadRequestException(
      'En eksporteret lønperiode kan ikke genåbnes. Rettelser håndteres som efterregulering.',
    );
  }

  throw new BadRequestException(
    'Kun en låst lønperiode kan genåbnes.',
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
