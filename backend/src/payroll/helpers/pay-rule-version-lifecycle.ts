import { BadRequestException } from '@nestjs/common';

export type PayRuleLifecycleVersion = {
  id: number;
  validFrom: Date;
  validTo: Date | null;
  status?: string;
  isEnabled?: boolean;
};

export function assertCanDeleteScheduledPayRuleVersion(params: {
  validFrom: Date;
  status?: string;
  calculationLineCount: number;
  adjustmentCount: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.status === 'CANCELLED') {
    throw new BadRequestException('Regelversionen er allerede slettet.');
  }
  if (params.validFrom <= now) {
    throw new BadRequestException(
      'Kun en planlagt regelversion, der endnu ikke er trådt i kraft, kan slettes.',
    );
  }
  if (params.calculationLineCount > 0 || params.adjustmentCount > 0) {
    throw new BadRequestException(
      'Regelversionen kan ikke slettes, fordi den allerede er anvendt i en lønberegning eller efterregulering.',
    );
  }
}

export function resolveVersionForDeactivation<
  TVersion extends PayRuleLifecycleVersion,
>(versions: TVersion[], validFrom: Date): TVersion {
  const activeVersions = versions
    .filter((version) => version.status !== 'CANCELLED')
    .sort((left, right) => left.validFrom.getTime() - right.validFrom.getTime());

  const futureVersions = activeVersions.filter(
    (version) => version.validFrom > validFrom,
  );
  if (futureVersions.length > 0) {
    throw new BadRequestException(
      'Reglen har en senere planlagt version. Slet den planlagte version, før reglen deaktiveres fra denne dato.',
    );
  }

  const current = activeVersions.find(
    (version) =>
      version.validFrom <= validFrom &&
      (!version.validTo || validFrom < version.validTo),
  );
  if (!current) {
    throw new BadRequestException(
      'Der findes ingen gældende regelversion på den valgte deaktiveringsdato.',
    );
  }
  if (current.isEnabled === false) {
    throw new BadRequestException(
      'Tillægsreglen er allerede deaktiveret på den valgte dato.',
    );
  }
  return current;
}
