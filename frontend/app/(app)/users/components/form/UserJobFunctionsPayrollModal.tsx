"use client";

import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { User } from "../../helpers/core/userTypes";

type JobFunction = { id: number; name: string; color: string; isActive: boolean; sortOrder?: number };
type Assignment = { jobFunctionId: number; jobFunction?: JobFunction };
type PayRateVersion = { id: number; hourlyRate: string | number; currencyCode: string; validFrom: string; validTo: string | null; status: string; reason?: string | null };
type PayrollMode = "HOURS_ONLY" | "SIMPLE" | "ADVANCED";
type Impact = { openEntryCount: number; lockedEntryCount: number; exportedEntryCount: number; requiresReason: boolean; requiresConfirmation: boolean; confirmationToken: string };

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
async function message(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.message === "string" ? body.message : fallback;
}

export default function UserJobFunctionsPayrollModal({ user, cinemaId, canManagePayroll, onClose }: { user: User | null; cinemaId: number | null; canManagePayroll: boolean; onClose: () => void }) {
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [payrollMode, setPayrollMode] = useState<PayrollMode>("HOURS_ONLY");
  const [rates, setRates] = useState<PayRateVersion[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [validFrom, setValidFrom] = useState(localDateValue);
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !cinemaId) return;
    setLoading(true); setError(null);
    try {
      const responses = await Promise.all([
        apiFetch(`/job-functions?cinemaId=${cinemaId}`),
        apiFetch(`/users/${user.id}/job-functions?cinemaId=${cinemaId}`),
        ...(canManagePayroll
          ? [
              apiFetch(`/cinemas/${cinemaId}/payroll-configuration`),
              apiFetch(`/users/${user.id}/cinemas/${cinemaId}/pay-rates`),
            ]
          : []),
      ]);
      const [functionsResponse, assignmentsResponse, configResponse, ratesResponse] = responses;
      const expectedResponses: Array<[Response | undefined, string]> = [
        [functionsResponse, "Jobfunktioner kunne ikke hentes."],
        [assignmentsResponse, "Medarbejderens jobfunktioner kunne ikke hentes."],
      ];
      if (canManagePayroll) {
        expectedResponses.push(
          [configResponse, "Lønmodellen kunne ikke hentes."],
          [ratesResponse, "Lønhistorikken kunne ikke hentes."],
        );
      }
      for (const [response, fallback] of expectedResponses) {
        if (!response?.ok) throw new Error(response ? await message(response, fallback) : fallback);
      }
      const functions = (await functionsResponse.json()) as JobFunction[];
      const assignments = (await assignmentsResponse.json()) as Assignment[];
      setJobFunctions(Array.isArray(functions) ? functions.filter((item) => item.isActive) : []);
      setSelectedIds(new Set((Array.isArray(assignments) ? assignments : []).map((item) => item.jobFunctionId)));
      if (canManagePayroll && configResponse && ratesResponse) {
        const config = await configResponse.json();
        const rateData = await ratesResponse.json();
        setPayrollMode(config?.current?.mode ?? "HOURS_ONLY");
        setRates(Array.isArray(rateData?.versions) ? rateData.versions : []);
      } else {
        setPayrollMode("HOURS_ONLY");
        setRates([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Oplysningerne kunne ikke hentes.");
    } finally { setLoading(false); }
  }, [canManagePayroll, cinemaId, user]);

  useEffect(() => { if (user) void load(); }, [load, user]);
  const name = useMemo(() => user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "", [user]);
  if (!user) return null;
  const userId = user.id;

  function toggle(id: number) {
    setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function saveJobFunctions() {
    if (!cinemaId) return;
    try {
      setSaving(true); setError(null); setSuccess(null);
      const response = await apiFetch(`/users/${userId}/job-functions?cinemaId=${cinemaId}`, {
        method: "PUT", body: JSON.stringify({ cinemaId, jobFunctionIds: [...selectedIds] }),
      });
      if (!response.ok) throw new Error(await message(response, "Jobfunktionerne kunne ikke gemmes."));
      setSuccess("Jobfunktionerne er gemt og er de samme som på jobfunktionssiden.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Jobfunktionerne kunne ikke gemmes."); }
    finally { setSaving(false); }
  }

  function validFromDate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
      throw new Error("Angiv en gyldig 'Gælder fra'-dato.");
    }
    return validFrom;
  }

  async function previewRate() {
    if (!cinemaId) return;
    try {
      setSaving(true); setError(null); setSuccess(null);
      const response = await apiFetch(`/users/${userId}/cinemas/${cinemaId}/pay-rates/impact-preview`, {
        method: "POST", body: JSON.stringify({ hourlyRate, validFrom: validFromDate() }),
      });
      if (!response.ok) throw new Error(await message(response, "Konsekvensen kunne ikke beregnes."));
      setImpact((await response.json()) as Impact);
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "Konsekvensen kunne ikke beregnes."); }
    finally { setSaving(false); }
  }

  async function saveRate() {
    if (!cinemaId || !impact) return;
    if (impact.requiresReason && !reason.trim()) { setError("En lønændring med en tidligere startdato kræver en begrundelse."); return; }
    try {
      setSaving(true); setError(null); setSuccess(null);
      const response = await apiFetch(`/users/${userId}/cinemas/${cinemaId}/pay-rates`, {
        method: "POST", body: JSON.stringify({ hourlyRate, validFrom: validFromDate(), reason: reason.trim() || null, confirmationToken: impact.confirmationToken }),
      });
      if (!response.ok) throw new Error(await message(response, "Lønsatsen kunne ikke gemmes."));
      setHourlyRate(""); setReason(""); setImpact(null); setSuccess("Lønsatsen er gemt som en ny version."); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Lønsatsen kunne ikke gemmes."); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{canManagePayroll ? "Jobfunktioner og løn" : "Jobfunktioner"}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{name}</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border px-3 py-2">Luk</button></div>
      {loading ? <p className="mt-6">Henter oplysninger...</p> : <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"><h3 className="font-bold">Jobfunktioner</h3><p className="mt-1 text-sm text-gray-500">Samme kvalifikationsrelation som under Jobfunktion → Medarbejdere.</p><div className="mt-4 space-y-2">{jobFunctions.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} disabled={saving} /><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} /><span>{item.name}</span></label>)}</div><button type="button" onClick={() => void saveJobFunctions()} disabled={saving} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white">Gem jobfunktioner</button></section>
        {canManagePayroll && <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"><h3 className="font-bold">Løn</h3><p className="mt-1 text-sm text-gray-500">Biografens model: {payrollMode === "HOURS_ONLY" ? "Kun timer" : payrollMode === "SIMPLE" ? "Simpel løn" : "Avanceret løn"}.</p>{payrollMode === "HOURS_ONLY" ? <p className="mt-4 rounded-xl bg-gray-100 p-3 text-sm dark:bg-gray-800">Systemet beregner ikke lønbeløb i denne tilstand.</p> : user.employmentType !== "HOURLY" ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Fastlønnede får ikke beregnet timeløn i denne version.</p> : <><div className="mt-4 grid gap-3"><label className="text-sm font-medium">Ny timeløn (DKK)<input type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => { setHourlyRate(event.target.value); setImpact(null); }} className="mt-1 w-full rounded-xl border p-3 dark:bg-gray-950" /></label><div className="text-sm font-medium">
  <div>{"G\u00e6lder fra dato"}</div>
  <ProjectDatePicker
    value={validFrom}
    onChange={(value) => {
      setValidFrom(value);
      setImpact(null);
    }}
    className="mt-1"
    ariaLabel={
      "V\u00e6lg dato l\u00f8nsatsen g\u00e6lder fra"
    }
  />
</div><label className="text-sm font-medium">{impact?.requiresReason ? "Begrundelse for den tidligere startdato" : "Bemærkning til ændringen (valgfri)"}<input value={reason} onChange={(event) => setReason(event.target.value)} required={impact?.requiresReason ?? false} placeholder={impact?.requiresReason ? "Beskriv hvorfor lønsatsen skal gælde fra en tidligere dato" : "Valgfri intern bemærkning"} className="mt-1 w-full rounded-xl border p-3 dark:bg-gray-950" /></label>{impact?.requiresReason && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Startdatoen ligger før i dag. Afsluttede lønperioder ændres ikke; en eventuel forskel håndteres som efterregulering.</p>}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => void previewRate()} disabled={saving || !hourlyRate} className="rounded-xl border border-blue-300 px-3 py-2 text-sm font-semibold">Beregn konsekvens</button><button type="button" onClick={() => void saveRate()} disabled={saving || !impact} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Gem lønversion</button></div>{impact && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">{impact.openEntryCount} åbne, {impact.lockedEntryCount} låste og {impact.exportedEntryCount} eksporterede registreringer berøres. Afsluttede perioder reguleres uden at blive ændret.</p>}</>}
          {rates.length > 0 && <details className="mt-5"><summary className="cursor-pointer font-semibold">Lønhistorik ({rates.length})</summary><ul className="mt-2 space-y-2 text-sm">{rates.slice().reverse().map((rate) => <li key={rate.id} className="rounded-lg border p-2"><strong>{Number(rate.hourlyRate).toLocaleString("da-DK", { minimumFractionDigits: 2 })} {rate.currencyCode}/time</strong><br />Fra {new Date(rate.validFrom).toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" })}{rate.validTo ? ` til ${new Date(rate.validTo).toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" })}` : ""} · {rate.status}</li>)}</ul></details>}
        </section>}
      </div>}
      {error && <p role="alert" className="mt-4 font-semibold text-red-700 dark:text-red-300">{error}</p>}{success && <p className="mt-4 font-semibold text-green-700 dark:text-green-300">{success}</p>}
    </div>
  </div>;
}
