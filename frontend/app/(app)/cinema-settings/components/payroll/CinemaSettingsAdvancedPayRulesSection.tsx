"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/app/lib/api";

type RuleKind = "TIME_WINDOW" | "WEEKDAY" | "WEEKEND" | "HOLIDAY" | "JOB_FUNCTION";
type CalculationType = "FIXED_PER_HOUR" | "PERCENT_OF_BASE";

type VersionUser = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type Version = {
  id: number;
  validFrom: string;
  validTo: string | null;
  status: string;
  calculationType: CalculationType;
  value: string | number;
  windowStartMinute?: number | null;
  windowEndMinute?: number | null;
  weekdays?: number[];
  specialDayType?: "PUBLIC_HOLIDAY" | "CUSTOM" | null;
  jobFunctionId?: number | null;
  isEnabled?: boolean;
  reason?: string | null;
  createdAt?: string | null;
  createdByUser?: VersionUser | null;
  cancelledAt?: string | null;
  cancelledByUser?: VersionUser | null;
  cancellationReason?: string | null;
  _count?: { calculationLines?: number; payrollAdjustments?: number };
};

type PayRule = {
  id: number;
  name: string;
  description?: string | null;
  ruleKind: RuleKind;
  stackingMode: "STACK" | "EXCLUSIVE";
  exclusiveGroup?: string | null;
  priority: number;
  payrollTypeId?: number | null;
  isActive: boolean;
  versions: Version[];
};

type SpecialDay = {
  id: number;
  localDate: string;
  name: string;
  type: "PUBLIC_HOLIDAY" | "CUSTOM";
  isActive: boolean;
};

type Impact = {
  openEntryCount: number;
  lockedEntryCount: number;
  exportedEntryCount: number;
  requiresReason: boolean;
  requiresConfirmation: boolean;
  confirmationToken: string;
};

type Option = { id: number; name: string; isActive?: boolean };


type PayRuleModal = "CREATE" | "VERSION" | "HISTORY" | "DEACTIVATE" | "SPECIAL_DAYS" | null;

function PayrollModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"} overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Luk
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const ruleKindLabels: Record<RuleKind, string> = {
  TIME_WINDOW: "Tidsrum",
  WEEKDAY: "Ugedag",
  WEEKEND: "Weekend",
  HOLIDAY: "Særlig dag",
  JOB_FUNCTION: "Jobfunktion",
};
const weekdayOptions = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 7, label: "Søndag" },
];

function localDateValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
}

function dateFromMinute(value?: number | null) {
  const minute = Math.max(0, Number(value ?? 0));
  return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatLocalDate(value?: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" });
}

function formatLocalDateTime(value?: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function displayUser(user?: VersionUser | null) {
  if (!user) return "Ukendt bruger";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || `Bruger #${user.id}`;
}

function versionStatusLabel(version: Version) {
  if (version.status === "CANCELLED") return "Annulleret";
  const now = Date.now();
  const starts = new Date(version.validFrom).getTime();
  const ends = version.validTo ? new Date(version.validTo).getTime() : null;
  if (starts > now) return version.isEnabled === false ? "Planlagt deaktivering" : "Planlagt";
  if (ends !== null && ends <= now) return "Erstattet";
  return version.isEnabled === false ? "Deaktiveret" : "Gældende";
}

function versionConditionLabel(version: Version, rule: PayRule, jobFunctions: Option[]) {
  if (rule.ruleKind === "TIME_WINDOW" && version.windowStartMinute != null && version.windowEndMinute != null) {
    return `Tidsrum ${dateFromMinute(version.windowStartMinute)}–${dateFromMinute(version.windowEndMinute)}`;
  }
  if (rule.ruleKind === "WEEKDAY") {
    const labels = weekdayOptions.filter((option) => version.weekdays?.includes(option.value)).map((option) => option.label);
    return labels.length > 0 ? labels.join(", ") : "Ingen ugedage valgt";
  }
  if (rule.ruleKind === "WEEKEND") return "Lørdag og søndag";
  if (rule.ruleKind === "HOLIDAY") return version.specialDayType === "PUBLIC_HOLIDAY" ? "Helligdage" : "Andre særlige dage";
  if (rule.ruleKind === "JOB_FUNCTION") {
    return jobFunctions.find((item) => item.id === version.jobFunctionId)?.name ?? `Jobfunktion #${version.jobFunctionId ?? "?"}`;
  }
  return "–";
}

function canDeleteScheduledVersion(version: Version) {
  if (version.status === "CANCELLED") return false;
  const unused = (version._count?.calculationLines ?? 0) === 0 && (version._count?.payrollAdjustments ?? 0) === 0;
  return unused && new Date(version.validFrom).getTime() > Date.now();
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return typeof body?.message === "string" ? body.message : fallback;
}

export default function CinemaSettingsAdvancedPayRulesSection({ cinemaId }: { cinemaId: number }) {
  const [rules, setRules] = useState<PayRule[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [exportCodes, setExportCodes] = useState<Option[]>([]);
  const [jobFunctions, setJobFunctions] = useState<Option[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<PayRuleModal>(null);

  const [ruleName, setRuleName] = useState("");
  const [ruleKind, setRuleKind] = useState<RuleKind>("TIME_WINDOW");
  const [stackingMode, setStackingMode] = useState<"STACK" | "EXCLUSIVE">("STACK");
  const [exclusiveGroup, setExclusiveGroup] = useState("");
  const [priority, setPriority] = useState("0");
  const [payrollTypeId, setPayrollTypeId] = useState("");

  const [draftValidFrom, setDraftValidFrom] = useState(localDateValue);
  const [draftValue, setDraftValue] = useState("");
  const [draftWindowStart, setDraftWindowStart] = useState("18:00");
  const [draftWindowEnd, setDraftWindowEnd] = useState("23:59");
  const [draftWeekdays, setDraftWeekdays] = useState<number[]>([]);
  const [draftSpecialDayType, setDraftSpecialDayType] = useState<"PUBLIC_HOLIDAY" | "CUSTOM">("PUBLIC_HOLIDAY");
  const [draftJobFunctionId, setDraftJobFunctionId] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [draftImpact, setDraftImpact] = useState<Impact | null>(null);

  const [validFrom, setValidFrom] = useState("");
  const [calculationType, setCalculationType] = useState<CalculationType>("FIXED_PER_HOUR");
  const [value, setValue] = useState("");
  const [windowStart, setWindowStart] = useState("18:00");
  const [windowEnd, setWindowEnd] = useState("23:59");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [specialDayType, setSpecialDayType] = useState<"PUBLIC_HOLIDAY" | "CUSTOM">("PUBLIC_HOLIDAY");
  const [jobFunctionId, setJobFunctionId] = useState("");
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<Impact | null>(null);

  const [deactivationDate, setDeactivationDate] = useState("");
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivationImpact, setDeactivationImpact] = useState<Impact | null>(null);

  const [dayName, setDayName] = useState("");
  const [dayDate, setDayDate] = useState("");
  const [dayType, setDayType] = useState<"PUBLIC_HOLIDAY" | "CUSTOM">("PUBLIC_HOLIDAY");
  const [dayReason, setDayReason] = useState("");
  const [dayImpact, setDayImpact] = useState<Impact | null>(null);

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId && rule.versions.length > 0) ?? null,
    [rules, selectedRuleId],
  );

  const currentEffectiveVersion = useMemo(() => {
    if (!selectedRule) return null;
    const now = Date.now();
    return selectedRule.versions
      .filter((version) => version.status !== "CANCELLED")
      .filter((version) => {
        const starts = new Date(version.validFrom).getTime();
        const ends = version.validTo ? new Date(version.validTo).getTime() : null;
        return starts <= now && (ends === null || now < ends);
      })
      .sort((left, right) => new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime())[0] ?? null;
  }, [selectedRule]);

  useEffect(() => {
    setValidFrom("");
    setImpact(null);
    setReason("");
    setDeactivationDate("");
    setDeactivationReason("");
    setDeactivationImpact(null);
  }, [selectedRuleId]);


  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, busy]);

  const load = useCallback(async () => {
    const [rulesResponse, daysResponse, codesResponse, functionsResponse] = await Promise.all([
      apiFetch(`/pay-rules?cinemaId=${cinemaId}`),
      apiFetch(`/payroll-special-days?cinemaId=${cinemaId}`),
      apiFetch(`/payroll-types?cinemaId=${cinemaId}`),
      apiFetch(`/job-functions?cinemaId=${cinemaId}&includeArchived=false`),
    ]);
    for (const [response, fallback] of [
      [rulesResponse, "Tillægsreglerne kunne ikke hentes."],
      [daysResponse, "Særlige dage kunne ikke hentes."],
      [codesResponse, "Eksportkoderne kunne ikke hentes."],
      [functionsResponse, "Jobfunktionerne kunne ikke hentes."],
    ] as const) {
      if (!response.ok) throw new Error(await readError(response, fallback));
    }
    const [ruleData, dayData, codeData, functionData] = await Promise.all([
      rulesResponse.json(), daysResponse.json(), codesResponse.json(), functionsResponse.json(),
    ]);
    setRules(Array.isArray(ruleData) ? ruleData : []);
    setSpecialDays(Array.isArray(dayData?.days) ? dayData.days : Array.isArray(dayData) ? dayData : []);
    setExportCodes(Array.isArray(codeData) ? codeData.filter((item: Option) => item.isActive !== false) : []);
    setJobFunctions(Array.isArray(functionData) ? functionData.filter((item: Option) => item.isActive !== false) : []);
    if (Array.isArray(ruleData)) {
      const firstCompleteRule = ruleData.find(
        (rule: PayRule) => rule.isActive && rule.versions.length > 0,
      );
      setSelectedRuleId((current) => {
        if (current && ruleData.some((rule: PayRule) => rule.id === current && rule.versions.length > 0)) {
          return current;
        }
        return firstCompleteRule?.id ?? null;
      });
    }
  }, [cinemaId]);

  useEffect(() => {
    setError(null);
    void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Lønopsætningen kunne ikke hentes."));
  }, [load]);

  function versionBody() {
    const body: Record<string, unknown> = {
      validFrom,
      calculationType,
      value: Number(value),
      reason: reason.trim() || null,
    };
    if (selectedRule?.ruleKind === "TIME_WINDOW") {
      body.windowStartMinute = minutesFromTime(windowStart);
      body.windowEndMinute = minutesFromTime(windowEnd);
    }
    if (selectedRule?.ruleKind === "WEEKDAY") body.weekdays = weekdays;
    if (selectedRule?.ruleKind === "HOLIDAY") body.specialDayType = specialDayType;
    if (selectedRule?.ruleKind === "JOB_FUNCTION") body.jobFunctionId = Number(jobFunctionId);
    return body;
  }

  function draftVersionBody() {
    const body: Record<string, unknown> = {
      validFrom: draftValidFrom,
      calculationType: "FIXED_PER_HOUR",
      value: Number(draftValue),
      reason: draftReason.trim() || null,
    };
    if (ruleKind === "TIME_WINDOW") {
      body.windowStartMinute = minutesFromTime(draftWindowStart);
      body.windowEndMinute = minutesFromTime(draftWindowEnd);
    }
    if (ruleKind === "WEEKDAY") body.weekdays = draftWeekdays;
    if (ruleKind === "HOLIDAY") body.specialDayType = draftSpecialDayType;
    if (ruleKind === "JOB_FUNCTION") body.jobFunctionId = Number(draftJobFunctionId);
    return body;
  }

  function draftRuleBody() {
    return {
      name: ruleName.trim(),
      ruleKind,
      stackingMode,
      exclusiveGroup: stackingMode === "EXCLUSIVE" ? exclusiveGroup.trim() : null,
      priority: Number(priority),
      payrollTypeId: payrollTypeId ? Number(payrollTypeId) : null,
      firstVersion: draftVersionBody(),
    };
  }

  function resetDraftImpact() {
    setDraftImpact(null);
  }

  function resetRuleDraft() {
    setRuleName("");
    setRuleKind("TIME_WINDOW");
    setStackingMode("STACK");
    setExclusiveGroup("");
    setPriority("0");
    setPayrollTypeId("");
    setDraftValidFrom(localDateValue());
    setDraftValue("");
    setDraftWindowStart("18:00");
    setDraftWindowEnd("23:59");
    setDraftWeekdays([]);
    setDraftSpecialDayType("PUBLIC_HOLIDAY");
    setDraftJobFunctionId("");
    setDraftReason("");
    setDraftImpact(null);
  }

  function resetSpecialDayDraft() {
    setDayName("");
    setDayDate("");
    setDayType("PUBLIC_HOLIDAY");
    setDayReason("");
    setDayImpact(null);
  }

  function changeRuleKind(nextRuleKind: RuleKind) {
    setRuleKind(nextRuleKind);
    resetDraftImpact();
    if (nextRuleKind !== "HOLIDAY") resetSpecialDayDraft();
    if (nextRuleKind !== "WEEKDAY") setDraftWeekdays([]);
    if (nextRuleKind !== "JOB_FUNCTION") setDraftJobFunctionId("");
  }

  function validateDraftVersion() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftValidFrom)) {
      return "Angiv hvilken dato den første version skal gælde fra.";
    }
    if (!draftValue || Number(draftValue) <= 0) {
      return "Angiv tillægget i kroner pr. time.";
    }
    if (ruleKind === "TIME_WINDOW" && (minutesFromTime(draftWindowStart) === null || minutesFromTime(draftWindowEnd) === null)) {
      return "Angiv både start- og sluttid for tidsrummet.";
    }
    if (ruleKind === "WEEKDAY" && draftWeekdays.length === 0) {
      return "Vælg mindst én ugedag.";
    }
    if (ruleKind === "JOB_FUNCTION" && !draftJobFunctionId) {
      return "Vælg mindst én jobfunktion.";
    }
    return null;
  }


  async function previewInitialRule() {
    if (!ruleName.trim()) return setError("Angiv et navn til tillægsreglen.");
    const draftError = validateDraftVersion();
    if (draftError) return setError(draftError);
    if (stackingMode === "EXCLUSIVE" && !exclusiveGroup.trim()) {
      return setError("Angiv et navn på gruppen, hvor kun ét tillæg må bruges.");
    }
    if (stackingMode === "EXCLUSIVE" && !Number.isInteger(Number(priority))) {
      return setError("Prioritet skal være et helt tal.");
    }
    setDraftImpact(null);
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/impact-preview?cinemaId=${cinemaId}`, {
        method: "POST",
        body: JSON.stringify(draftRuleBody()),
      });
      if (!response.ok) throw new Error(await readError(response, "Konsekvensen kunne ikke beregnes."));
      setDraftImpact(await response.json());
    } catch (actionError) {
      setDraftImpact(null);
      setError(actionError instanceof Error ? actionError.message : "Konsekvensen kunne ikke beregnes.");
    } finally { setBusy(false); }
  }

  async function createRule() {
    if (!draftImpact) return setError("Beregn konsekvensen først.");
    if (draftImpact.requiresReason && !draftReason.trim()) {
      return setError("En ændring med en tidligere startdato kræver en begrundelse.");
    }
    try {
      setBusy(true); setError(null); setMessage(null);
      const body = draftRuleBody();
      body.firstVersion = {
        ...(body.firstVersion as Record<string, unknown>),
        confirmationToken: draftImpact.confirmationToken,
      };
      const response = await apiFetch(`/pay-rules?cinemaId=${cinemaId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response, "Tillægsreglen kunne ikke oprettes."));
      const created = await response.json();
      const createdRule = created?.rule ?? created;
      resetRuleDraft();
      setSelectedRuleId(createdRule.id);
      setMessage("Tillægsreglen og dens første version er gemt.");
      setModal(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Tillægsreglen kunne ikke oprettes.");
    } finally { setBusy(false); }
  }

  async function previewVersion() {
    if (!selectedRule) return setError("Vælg en tillægsregel.");
    if (!value || Number(value) < 0) return setError("Angiv et gyldigt tillæg.");
    setImpact(null);
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/${selectedRule.id}/versions/impact-preview`, { method: "POST", body: JSON.stringify(versionBody()) });
      if (!response.ok) throw new Error(await readError(response, "Konsekvensen kunne ikke beregnes."));
      setImpact(await response.json());
    } catch (actionError) {
      setImpact(null);
      setError(actionError instanceof Error ? actionError.message : "Konsekvensen kunne ikke beregnes.");
    }
    finally { setBusy(false); }
  }

  async function saveVersion() {
    if (!selectedRule || !impact) return setError("Beregn konsekvensen først.");
    if (impact.requiresReason && !reason.trim()) return setError("En ændring med en tidligere startdato kræver en begrundelse.");
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/${selectedRule.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ ...versionBody(), confirmationToken: impact.confirmationToken }),
      });
      if (!response.ok) throw new Error(await readError(response, "Regelversionen kunne ikke gemmes."));
      setImpact(null); setReason(""); setValue(""); setMessage("Tillægsreglen er gemt som en ny version.");
      setModal(null);
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Regelversionen kunne ikke gemmes."); }
    finally { setBusy(false); }
  }

  async function previewDeactivation() {
    if (!selectedRule) return setError("Vælg en tillægsregel.");
    if (!deactivationDate) return setError("Vælg datoen, hvor reglen skal deaktiveres.");
    setDeactivationImpact(null);
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/${selectedRule.id}/deactivation/impact-preview`, {
        method: "POST",
        body: JSON.stringify({ validFrom: deactivationDate, reason: deactivationReason.trim() || null }),
      });
      if (!response.ok) throw new Error(await readError(response, "Konsekvensen kunne ikke beregnes."));
      setDeactivationImpact(await response.json());
    } catch (actionError) {
      setDeactivationImpact(null);
      setError(actionError instanceof Error ? actionError.message : "Konsekvensen kunne ikke beregnes.");
    } finally { setBusy(false); }
  }

  async function deactivateRule() {
    if (!selectedRule || !deactivationImpact) return setError("Beregn konsekvensen først.");
    if (deactivationImpact.requiresReason && !deactivationReason.trim()) {
      return setError("En deaktivering med en tidligere startdato kræver en begrundelse.");
    }
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/${selectedRule.id}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          validFrom: deactivationDate,
          reason: deactivationReason.trim() || null,
          confirmationToken: deactivationImpact.confirmationToken,
        }),
      });
      if (!response.ok) throw new Error(await readError(response, "Tillægsreglen kunne ikke deaktiveres."));
      setDeactivationDate("");
      setDeactivationReason("");
      setDeactivationImpact(null);
      setMessage("Tillægsreglen er deaktiveret fra den valgte dato. Historiske beregninger er bevaret.");
      setModal(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Tillægsreglen kunne ikke deaktiveres.");
    } finally { setBusy(false); }
  }

  async function deleteScheduledVersion(rule: PayRule, version: Version) {
    const reason = window.prompt(
      `Slet den planlagte version fra ${formatLocalDate(version.validFrom)}? Valgfri begrundelse:`,
      "",
    );
    if (reason === null) return;
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/pay-rules/${rule.id}/versions/${version.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!response.ok) throw new Error(await readError(response, "Den planlagte version kunne ikke slettes."));
      setMessage("Den planlagte version er slettet. Handlingen er bevaret i historikken.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Den planlagte version kunne ikke slettes.");
    } finally { setBusy(false); }
  }

  async function copyRule(rule: PayRule) {
    try {
      setBusy(true); setError(null);
      const response = await apiFetch(`/pay-rules/${rule.id}/copy`, { method: "POST", body: JSON.stringify({}) });
      if (!response.ok) throw new Error(await readError(response, "Tillægsreglen kunne ikke kopieres."));
      const copied = await response.json(); setSelectedRuleId(copied.id); setMessage("Tillægsreglen er kopieret."); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Tillægsreglen kunne ikke kopieres."); }
    finally { setBusy(false); }
  }

  function specialDayBody() {
    return { name: dayName.trim(), localDate: dayDate, type: dayType, reason: dayReason.trim() || null };
  }

  async function previewDay() {
    if (!dayName.trim() || !dayDate) return setError("Angiv navn og dato for den særlige dag.");
    setDayImpact(null);
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/payroll-special-days/impact-preview?cinemaId=${cinemaId}`, { method: "POST", body: JSON.stringify(specialDayBody()) });
      if (!response.ok) throw new Error(await readError(response, "Konsekvensen kunne ikke beregnes."));
      setDayImpact(await response.json());
    } catch (actionError) {
      setDayImpact(null);
      setError(actionError instanceof Error ? actionError.message : "Konsekvensen kunne ikke beregnes.");
    }
    finally { setBusy(false); }
  }

  async function saveDay() {
    if (!dayImpact) return setError("Beregn konsekvensen først.");
    if (dayImpact.requiresReason && !dayReason.trim()) return setError("En særlig dag med en tidligere dato kræver en begrundelse.");
    try {
      setBusy(true); setError(null); setMessage(null);
      const response = await apiFetch(`/payroll-special-days?cinemaId=${cinemaId}`, {
        method: "POST", body: JSON.stringify({ ...specialDayBody(), confirmationToken: dayImpact.confirmationToken }),
      });
      if (!response.ok) throw new Error(await readError(response, "Den særlige dag kunne ikke gemmes."));
      setDayName(""); setDayDate(""); setDayReason(""); setDayImpact(null); setMessage("Den særlige dag er gemt."); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Den særlige dag kunne ikke gemmes."); }
    finally { setBusy(false); }
  }

  async function archiveDay(day: SpecialDay) {
    const archiveReason = window.prompt("Begrundelse for arkivering (obligatorisk, når arkiveringen skal gælde fra en tidligere dato):", "") ?? "";
    try {
      setBusy(true); setError(null);
      const previewResponse = await apiFetch(`/payroll-special-days/impact-preview?cinemaId=${cinemaId}`, {
        method: "POST", body: JSON.stringify({ name: day.name, localDate: day.localDate.slice(0, 10), type: day.type, isActive: false }),
      });
      if (!previewResponse.ok) throw new Error(await readError(previewResponse, "Konsekvensen kunne ikke beregnes."));
      const archiveImpact = (await previewResponse.json()) as Impact;
      if (archiveImpact.requiresReason && !archiveReason.trim()) throw new Error("Arkiveringen kræver en begrundelse.");
      const response = await apiFetch(`/payroll-special-days/${day.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: archiveReason.trim() || null, confirmationToken: archiveImpact.confirmationToken }),
      });
      if (!response.ok) throw new Error(await readError(response, "Den særlige dag kunne ikke arkiveres."));
      setMessage("Den særlige dag er arkiveret."); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Den særlige dag kunne ikke arkiveres."); }
    finally { setBusy(false); }
  }


  function openCreateModal() {
    resetRuleDraft();
    setError(null);
    setMessage(null);
    setModal("CREATE");
  }

  function openVersionModal(rule: PayRule) {
    const source = rule.versions
      .filter((version) => version.status !== "CANCELLED")
      .slice()
      .sort((left, right) => new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime())[0];
    setSelectedRuleId(rule.id);
    setValidFrom("");
    setCalculationType(source?.calculationType ?? "FIXED_PER_HOUR");
    setValue(source ? String(source.value) : "");
    setWindowStart(dateFromMinute(source?.windowStartMinute ?? 18 * 60));
    setWindowEnd(dateFromMinute(source?.windowEndMinute ?? 23 * 60 + 59));
    setWeekdays(source?.weekdays ?? []);
    setSpecialDayType(source?.specialDayType ?? "PUBLIC_HOLIDAY");
    setJobFunctionId(source?.jobFunctionId ? String(source.jobFunctionId) : "");
    setReason("");
    setImpact(null);
    setError(null);
    setMessage(null);
    setModal("VERSION");
  }

  function openHistoryModal(rule: PayRule) {
    setSelectedRuleId(rule.id);
    setError(null);
    setMessage(null);
    setModal("HISTORY");
  }

  function openDeactivationModal(rule: PayRule) {
    setSelectedRuleId(rule.id);
    setDeactivationDate("");
    setDeactivationReason("");
    setDeactivationImpact(null);
    setError(null);
    setMessage(null);
    setModal("DEACTIVATE");
  }

  function openSpecialDaysModal() {
    setError(null);
    setMessage(null);
    setModal("SPECIAL_DAYS");
  }

  function closeModal() {
    if (!busy) setModal(null);
  }

  function effectiveVersion(rule: PayRule) {
    const now = Date.now();
    return rule.versions
      .filter((version) => version.status !== "CANCELLED")
      .filter((version) => {
        const starts = new Date(version.validFrom).getTime();
        const ends = version.validTo ? new Date(version.validTo).getTime() : null;
        return starts <= now && (ends === null || now < ends);
      })
      .sort((left, right) => new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime())[0] ?? null;
  }

  function nextScheduledVersion(rule: PayRule) {
    const now = Date.now();
    return rule.versions
      .filter((version) => version.status !== "CANCELLED" && new Date(version.validFrom).getTime() > now)
      .sort((left, right) => new Date(left.validFrom).getTime() - new Date(right.validFrom).getTime())[0] ?? null;
  }

  function compactVersionValue(version: Version | null) {
    if (!version) return "Ingen gældende version";
    if (version.isEnabled === false) return "Deaktiveret";
    return version.calculationType === "PERCENT_OF_BASE"
      ? `${version.value}% af grundløn`
      : `${version.value} kr. pr. time`;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">Avancerede lønregler</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Tillæg og ændringer administreres én opgave ad gangen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openSpecialDaysModal}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-600 dark:hover:bg-slate-900"
          >
            Administrér særlige dage
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Opret tillægsregel
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
      {message && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">{message}</p>}

      <div className="mt-5 space-y-3">
        {rules.filter((rule) => rule.isActive && rule.versions.length > 0).map((rule) => {
          const current = effectiveVersion(rule);
          const next = nextScheduledVersion(rule);
          const conditionSource = current ?? next;
          const status = current
            ? current.isEnabled === false ? "Deaktiveret" : "Gældende"
            : next ? "Planlagt" : "Historisk";
          return (
            <article key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-950 dark:text-white">{rule.name}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{ruleKindLabels[rule.ruleKind]}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Gældende" ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200" : status === "Deaktiveret" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"}`}>{status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                    <p><span className="font-medium">Aktuel virkning:</span><br />{compactVersionValue(current)}</p>
                    <p><span className="font-medium">Betingelse:</span><br />{conditionSource ? versionConditionLabel(conditionSource, rule, jobFunctions) : "–"}</p>
                    <p><span className="font-medium">Næste ændring:</span><br />{next ? `${versionStatusLabel(next)} fra ${formatLocalDate(next.validFrom)}` : "Ingen planlagt ændring"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openVersionModal(rule)} className="rounded-lg border border-blue-400 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950/30">Ny version</button>
                  <button type="button" onClick={() => openHistoryModal(rule)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">Historik</button>
                  {current?.isEnabled !== false && current && (
                    <button type="button" onClick={() => openDeactivationModal(rule)} className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/30">Deaktiver</button>
                  )}
                  <button type="button" disabled={busy} onClick={() => void copyRule(rule)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800">Kopiér</button>
                </div>
              </div>
            </article>
          );
        })}
        {rules.filter((rule) => rule.isActive && rule.versions.length > 0).length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-medium">Der er ingen tillægsregler endnu.</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Opret den første regel, når biografen skal bruge avanceret løn.</p>
          </div>
        )}
      </div>

      {modal === "CREATE" && (
        <PayrollModal title="Opret tillægsregel" onClose={closeModal} wide>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h5 className="font-semibold">Grundoplysninger</h5>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Navn<input className={fieldClass} value={ruleName} onChange={(event) => { setRuleName(event.target.value); resetDraftImpact(); }} placeholder="Eksempel: Aftentillæg" /></label>
                <label className="text-sm">Type<select className={fieldClass} value={ruleKind} onChange={(event) => changeRuleKind(event.target.value as RuleKind)}>{Object.entries(ruleKindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              </div>

              <h5 className="mt-6 font-semibold">Hvornår gælder tillægget?</h5>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ruleKind === "TIME_WINDOW" && <><label className="text-sm">Fra kl.<input className={fieldClass} type="time" value={draftWindowStart} onChange={(event) => { setDraftWindowStart(event.target.value); resetDraftImpact(); }} /></label><label className="text-sm">Til kl.<input className={fieldClass} type="time" value={draftWindowEnd} onChange={(event) => { setDraftWindowEnd(event.target.value); resetDraftImpact(); }} /></label><p className="text-xs leading-5 text-slate-600 dark:text-slate-300 sm:col-span-2">Er sluttidspunktet lig med eller tidligere end starttidspunktet, fortsætter tidsrummet efter midnat.</p></>}
                {ruleKind === "WEEKDAY" && <fieldset className="sm:col-span-2"><legend className="text-sm">Ugedage</legend><div className="mt-2 flex flex-wrap gap-2">{weekdayOptions.map((day) => <label key={day.value} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"><input type="checkbox" checked={draftWeekdays.includes(day.value)} onChange={(event) => { setDraftWeekdays((current) => event.target.checked ? [...current, day.value].sort((left, right) => left - right) : current.filter((item) => item !== day.value)); resetDraftImpact(); }} /> {day.label}</label>)}</div></fieldset>}
                {ruleKind === "WEEKEND" && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100 sm:col-span-2">Weekend betyder lørdag og søndag.</p>}
                {ruleKind === "HOLIDAY" && <label className="text-sm sm:col-span-2">Gælder på<select className={fieldClass} value={draftSpecialDayType} onChange={(event) => { setDraftSpecialDayType(event.target.value as "PUBLIC_HOLIDAY" | "CUSTOM"); resetDraftImpact(); }}><option value="PUBLIC_HOLIDAY">Helligdage</option><option value="CUSTOM">Andre særlige dage</option></select><span className="mt-2 block text-xs text-slate-600 dark:text-slate-300">De konkrete datoer administreres separat fra regeloversigten.</span></label>}
                {ruleKind === "JOB_FUNCTION" && <label className="text-sm sm:col-span-2">Jobfunktion<select className={fieldClass} value={draftJobFunctionId} onChange={(event) => { setDraftJobFunctionId(event.target.value); resetDraftImpact(); }}><option value="">Vælg jobfunktion</option>{jobFunctions.map((jobFunction) => <option key={jobFunction.id} value={jobFunction.id}>{jobFunction.name}</option>)}</select></label>}
              </div>
            </div>

            <div>
              <h5 className="font-semibold">Løn og gyldighed</h5>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Gælder fra dato<input className={fieldClass} type="date" value={draftValidFrom} onChange={(event) => { setDraftValidFrom(event.target.value); resetDraftImpact(); }} /></label>
                <label className="text-sm">Tillæg pr. time<div className="relative"><input className={`${fieldClass} pr-12`} type="number" min="0.01" step="0.01" value={draftValue} onChange={(event) => { setDraftValue(event.target.value); resetDraftImpact(); }} placeholder="0,00" /><span className="pointer-events-none absolute bottom-2 right-3 text-sm text-slate-500">kr.</span></div></label>
                <label className="text-sm sm:col-span-2">Kan tillægget lægges sammen med andre tillæg?<select className={fieldClass} value={stackingMode} onChange={(event) => { setStackingMode(event.target.value as "STACK" | "EXCLUSIVE"); if (event.target.value === "STACK") setExclusiveGroup(""); resetDraftImpact(); }}><option value="STACK">Ja, læg det sammen med andre tillæg</option><option value="EXCLUSIVE">Nej, brug kun ét tillæg fra denne gruppe</option></select></label>
                {stackingMode === "EXCLUSIVE" && <><label className="text-sm">Navn på tillægsgruppe<input className={fieldClass} value={exclusiveGroup} onChange={(event) => { setExclusiveGroup(event.target.value); resetDraftImpact(); }} placeholder="Eksempel: Tidstillæg" /></label><label className="text-sm">Prioritet<input className={fieldClass} type="number" step="1" value={priority} onChange={(event) => { setPriority(event.target.value); resetDraftImpact(); }} /></label><p className="text-xs leading-5 text-slate-600 dark:text-slate-300 sm:col-span-2">Højeste prioritet vinder. Regler i samme gruppe må ikke have samme prioritet.</p></>}
                <label className="text-sm">Eksportkode<select className={fieldClass} value={payrollTypeId} onChange={(event) => { setPayrollTypeId(event.target.value); resetDraftImpact(); }}><option value="">Ingen særskilt kode</option>{exportCodes.map((code) => <option key={code.id} value={code.id}>{code.name}</option>)}</select></label>
                <label className="text-sm sm:col-span-2">{draftImpact?.requiresReason ? "Begrundelse for den tidligere startdato" : "Bemærkning (valgfri)"}<input className={fieldClass} value={draftReason} onChange={(event) => { setDraftReason(event.target.value); resetDraftImpact(); }} required={draftImpact?.requiresReason ?? false} placeholder={draftImpact?.requiresReason ? "Beskriv hvorfor reglen skal gælde fra en tidligere dato" : "Valgfri intern bemærkning"} /></label>
              </div>
            </div>
          </div>
          {draftImpact?.requiresReason && <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Startdatoen ligger før i dag. Afsluttede lønperioder ændres ikke; en eventuel forskel håndteres som efterregulering.</p>}
          {draftImpact && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{draftImpact.openEntryCount} åbne, {draftImpact.lockedEntryCount} låste og {draftImpact.exportedEntryCount} eksporterede registreringer berøres.</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Annuller</button><button type="button" disabled={busy} onClick={() => void previewInitialRule()} className="rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold disabled:opacity-50">Beregn konsekvens</button><button type="button" disabled={busy || !draftImpact} onClick={() => void createRule()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Opret regel</button></div>
        </PayrollModal>
      )}

      {modal === "VERSION" && selectedRule && (
        <PayrollModal title={`Ny version af ${selectedRule.name}`} onClose={closeModal}>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          {currentEffectiveVersion?.isEnabled === false && <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">Reglen er deaktiveret. Den nye version genaktiverer reglen fra den valgte dato.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Gælder fra dato<input className={fieldClass} type="date" value={validFrom} onChange={(event) => { setValidFrom(event.target.value); setImpact(null); }} /></label>
            <label className="text-sm">Beregning<select className={fieldClass} value={calculationType} onChange={(event) => { setCalculationType(event.target.value as CalculationType); setImpact(null); }}><option value="FIXED_PER_HOUR">Fast beløb pr. time</option><option value="PERCENT_OF_BASE">Procent af grundløn</option></select></label>
            <label className="text-sm">{calculationType === "PERCENT_OF_BASE" ? "Procent" : "Beløb pr. time"}<input className={fieldClass} type="number" min="0" step="0.01" value={value} onChange={(event) => { setValue(event.target.value); setImpact(null); }} /></label>
            {selectedRule.ruleKind === "TIME_WINDOW" && <><label className="text-sm">Fra kl.<input className={fieldClass} type="time" value={windowStart} onChange={(event) => { setWindowStart(event.target.value); setImpact(null); }} /></label><label className="text-sm">Til kl.<input className={fieldClass} type="time" value={windowEnd} onChange={(event) => { setWindowEnd(event.target.value); setImpact(null); }} /></label></>}
            {selectedRule.ruleKind === "WEEKDAY" && <fieldset className="sm:col-span-2"><legend className="text-sm">Ugedage</legend><div className="mt-2 flex flex-wrap gap-2">{weekdayOptions.map((option) => <label key={option.value} className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"><input type="checkbox" checked={weekdays.includes(option.value)} onChange={(event) => { setWeekdays((current) => event.target.checked ? [...current, option.value].sort((left, right) => left - right) : current.filter((item) => item !== option.value)); setImpact(null); }} /> {option.label}</label>)}</div></fieldset>}
            {selectedRule.ruleKind === "HOLIDAY" && <label className="text-sm">Dagstype<select className={fieldClass} value={specialDayType} onChange={(event) => { setSpecialDayType(event.target.value as "PUBLIC_HOLIDAY" | "CUSTOM"); setImpact(null); }}><option value="PUBLIC_HOLIDAY">Helligdag</option><option value="CUSTOM">Særlig dag</option></select></label>}
            {selectedRule.ruleKind === "JOB_FUNCTION" && <label className="text-sm">Jobfunktion<select className={fieldClass} value={jobFunctionId} onChange={(event) => { setJobFunctionId(event.target.value); setImpact(null); }}><option value="">Vælg</option>{jobFunctions.map((jobFunction) => <option key={jobFunction.id} value={jobFunction.id}>{jobFunction.name}</option>)}</select></label>}
            <label className="text-sm sm:col-span-2">{impact?.requiresReason ? "Begrundelse for den tidligere startdato" : "Bemærkning til ændringen (valgfri)"}<input className={fieldClass} value={reason} onChange={(event) => { setReason(event.target.value); setImpact(null); }} required={impact?.requiresReason ?? false} placeholder={impact?.requiresReason ? "Beskriv hvorfor ændringen skal gælde fra en tidligere dato" : "Valgfri intern bemærkning"} /></label>
          </div>
          {impact?.requiresReason && <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Startdatoen ligger før i dag. Afsluttede lønperioder ændres ikke; en eventuel forskel håndteres som efterregulering.</p>}
          {impact && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{impact.openEntryCount} åbne, {impact.lockedEntryCount} låste og {impact.exportedEntryCount} eksporterede registreringer berøres.</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Annuller</button><button type="button" disabled={busy} onClick={() => void previewVersion()} className="rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold disabled:opacity-50">Beregn konsekvens</button><button type="button" disabled={busy || !impact} onClick={() => void saveVersion()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Gem ny version</button></div>
        </PayrollModal>
      )}

      {modal === "DEACTIVATE" && selectedRule && currentEffectiveVersion && (
        <PayrollModal title={`Deaktiver ${selectedRule.name}`} onClose={closeModal}>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Deaktivering opretter en ny historisk version. Tidligere vagter og afsluttede lønperioder ændres ikke.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Deaktiver fra dato<input className={fieldClass} type="date" value={deactivationDate} onChange={(event) => { setDeactivationDate(event.target.value); setDeactivationImpact(null); }} /></label><label className="text-sm">{deactivationImpact?.requiresReason ? "Begrundelse for den tidligere deaktiveringsdato" : "Bemærkning (valgfri)"}<input className={fieldClass} value={deactivationReason} onChange={(event) => { setDeactivationReason(event.target.value); setDeactivationImpact(null); }} required={deactivationImpact?.requiresReason ?? false} /></label></div>
          {deactivationImpact && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{deactivationImpact.openEntryCount} åbne, {deactivationImpact.lockedEntryCount} låste og {deactivationImpact.exportedEntryCount} eksporterede registreringer berøres.</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Annuller</button><button type="button" disabled={busy} onClick={() => void previewDeactivation()} className="rounded-lg border border-amber-500 px-4 py-2 text-sm font-semibold disabled:opacity-50">Beregn konsekvens</button><button type="button" disabled={busy || !deactivationImpact} onClick={() => void deactivateRule()} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Deaktiver regel</button></div>
        </PayrollModal>
      )}

      {modal === "HISTORY" && selectedRule && (
        <PayrollModal title={`Historik for ${selectedRule.name}`} onClose={closeModal} wide>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">{message}</p>}
          <ul className="space-y-3 text-sm">
            {selectedRule.versions.slice().reverse().map((version) => <li key={version.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{versionStatusLabel(version)}</strong><p className="mt-1 text-slate-600 dark:text-slate-300">Gyldig fra {formatLocalDate(version.validFrom)}{version.validTo ? ` til ${formatLocalDate(version.validTo)}` : " uden slutdato"}</p></div>{canDeleteScheduledVersion(version) && <button type="button" disabled={busy} onClick={() => void deleteScheduledVersion(selectedRule, version)} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Slet planlagt version</button>}</div><dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2"><div><dt className="font-medium">Beregning</dt><dd>{version.calculationType === "PERCENT_OF_BASE" ? `${version.value}% af grundløn` : `${version.value} kr. pr. time`}</dd></div><div><dt className="font-medium">Betingelse</dt><dd>{versionConditionLabel(version, selectedRule, jobFunctions)}</dd></div><div><dt className="font-medium">Virkning</dt><dd>{version.isEnabled === false ? "Reglen er deaktiveret" : "Reglen beregner tillæg"}</dd></div><div><dt className="font-medium">Oprettet</dt><dd>{formatLocalDateTime(version.createdAt)} af {displayUser(version.createdByUser)}</dd></div><div className="sm:col-span-2"><dt className="font-medium">Bemærkning eller begrundelse</dt><dd>{version.reason || "Ingen"}</dd></div><div className="sm:col-span-2"><dt className="font-medium">Anvendelse</dt><dd>{version._count?.calculationLines ?? 0} lønberegningslinjer og {version._count?.payrollAdjustments ?? 0} efterreguleringer</dd></div>{version.status === "CANCELLED" && <div className="sm:col-span-2"><dt className="font-medium">Slettet/annulleret</dt><dd>{formatLocalDateTime(version.cancelledAt)} af {displayUser(version.cancelledByUser)}{version.cancellationReason ? ` · ${version.cancellationReason}` : ""}</dd></div>}</dl></li>)}
          </ul>
        </PayrollModal>
      )}

      {modal === "SPECIAL_DAYS" && (
        <PayrollModal title="Administrér særlige dage" onClose={closeModal} wide>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">{message}</p>}
          <p className="text-sm text-slate-600 dark:text-slate-300">Opret de konkrete datoer, som tillægsregler af typen Særlig dag kan bruge.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4"><label className="text-sm">Navn<input className={fieldClass} value={dayName} onChange={(event) => { setDayName(event.target.value); setDayImpact(null); }} /></label><label className="text-sm">Dato<input className={fieldClass} type="date" value={dayDate} onChange={(event) => { setDayDate(event.target.value); setDayImpact(null); }} /></label><label className="text-sm">Type<select className={fieldClass} value={dayType} onChange={(event) => { setDayType(event.target.value as "PUBLIC_HOLIDAY" | "CUSTOM"); setDayImpact(null); }}><option value="PUBLIC_HOLIDAY">Helligdag</option><option value="CUSTOM">Særlig dag</option></select></label><label className="text-sm">{dayImpact?.requiresReason ? "Begrundelse for den tidligere dato" : "Bemærkning (valgfri)"}<input className={fieldClass} value={dayReason} onChange={(event) => { setDayReason(event.target.value); setDayImpact(null); }} required={dayImpact?.requiresReason ?? false} /></label></div>
          {dayImpact?.requiresReason && <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Datoen ligger før i dag. Afsluttede lønperioder ændres ikke; en eventuel forskel håndteres som efterregulering.</p>}
          {dayImpact && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{dayImpact.openEntryCount} åbne, {dayImpact.lockedEntryCount} låste og {dayImpact.exportedEntryCount} eksporterede registreringer berøres.</p>}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void previewDay()} className="rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold disabled:opacity-50">Beregn konsekvens</button><button type="button" disabled={busy || !dayImpact} onClick={() => void saveDay()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Gem særlig dag</button></div>
          <h5 className="mt-7 font-semibold">Aktive særlige dage</h5>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">{specialDays.filter((day) => day.isActive).map((day) => <li key={day.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><span><strong>{day.name}</strong><br />{new Date(`${day.localDate.slice(0,10)}T12:00:00`).toLocaleDateString("da-DK")} · {day.type === "PUBLIC_HOLIDAY" ? "Helligdag" : "Særlig dag"}</span><button type="button" disabled={busy} className="text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-300" onClick={() => void archiveDay(day)}>Arkivér</button></li>)}</ul>
          {specialDays.filter((day) => day.isActive).length === 0 && <p className="mt-3 text-sm text-slate-500">Der er ingen aktive særlige dage.</p>}
        </PayrollModal>
      )}
    </section>
  );
}
