import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  type PayrollAuthUser,
  ensurePayrollAccess,
  getPayrollCinemaFilter,
} from './helpers/payroll-access';
import { PayrollRetroactiveAdjustmentService } from './payroll-retroactive-adjustment.service';
import {
  parsePayrollValidFrom,
  planVersionInsertion,
  resolveVersionStatus,
} from './helpers/payroll-version-intervals';
import { payrollVersionLockKey } from './helpers/payroll-version-lock';
import {
  assertCanDeleteScheduledPayRuleVersion,
  resolveVersionForDeactivation,
} from './helpers/pay-rule-version-lifecycle';

function normalizeReason(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Begrundelse skal være tekst.');
  }
  const reason = value.trim();
  if (reason.length > 1000) {
    throw new BadRequestException('Begrundelse må højst være 1000 tegn.');
  }
  return reason || null;
}

function normalizePositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new BadRequestException(`${label} skal være et gyldigt ID.`);
  }
  return id;
}

function normalizeMoney(value: unknown, label: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new BadRequestException(`${label} skal være et positivt beløb.`);
  }
  return numberValue.toFixed(4);
}

function normalizeMode(value: unknown) {
  const mode = String(value ?? '').toUpperCase();
  if (!['HOURS_ONLY', 'SIMPLE', 'ADVANCED'].includes(mode)) {
    throw new BadRequestException('Vælg en gyldig lønmodel.');
  }
  return mode as 'HOURS_ONLY' | 'SIMPLE' | 'ADVANCED';
}

function normalizeName(value: unknown, label = 'Navn') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${label} skal udfyldes.`);
  }
  const name = value.trim();
  if (name.length > 120) {
    throw new BadRequestException(`${label} må højst være 120 tegn.`);
  }
  return name;
}

function nameKey(name: string) {
  return name.trim().toLocaleLowerCase('da-DK').replace(/\s+/g, ' ');
}

function copenhagenDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function isRetroactive(validFrom: Date, now = new Date()) {
  return copenhagenDateKey(validFrom) < copenhagenDateKey(now);
}

@Injectable()
export class PayrollVersioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retroactiveAdjustments: PayrollRetroactiveAdjustmentService,
  ) {}

  private resolveCinemaId(
    user: PayrollAuthUser,
    requestedCinemaId?: number | null,
  ) {
    ensurePayrollAccess(user);
    const cinemaId = getPayrollCinemaFilter(user, requestedCinemaId).cinemaId;
    if (user.role !== 'MASTER' && !user.canManagePayroll) {
      throw new ForbiddenException('Du har ikke adgang til at ændre lønopsætningen.');
    }
    return cinemaId;
  }


  private ensurePayrollModeAccess(user: PayrollAuthUser) {
    if (user.role === 'MASTER') return;
    if (user.canManagePayroll && user.canManageCinemaSettings) return;
    throw new ForbiddenException(
      'Du skal have adgang til både løn og biografindstillinger for at ændre lønmodellen.',
    );
  }

  private async acquireVersionLock(
    tx: Prisma.TransactionClient,
    scopeId: number,
  ) {
    const lockKey = payrollVersionLockKey(scopeId);
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(${lockKey}::bigint)`,
    );
  }

  async buildImpactPreview(params: {
    user: PayrollAuthUser;
    cinemaId: number;
    validFrom: Date;
    kind: 'PAYROLL_MODE' | 'PAY_RATE' | 'PAY_RULE' | 'SPECIAL_DAY';
    membershipId?: number | null;
    payRuleId?: number | null;
    proposedValue: unknown;
  }) {
    const cinemaId = this.resolveCinemaId(params.user, params.cinemaId);
    const now = new Date();
    const userFilter = params.membershipId
      ? {
          user: {
            cinemaMemberships: {
              some: { id: params.membershipId, cinemaId },
            },
          },
        }
      : {};
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        cinemaId,
        ...userFilter,
        clockIn: { lt: now },
        clockOut: { gt: params.validFrom },
      },
      select: {
        id: true,
        createdAt: true,
        clockIn: true,
        clockOut: true,
        status: true,
        payrollLocked: true,
        payrollPeriodId: true,
        payrollPeriod: { select: { id: true, status: true } },
      },
      orderBy: { id: 'asc' },
    });

    const counts = {
      totalEntryCount: entries.length,
      openEntryCount: entries.filter(
        (entry) => !entry.payrollPeriod || entry.payrollPeriod.status === 'OPEN',
      ).length,
      lockedEntryCount: entries.filter(
        (entry) => entry.payrollPeriod?.status === 'LOCKED',
      ).length,
      exportedEntryCount: entries.filter(
        (entry) => entry.payrollPeriod?.status === 'EXPORTED',
      ).length,
    };
    const closedPeriodIds: number[] = Array.from(
      new Set<number>(
        entries
          .filter((entry) =>
            ['LOCKED', 'EXPORTED'].includes(entry.payrollPeriod?.status ?? ''),
          )
          .map((entry) => entry.payrollPeriodId)
          .filter((id): id is number =>
            typeof id === 'number' && Number.isInteger(id),
          ),
      ),
    ).sort((left: number, right: number) => left - right);
    const tokenPayload = {
      cinemaId,
      kind: params.kind,
      membershipId: params.membershipId ?? null,
      payRuleId: params.payRuleId ?? null,
      validFrom: params.validFrom.toISOString(),
      proposedValue: params.proposedValue,
      entries: entries.map((entry) => [
        entry.id,
        entry.createdAt.toISOString(),
        entry.clockIn.toISOString(),
        entry.clockOut?.toISOString() ?? null,
        entry.status,
        entry.payrollLocked,
        entry.payrollPeriodId,
        entry.payrollPeriod?.status ?? 'OPEN',
      ]),
    };
    const confirmationToken = createHash('sha256')
      .update(JSON.stringify(tokenPayload))
      .digest('hex');

    return {
      ...counts,
      closedPeriodIds,
      isRetroactive: isRetroactive(params.validFrom, now),
      requiresReason:
        isRetroactive(params.validFrom, now) || closedPeriodIds.length > 0,
      requiresConfirmation: closedPeriodIds.length > 0,
      estimatedAmountDelta: null,
      confirmationToken,
      checkedAt: now,
    };
  }

  private async verifyImpact(params: {
    user: PayrollAuthUser;
    cinemaId: number;
    validFrom: Date;
    kind: 'PAYROLL_MODE' | 'PAY_RATE' | 'PAY_RULE' | 'SPECIAL_DAY';
    membershipId?: number | null;
    payRuleId?: number | null;
    proposedValue: unknown;
    reason: string | null;
    confirmationToken?: unknown;
  }) {
    const impact = await this.buildImpactPreview(params);
    if (impact.requiresReason && !params.reason) {
      throw new BadRequestException(
        'En ændring med en tidligere startdato kræver en begrundelse.',
      );
    }
    if (
      impact.requiresConfirmation &&
      params.confirmationToken !== impact.confirmationToken
    ) {
      throw new BadRequestException(
        'Konsekvensberegningen er forældet. Beregn konsekvensen igen.',
      );
    }
    return impact;
  }

  async getPayrollConfiguration(
    user: PayrollAuthUser,
    requestedCinemaId: number,
  ) {
    const cinemaId = this.resolveCinemaId(user, requestedCinemaId);
    const now = new Date();
    const versions = await this.prisma.cinemaPayrollConfigurationVersion.findMany({
      where: { cinemaId },
      include: { createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { validFrom: 'asc' },
    });
    const current =
      versions.find(
        (version) =>
          version.status !== 'CANCELLED' &&
          version.validFrom <= now &&
          (!version.validTo || now < version.validTo),
      ) ?? null;
    const next =
      versions.find(
        (version) => version.status !== 'CANCELLED' && version.validFrom > now,
      ) ?? null;
    return { current, next, versions };
  }

  async previewPayrollMode(
    user: PayrollAuthUser,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    this.ensurePayrollModeAccess(user);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const mode = normalizeMode(body?.mode);
    return this.buildImpactPreview({
      user,
      cinemaId,
      validFrom,
      kind: 'PAYROLL_MODE',
      proposedValue: { mode },
    });
  }

  async createPayrollModeVersion(
    user: PayrollAuthUser,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    this.ensurePayrollModeAccess(user);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const mode = normalizeMode(body?.mode);
    const reason = normalizeReason(body?.reason);
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom,
      kind: 'PAYROLL_MODE',
      proposedValue: { mode },
      reason,
      confirmationToken: body?.confirmationToken,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, cinemaId);
      const versions = await tx.cinemaPayrollConfigurationVersion.findMany({
        where: { cinemaId },
        orderBy: { validFrom: 'asc' },
      });
      const plan = planVersionInsertion(versions, validFrom);
      const previous = plan.previousVersionId
        ? versions.find((version) => version.id === plan.previousVersionId) ?? null
        : null;
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'PAYROLL_MODE',
          validFrom,
          oldValue: previous ? { mode: previous.mode } : Prisma.JsonNull,
          newValue: { mode },
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      if (plan.previousVersionId) {
        await tx.cinemaPayrollConfigurationVersion.update({
          where: { id: plan.previousVersionId },
          data: {
            validTo: validFrom,
            status: resolveVersionStatus(previous!.validFrom, validFrom),
          },
        });
      }
      const created = await tx.cinemaPayrollConfigurationVersion.create({
        data: {
          cinemaId,
          mode,
          validFrom,
          validTo: plan.newValidTo,
          status: resolveVersionStatus(validFrom, plan.newValidTo),
          changeId: change.id,
          createdByUserId: user.sub,
          reason,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { version: created, change, impact, adjustments };
    });
    return result;
  }

  private async findMembership(cinemaId: number, userId: number) {
    const membership = await this.prisma.userCinemaMembership.findFirst({
      where: { cinemaId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!membership) {
      throw new NotFoundException('Medarbejderen blev ikke fundet i biografen.');
    }
    return membership;
  }

  async getPayRates(
    user: PayrollAuthUser,
    userIdValue: number,
    cinemaIdValue: number,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const userId = normalizePositiveId(userIdValue, 'Medarbejder');
    const membership = await this.findMembership(cinemaId, userId);
    const versions = await this.prisma.membershipPayRateVersion.findMany({
      where: { membershipId: membership.id },
      include: { createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { validFrom: 'asc' },
    });
    return { membership, versions };
  }

  async previewPayRate(
    user: PayrollAuthUser,
    userIdValue: number,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const userId = normalizePositiveId(userIdValue, 'Medarbejder');
    const membership = await this.findMembership(cinemaId, userId);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const hourlyRate = normalizeMoney(body?.hourlyRate, 'Timeløn');
    return this.buildImpactPreview({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RATE',
      membershipId: membership.id,
      proposedValue: { hourlyRate, currencyCode: 'DKK' },
    });
  }

  async createPayRateVersion(
    user: PayrollAuthUser,
    userIdValue: number,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const userId = normalizePositiveId(userIdValue, 'Medarbejder');
    const membership = await this.findMembership(cinemaId, userId);
    if (membership.employmentType !== 'HOURLY') {
      throw new BadRequestException(
        'Timeløn kan kun angives for en timelønnet ansættelse.',
      );
    }
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const hourlyRate = normalizeMoney(body?.hourlyRate, 'Timeløn');
    const reason = normalizeReason(body?.reason);
    const proposedValue = { hourlyRate, currencyCode: 'DKK' };
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RATE',
      membershipId: membership.id,
      proposedValue,
      reason,
      confirmationToken: body?.confirmationToken,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 1_000_000_000 + membership.id);
      const versions = await tx.membershipPayRateVersion.findMany({
        where: { membershipId: membership.id },
        orderBy: { validFrom: 'asc' },
      });
      const plan = planVersionInsertion(versions, validFrom);
      const previous = plan.previousVersionId
        ? versions.find((version) => version.id === plan.previousVersionId) ?? null
        : null;
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'PAY_RATE',
          membershipId: membership.id,
          validFrom,
          oldValue: previous
            ? { hourlyRate: previous.hourlyRate.toString(), currencyCode: previous.currencyCode }
            : Prisma.JsonNull,
          newValue: proposedValue,
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      if (plan.previousVersionId) {
        await tx.membershipPayRateVersion.update({
          where: { id: plan.previousVersionId },
          data: {
            validTo: validFrom,
            status: resolveVersionStatus(previous!.validFrom, validFrom),
          },
        });
      }
      const created = await tx.membershipPayRateVersion.create({
        data: {
          membershipId: membership.id,
          hourlyRate,
          currencyCode: 'DKK',
          validFrom,
          validTo: plan.newValidTo,
          status: resolveVersionStatus(validFrom, plan.newValidTo),
          changeId: change.id,
          createdByUserId: user.sub,
          reason,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { version: created, change, impact, adjustments };
    });
    return result;
  }

  async cancelFuturePayRate(
    user: PayrollAuthUser,
    userIdValue: number,
    cinemaIdValue: number,
    versionIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const userId = normalizePositiveId(userIdValue, 'Medarbejder');
    const versionId = normalizePositiveId(versionIdValue, 'Lønversion');
    const membership = await this.findMembership(cinemaId, userId);
    const reason = normalizeReason(body?.reason);
    if (!reason) throw new BadRequestException('Annullering kræver en begrundelse.');

    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 1_000_000_000 + membership.id);
      const version = await tx.membershipPayRateVersion.findFirst({
        where: { id: versionId, membershipId: membership.id },
      });
      if (!version) throw new NotFoundException('Lønversionen blev ikke fundet.');
      if (version.validFrom <= new Date()) {
        throw new BadRequestException(
          'En lønversion, der er trådt i kraft, kan ikke annulleres.',
        );
      }
      const previous = await tx.membershipPayRateVersion.findFirst({
        where: {
          membershipId: membership.id,
          status: { not: 'CANCELLED' },
          validFrom: { lt: version.validFrom },
        },
        orderBy: { validFrom: 'desc' },
      });
      const next = await tx.membershipPayRateVersion.findFirst({
        where: {
          membershipId: membership.id,
          status: { not: 'CANCELLED' },
          validFrom: { gt: version.validFrom },
        },
        orderBy: { validFrom: 'asc' },
      });
      await tx.membershipPayRateVersion.update({
        where: { id: version.id },
        data: { status: 'CANCELLED', reason },
      });
      if (previous) {
        await tx.membershipPayRateVersion.update({
          where: { id: previous.id },
          data: {
            validTo: next?.validFrom ?? null,
            status: resolveVersionStatus(previous.validFrom, next?.validFrom ?? null),
          },
        });
      }
      return { cancelledVersionId: version.id, reason };
    });
  }

  async listPayRules(user: PayrollAuthUser, cinemaIdValue: number) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    return this.prisma.payRule.findMany({
      where: { cinemaId },
      include: {
        versions: {
          orderBy: { validFrom: 'asc' },
          include: {
            createdByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            cancelledByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                calculationLines: true,
                payrollAdjustments: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  private async normalizePayRuleDefinition(
    cinemaId: number,
    body: any,
    client: any = this.prisma,
  ) {
    const name = normalizeName(body?.name);
    const ruleKind = String(body?.ruleKind ?? '').toUpperCase();
    if (!['TIME_WINDOW', 'WEEKDAY', 'WEEKEND', 'HOLIDAY', 'JOB_FUNCTION'].includes(ruleKind)) {
      throw new BadRequestException('Vælg en gyldig type tillægsregel.');
    }
    const stackingMode = String(body?.stackingMode ?? 'STACK').toUpperCase();
    if (!['STACK', 'EXCLUSIVE'].includes(stackingMode)) {
      throw new BadRequestException('Vælg en gyldig kombination af tillæg.');
    }
    const exclusiveGroup =
      typeof body?.exclusiveGroup === 'string' && body.exclusiveGroup.trim()
        ? body.exclusiveGroup.trim()
        : null;
    if (stackingMode === 'EXCLUSIVE' && !exclusiveGroup) {
      throw new BadRequestException('Eksklusive tillæg skal have en gruppe.');
    }
    const priority = Number.isInteger(Number(body?.priority))
      ? Number(body.priority)
      : 0;
    const payrollTypeId = body?.payrollTypeId
      ? normalizePositiveId(body.payrollTypeId, 'Eksportkode')
      : null;
    if (payrollTypeId) {
      const payrollType = await client.payrollType.findFirst({
        where: { id: payrollTypeId, cinemaId, isActive: true },
        select: { id: true },
      });
      if (!payrollType) {
        throw new BadRequestException('Eksportkoden tilhører ikke biografen.');
      }
    }
    return {
      cinemaId,
      name,
      nameKey: nameKey(name),
      description:
        typeof body?.description === 'string' ? body.description.trim() || null : null,
      ruleKind,
      stackingMode,
      exclusiveGroup,
      priority,
      payrollTypeId,
    };
  }

  private async normalizeInitialPayRulePayload(
    user: PayrollAuthUser,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const definition = await this.normalizePayRuleDefinition(cinemaId, body);
    const firstVersionBody = body?.firstVersion;
    if (!firstVersionBody || typeof firstVersionBody !== 'object') {
      throw new BadRequestException(
        'Tillægsreglen skal oprettes sammen med sin første version.',
      );
    }
    const validFrom = parsePayrollValidFrom(firstVersionBody.validFrom);
    const proposedVersion = this.normalizePayRuleVersion(
      { ruleKind: definition.ruleKind },
      firstVersionBody,
    );
    const reason = normalizeReason(firstVersionBody.reason);
    const proposedValue = {
      rule: {
        name: definition.name,
        nameKey: definition.nameKey,
        description: definition.description,
        ruleKind: definition.ruleKind,
        stackingMode: definition.stackingMode,
        exclusiveGroup: definition.exclusiveGroup,
        priority: definition.priority,
        payrollTypeId: definition.payrollTypeId,
      },
      version: proposedVersion,
    };
    return {
      cinemaId,
      definition,
      validFrom,
      proposedVersion,
      proposedValue,
      reason,
      confirmationToken: firstVersionBody.confirmationToken,
    };
  }

  async previewInitialPayRule(
    user: PayrollAuthUser,
    cinemaIdValue: number,
    body: any,
  ) {
    const normalized = await this.normalizeInitialPayRulePayload(
      user,
      cinemaIdValue,
      body,
    );
    const duplicate = await this.prisma.payRule.findFirst({
      where: {
        cinemaId: normalized.cinemaId,
        nameKey: normalized.definition.nameKey,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'Der findes allerede en tillægsregel med samme navn.',
      );
    }
    return this.buildImpactPreview({
      user,
      cinemaId: normalized.cinemaId,
      validFrom: normalized.validFrom,
      kind: 'PAY_RULE',
      payRuleId: null,
      proposedValue: normalized.proposedValue,
    });
  }

  async createPayRule(user: PayrollAuthUser, cinemaIdValue: number, body: any) {
    const normalized = await this.normalizeInitialPayRulePayload(
      user,
      cinemaIdValue,
      body,
    );
    const impact = await this.verifyImpact({
      user,
      cinemaId: normalized.cinemaId,
      validFrom: normalized.validFrom,
      kind: 'PAY_RULE',
      payRuleId: null,
      proposedValue: normalized.proposedValue,
      reason: normalized.reason,
      confirmationToken: normalized.confirmationToken,
    });
    if (normalized.confirmationToken !== impact.confirmationToken) {
      throw new BadRequestException(
        'Konsekvensberegningen er forældet. Beregn konsekvensen igen.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 1_900_000_000 + normalized.cinemaId);
      const duplicate = await tx.payRule.findFirst({
        where: {
          cinemaId: normalized.cinemaId,
          nameKey: normalized.definition.nameKey,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException(
          'Der findes allerede en tillægsregel med samme navn.',
        );
      }
      if (normalized.definition.payrollTypeId) {
        await this.normalizePayRuleDefinition(
          normalized.cinemaId,
          body,
          tx,
        );
      }
      if (normalized.proposedVersion.jobFunctionId) {
        const jobFunction = await tx.jobFunction.findFirst({
          where: {
            id: normalized.proposedVersion.jobFunctionId,
            cinemaId: normalized.cinemaId,
          },
          select: { id: true },
        });
        if (!jobFunction) {
          throw new BadRequestException('Jobfunktionen tilhører ikke biografen.');
        }
      }

      const createdRule = await tx.payRule.create({
        data: {
          ...normalized.definition,
          ruleKind: normalized.definition.ruleKind as any,
          stackingMode: normalized.definition.stackingMode as any,
        },
      });
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId: normalized.cinemaId,
          type: 'PAY_RULE',
          payRuleId: createdRule.id,
          validFrom: normalized.validFrom,
          oldValue: Prisma.JsonNull,
          newValue: normalized.proposedVersion,
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason: normalized.reason,
          createdByUserId: user.sub,
        },
      });
      await tx.payRuleVersion.create({
        data: {
          payRuleId: createdRule.id,
          ...normalized.proposedVersion,
          validFrom: normalized.validFrom,
          validTo: null,
          status: resolveVersionStatus(normalized.validFrom, null),
          changeId: change.id,
          createdByUserId: user.sub,
          reason: normalized.reason,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId: normalized.cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason: normalized.reason,
        });
      const rule = await tx.payRule.findUniqueOrThrow({
        where: { id: createdRule.id },
        include: { versions: { orderBy: { validFrom: 'asc' } } },
      });
      return { rule, impact, adjustments };
    });
  }

  async updatePayRule(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, rule.cinemaId);
    const updateData: Record<string, unknown> = {};
    if (body?.name !== undefined) {
      const name = normalizeName(body.name);
      const normalizedNameKey = nameKey(name);
      const duplicate = await this.prisma.payRule.findFirst({
        where: { cinemaId, nameKey: normalizedNameKey, id: { not: payRuleId } },
        select: { id: true },
      });
      if (duplicate) throw new BadRequestException('Der findes allerede en tillægsregel med samme navn.');
      updateData.name = name;
      updateData.nameKey = normalizedNameKey;
    }
    if (body?.description !== undefined) {
      updateData.description =
        typeof body.description === 'string' ? body.description.trim() || null : null;
    }
    if (body?.priority !== undefined) {
      const priority = Number(body.priority);
      if (!Number.isInteger(priority)) throw new BadRequestException('Prioritet skal være et helt tal.');
      updateData.priority = priority;
    }
    if (body?.stackingMode !== undefined) {
      const stackingMode = String(body.stackingMode).toUpperCase();
      if (!['STACK', 'EXCLUSIVE'].includes(stackingMode)) {
        throw new BadRequestException('Vælg en gyldig kombination af tillæg.');
      }
      const exclusiveGroup =
        typeof body?.exclusiveGroup === 'string' && body.exclusiveGroup.trim()
          ? body.exclusiveGroup.trim()
          : null;
      if (stackingMode === 'EXCLUSIVE' && !exclusiveGroup) {
        throw new BadRequestException('Eksklusive tillæg skal have en gruppe.');
      }
      updateData.stackingMode = stackingMode;
      updateData.exclusiveGroup = exclusiveGroup;
    }
    if (body?.payrollTypeId !== undefined) {
      const payrollTypeId = body.payrollTypeId
        ? normalizePositiveId(body.payrollTypeId, 'Eksportkode')
        : null;
      if (payrollTypeId) {
        const payrollType = await this.prisma.payrollType.findFirst({
          where: { id: payrollTypeId, cinemaId, isActive: true },
          select: { id: true },
        });
        if (!payrollType) throw new BadRequestException('Eksportkoden tilhører ikke biografen.');
      }
      updateData.payrollTypeId = payrollTypeId;
    }
    return this.prisma.payRule.update({ where: { id: payRuleId }, data: updateData });
  }

  async copyPayRule(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const source = await this.prisma.payRule.findUnique({
      where: { id: payRuleId },
      include: {
        versions: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { validFrom: 'asc' },
        },
      },
    });
    if (!source) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, source.cinemaId);
    const requestedName =
      typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null;

    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 2_000_000_000 + source.id);
      let copiedName = requestedName;
      if (!copiedName) {
        for (let number = 1; number < 10_000; number += 1) {
          const candidate =
            number === 1 ? `${source.name} (kopi)` : `${source.name} (kopi ${number})`;
          const duplicate = await tx.payRule.findFirst({
            where: { cinemaId, nameKey: nameKey(candidate) },
            select: { id: true },
          });
          if (!duplicate) {
            copiedName = candidate;
            break;
          }
        }
      }
      if (!copiedName) throw new BadRequestException('Kunne ikke finde et unikt navn til kopien.');
      copiedName = normalizeName(copiedName);
      const copiedNameKey = nameKey(copiedName);
      const duplicate = await tx.payRule.findFirst({
        where: { cinemaId, nameKey: copiedNameKey },
        select: { id: true },
      });
      if (duplicate) throw new BadRequestException('Der findes allerede en tillægsregel med samme navn.');

      const copied = await tx.payRule.create({
        data: {
          cinemaId,
          name: copiedName,
          nameKey: copiedNameKey,
          description: source.description,
          ruleKind: source.ruleKind,
          stackingMode: source.stackingMode,
          exclusiveGroup: source.exclusiveGroup,
          priority: source.priority,
          payrollTypeId: source.payrollTypeId,
          isActive: true,
        },
      });
      for (const version of source.versions) {
        const change = await tx.payrollConfigurationChange.create({
          data: {
            cinemaId,
            type: 'PAY_RULE',
            payRuleId: copied.id,
            validFrom: version.validFrom,
            oldValue: Prisma.JsonNull,
            newValue: {
              copiedFromPayRuleId: source.id,
              copiedFromVersionId: version.id,
              calculationType: version.calculationType,
              value: version.value.toString(),
            },
            reason: `Kopieret fra tillægsregel #${source.id}.`,
            createdByUserId: user.sub,
          },
        });
        await tx.payRuleVersion.create({
          data: {
            payRuleId: copied.id,
            validFrom: version.validFrom,
            validTo: version.validTo,
            calculationType: version.calculationType,
            value: version.value,
            windowStartMinute: version.windowStartMinute,
            windowEndMinute: version.windowEndMinute,
            weekdays: version.weekdays,
            specialDayType: version.specialDayType,
            jobFunctionId: version.jobFunctionId,
            isEnabled: version.isEnabled,
            status: resolveVersionStatus(version.validFrom, version.validTo),
            changeId: change.id,
            createdByUserId: user.sub,
            reason: `Kopieret fra tillægsregel #${source.id}.`,
          },
        });
      }
      return tx.payRule.findUniqueOrThrow({
        where: { id: copied.id },
        include: { versions: { orderBy: { validFrom: 'asc' } } },
      });
    });
  }

  private normalizePayRuleVersion(rule: any, body: any) {
    const calculationType = String(body?.calculationType ?? '').toUpperCase();
    if (!['FIXED_PER_HOUR', 'PERCENT_OF_BASE'].includes(calculationType)) {
      throw new BadRequestException('Vælg fast tillæg eller procenttillæg.');
    }
    const value = normalizeMoney(body?.value, 'Tillæg');
    const normalized: any = {
      calculationType,
      value,
      windowStartMinute: body?.windowStartMinute ?? null,
      windowEndMinute: body?.windowEndMinute ?? null,
      weekdays: Array.isArray(body?.weekdays)
        ? Array.from(new Set(body.weekdays.map(Number))).filter(
            (weekday: number) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7,
          )
        : [],
      specialDayType: body?.specialDayType ?? null,
      jobFunctionId: body?.jobFunctionId
        ? normalizePositiveId(body.jobFunctionId, 'Jobfunktion')
        : null,
    };
    if (rule.ruleKind === 'TIME_WINDOW') {
      for (const field of ['windowStartMinute', 'windowEndMinute']) {
        if (!Number.isInteger(Number(normalized[field]))) {
          throw new BadRequestException('Tidsreglen skal have start- og sluttid.');
        }
        normalized[field] = Number(normalized[field]);
      }
    }
    if (rule.ruleKind === 'WEEKDAY' && normalized.weekdays.length === 0) {
      throw new BadRequestException('Vælg mindst én ugedag.');
    }
    if (rule.ruleKind === 'HOLIDAY' && !normalized.specialDayType) {
      throw new BadRequestException('Vælg typen af særlig dag.');
    }
    if (rule.ruleKind === 'JOB_FUNCTION' && !normalized.jobFunctionId) {
      throw new BadRequestException('Vælg jobfunktionen for særreglen.');
    }
    return normalized;
  }

  async previewPayRuleVersion(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    ensurePayrollAccess(user);
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, rule.cinemaId);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const proposedValue = this.normalizePayRuleVersion(rule, body);
    return this.buildImpactPreview({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RULE',
      payRuleId,
      proposedValue,
    });
  }

  async createPayRuleVersion(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    ensurePayrollAccess(user);
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, rule.cinemaId);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const proposedValue = this.normalizePayRuleVersion(rule, body);
    const reason = normalizeReason(body?.reason);
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RULE',
      payRuleId,
      proposedValue,
      reason,
      confirmationToken: body?.confirmationToken,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 2_000_000_000 + payRuleId);
      if (proposedValue.jobFunctionId) {
        const jobFunction = await tx.jobFunction.findFirst({
          where: { id: proposedValue.jobFunctionId, cinemaId },
          select: { id: true },
        });
        if (!jobFunction) throw new BadRequestException('Jobfunktionen tilhører ikke biografen.');
      }
      const versions = await tx.payRuleVersion.findMany({
        where: { payRuleId, status: { not: 'CANCELLED' } },
        orderBy: { validFrom: 'asc' },
      });
      const plan = planVersionInsertion(versions, validFrom);
      const previous = plan.previousVersionId
        ? versions.find((version) => version.id === plan.previousVersionId) ?? null
        : null;
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'PAY_RULE',
          payRuleId,
          validFrom,
          oldValue: previous
            ? {
                calculationType: previous.calculationType,
                value: previous.value.toString(),
              }
            : Prisma.JsonNull,
          newValue: proposedValue,
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      if (plan.previousVersionId) {
        await tx.payRuleVersion.update({
          where: { id: plan.previousVersionId },
          data: {
            validTo: validFrom,
            status: resolveVersionStatus(previous!.validFrom, validFrom),
          },
        });
      }
      const created = await tx.payRuleVersion.create({
        data: {
          payRuleId,
          ...proposedValue,
          validFrom,
          validTo: plan.newValidTo,
          status: resolveVersionStatus(validFrom, plan.newValidTo),
          changeId: change.id,
          createdByUserId: user.sub,
          reason,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { version: created, change, impact, adjustments };
    });
    return result;
  }

  async previewPayRuleDeactivation(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({
      where: { id: payRuleId },
      include: {
        versions: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { validFrom: 'asc' },
        },
      },
    });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, rule.cinemaId);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    resolveVersionForDeactivation(rule.versions, validFrom);
    return this.buildImpactPreview({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RULE',
      payRuleId,
      proposedValue: { isEnabled: false },
    });
  }

  async deactivatePayRule(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    body: any,
  ) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, rule.cinemaId);
    const validFrom = parsePayrollValidFrom(body?.validFrom);
    const reason = normalizeReason(body?.reason);
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom,
      kind: 'PAY_RULE',
      payRuleId,
      proposedValue: { isEnabled: false },
      reason,
      confirmationToken: body?.confirmationToken,
    });

    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 2_000_000_000 + payRuleId);
      const versions = await tx.payRuleVersion.findMany({
        where: { payRuleId, status: { not: 'CANCELLED' } },
        orderBy: { validFrom: 'asc' },
      });
      const source = resolveVersionForDeactivation(versions, validFrom);
      const plan = planVersionInsertion(versions, validFrom);
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'PAY_RULE',
          payRuleId,
          validFrom,
          oldValue: {
            versionId: source.id,
            isEnabled: source.isEnabled,
            calculationType: source.calculationType,
            value: source.value.toString(),
          },
          newValue: { isEnabled: false },
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      await tx.payRuleVersion.update({
        where: { id: source.id },
        data: {
          validTo: validFrom,
          status: resolveVersionStatus(source.validFrom, validFrom),
        },
      });
      const deactivation = await tx.payRuleVersion.create({
        data: {
          payRuleId,
          validFrom,
          validTo: plan.newValidTo,
          calculationType: source.calculationType,
          value: source.value,
          windowStartMinute: source.windowStartMinute,
          windowEndMinute: source.windowEndMinute,
          weekdays: source.weekdays,
          specialDayType: source.specialDayType,
          jobFunctionId: source.jobFunctionId,
          isEnabled: false,
          status: resolveVersionStatus(validFrom, plan.newValidTo),
          changeId: change.id,
          createdByUserId: user.sub,
          reason,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { version: deactivation, change, impact, adjustments };
    });
  }

  async deleteScheduledPayRuleVersion(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    versionIdValue: number,
    body: any,
  ) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const versionId = normalizePositiveId(versionIdValue, 'Regelversion');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    this.resolveCinemaId(user, rule.cinemaId);
    const reason = normalizeReason(body?.reason);

    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 2_000_000_000 + payRuleId);
      const version = await tx.payRuleVersion.findFirst({
        where: { id: versionId, payRuleId },
        include: {
          _count: {
            select: {
              calculationLines: true,
              payrollAdjustments: true,
            },
          },
        },
      });
      if (!version) throw new NotFoundException('Regelversionen blev ikke fundet.');
      assertCanDeleteScheduledPayRuleVersion({
        validFrom: version.validFrom,
        status: version.status,
        calculationLineCount: version._count.calculationLines,
        adjustmentCount: version._count.payrollAdjustments,
      });
      const previous = await tx.payRuleVersion.findFirst({
        where: {
          payRuleId,
          status: { not: 'CANCELLED' },
          validFrom: { lt: version.validFrom },
        },
        orderBy: { validFrom: 'desc' },
      });
      const next = await tx.payRuleVersion.findFirst({
        where: {
          payRuleId,
          status: { not: 'CANCELLED' },
          validFrom: { gt: version.validFrom },
        },
        orderBy: { validFrom: 'asc' },
      });
      const cancelledAt = new Date();
      await tx.payrollConfigurationChange.create({
        data: {
          cinemaId: rule.cinemaId,
          type: 'PAY_RULE',
          payRuleId,
          validFrom: version.validFrom,
          oldValue: {
            versionId: version.id,
            status: version.status,
            validFrom: version.validFrom.toISOString(),
            validTo: version.validTo?.toISOString() ?? null,
            isEnabled: version.isEnabled,
          },
          newValue: {
            versionId: version.id,
            status: 'CANCELLED',
            cancelledAt: cancelledAt.toISOString(),
          },
          reason,
          createdByUserId: user.sub,
        },
      });
      await tx.payRuleVersion.update({
        where: { id: version.id },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          cancelledByUserId: user.sub,
          cancellationReason: reason,
        },
      });
      if (previous) {
        await tx.payRuleVersion.update({
          where: { id: previous.id },
          data: {
            validTo: next?.validFrom ?? null,
            status: resolveVersionStatus(previous.validFrom, next?.validFrom ?? null),
          },
        });
      }
      const remainingVersionCount = await tx.payRuleVersion.count({
        where: { payRuleId, status: { not: 'CANCELLED' } },
      });
      if (remainingVersionCount === 0) {
        await tx.payRule.update({
          where: { id: payRuleId },
          data: { isActive: false, archivedAt: new Date() },
        });
      }
      return { deletedVersionId: version.id, reason };
    });
  }

  async cancelFuturePayRuleVersion(
    user: PayrollAuthUser,
    payRuleIdValue: number,
    versionIdValue: number,
    body: any,
  ) {
    return this.deleteScheduledPayRuleVersion(
      user,
      payRuleIdValue,
      versionIdValue,
      body,
    );
  }

  async archivePayRule(user: PayrollAuthUser, payRuleIdValue: number) {
    const payRuleId = normalizePositiveId(payRuleIdValue, 'Tillægsregel');
    const rule = await this.prisma.payRule.findUnique({ where: { id: payRuleId } });
    if (!rule) throw new NotFoundException('Tillægsreglen blev ikke fundet.');
    this.resolveCinemaId(user, rule.cinemaId);
    const versionCount = await this.prisma.payRuleVersion.count({
      where: { payRuleId, status: { not: 'CANCELLED' } },
    });
    if (versionCount > 0) {
      throw new BadRequestException(
        'En tillægsregel med versionshistorik skal deaktiveres fra en dato og kan ikke arkiveres direkte.',
      );
    }
    return this.prisma.payRule.update({
      where: { id: payRuleId },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  async listSpecialDays(user: PayrollAuthUser, cinemaIdValue: number) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const [days, changes] = await Promise.all([
      this.prisma.cinemaSpecialDay.findMany({
        where: { cinemaId },
        orderBy: [{ localDate: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.payrollConfigurationChange.findMany({
        where: { cinemaId, type: 'SPECIAL_DAY' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return { days, changes };
  }

  private normalizeSpecialDay(body: any) {
    const name = normalizeName(body?.name);
    const localDateText = String(body?.localDate ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDateText)) {
      throw new BadRequestException('Angiv en gyldig dato for den særlige dag.');
    }
    const localDate = new Date(`${localDateText}T00:00:00.000Z`);
    const type = String(body?.type ?? '').toUpperCase();
    if (!['PUBLIC_HOLIDAY', 'CUSTOM'].includes(type)) {
      throw new BadRequestException('Vælg en gyldig type særlig dag.');
    }
    return { name, localDate, type: type as 'PUBLIC_HOLIDAY' | 'CUSTOM' };
  }

  async previewSpecialDay(
    user: PayrollAuthUser,
    cinemaIdValue: number,
    body: any,
  ) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const normalized = this.normalizeSpecialDay(body);
    return this.buildImpactPreview({
      user,
      cinemaId,
      validFrom: normalized.localDate,
      kind: 'SPECIAL_DAY',
      proposedValue: {
        name: normalized.name,
        localDate: normalized.localDate.toISOString().slice(0, 10),
        type: normalized.type,
        isActive: body?.isActive !== false,
      },
    });
  }

  async createSpecialDay(user: PayrollAuthUser, cinemaIdValue: number, body: any) {
    const cinemaId = this.resolveCinemaId(user, cinemaIdValue);
    const normalized = this.normalizeSpecialDay(body);
    const reason = normalizeReason(body?.reason);
    const proposedValue = {
      name: normalized.name,
      localDate: normalized.localDate.toISOString().slice(0, 10),
      type: normalized.type,
      isActive: true,
    };
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom: normalized.localDate,
      kind: 'SPECIAL_DAY',
      proposedValue,
      reason,
      confirmationToken: body?.confirmationToken,
    });
    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 3_000_000_000 + cinemaId);
      const day = await tx.cinemaSpecialDay.create({
        data: {
          cinemaId,
          ...normalized,
          createdByUserId: user.sub,
        },
      });
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'SPECIAL_DAY',
          specialDayId: day.id,
          validFrom: day.localDate,
          oldValue: Prisma.JsonNull,
          newValue: { ...proposedValue, specialDayId: day.id },
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { day, change, impact, adjustments };
    });
  }

  async updateSpecialDay(
    user: PayrollAuthUser,
    specialDayIdValue: number,
    body: any,
  ) {
    const specialDayId = normalizePositiveId(specialDayIdValue, 'Særlig dag');
    const existing = await this.prisma.cinemaSpecialDay.findUnique({ where: { id: specialDayId } });
    if (!existing) throw new NotFoundException('Den særlige dag blev ikke fundet.');
    const cinemaId = this.resolveCinemaId(user, existing.cinemaId);
    const normalized = this.normalizeSpecialDay({
      name: body?.name ?? existing.name,
      localDate: body?.localDate ?? existing.localDate.toISOString().slice(0, 10),
      type: body?.type ?? existing.type,
    });
    const isActive = body?.isActive === undefined ? existing.isActive : Boolean(body.isActive);
    const reason = normalizeReason(body?.reason);
    const proposedValue = {
      name: normalized.name,
      localDate: normalized.localDate.toISOString().slice(0, 10),
      type: normalized.type,
      isActive,
    };
    const validFrom = existing.localDate < normalized.localDate ? existing.localDate : normalized.localDate;
    const impact = await this.verifyImpact({
      user,
      cinemaId,
      validFrom,
      kind: 'SPECIAL_DAY',
      proposedValue,
      reason,
      confirmationToken: body?.confirmationToken,
    });
    return this.prisma.$transaction(async (tx) => {
      await this.acquireVersionLock(tx, 3_000_000_000 + cinemaId);
      const day = await tx.cinemaSpecialDay.update({
        where: { id: specialDayId },
        data: {
          ...normalized,
          isActive,
          archivedAt: isActive ? null : new Date(),
        },
      });
      const change = await tx.payrollConfigurationChange.create({
        data: {
          cinemaId,
          type: 'SPECIAL_DAY',
          specialDayId,
          validFrom,
          oldValue: {
            name: existing.name,
            localDate: existing.localDate.toISOString().slice(0, 10),
            type: existing.type,
            isActive: existing.isActive,
          },
          newValue: { ...proposedValue, specialDayId },
          impactSummary: JSON.parse(JSON.stringify(impact)),
          reason,
          createdByUserId: user.sub,
        },
      });
      const adjustments =
        await this.retroactiveAdjustments.createForConfigurationChange(tx, {
          changeId: change.id,
          cinemaId,
          closedPeriodIds: impact.closedPeriodIds,
          createdByUserId: user.sub,
          reason,
        });
      return { day, change, impact, adjustments };
    });
  }

  async archiveSpecialDay(
    user: PayrollAuthUser,
    specialDayIdValue: number,
    body: any,
  ) {
    return this.updateSpecialDay(user, specialDayIdValue, {
      ...body,
      isActive: false,
    });
  }

}
