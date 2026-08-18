"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import { apiFetch } from "@/app/lib/api";

export type PayrollMode = "HOURS_ONLY" | "SIMPLE" | "ADVANCED";

type Version = {
  id: number;
  mode: PayrollMode;
  validFrom: string;
  validTo: string | null;
  status: string;
  reason?: string | null;
};

type Configuration = {
  current: Version | null;
  next: Version | null;
  versions: Version[];
};

type Impact = {
  totalEntryCount: number;
  openEntryCount: number;
  lockedEntryCount: number;
  exportedEntryCount: number;
  requiresReason: boolean;
  requiresConfirmation: boolean;
  confirmationToken: string;
};

type CinemaSettingsPayrollModeSectionProps = {
  cinemaId: number;
  onModeChange?: (mode: PayrollMode) => void;
};

const labels: Record<PayrollMode, string> = {
  HOURS_ONLY: "Kun timer",
  SIMPLE: "Simpel løn",
  ADVANCED: "Avanceret løn",
};

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

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.message === "string" ? body.message : fallback;
}

export default function CinemaSettingsPayrollModeSection({
  cinemaId,
  onModeChange,
}: CinemaSettingsPayrollModeSectionProps) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [mode, setMode] = useState<PayrollMode>("HOURS_ONLY");
  const [validFrom, setValidFrom] = useState(localDateValue);
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<Impact | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await apiFetch(`/cinemas/${cinemaId}/payroll-configuration`);
    if (!response.ok) {
      throw new Error(await errorMessage(response, "Lønmodellen kunne ikke hentes."));
    }

    const data = (await response.json()) as Configuration;
    const currentMode = data.current?.mode ?? "HOURS_ONLY";
    setConfiguration(data);
    setMode(data.current?.mode ?? data.next?.mode ?? "HOURS_ONLY");
    onModeChange?.(data.current?.mode ?? data.next?.mode ?? currentMode);
  }, [cinemaId, onModeChange]);

  useEffect(() => {
    setError(null);
    void load().catch((loadError) =>
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Lønmodellen kunne ikke hentes.",
      ),
    );
  }, [load]);

  const proposedValidFrom = useMemo(
    () => (/^\d{4}-\d{2}-\d{2}$/.test(validFrom) ? validFrom : null),
    [validFrom],
  );

  const reasonRequired = impact?.requiresReason ?? false;

  async function preview() {
    if (!proposedValidFrom) {
      setError("Angiv en gyldig dato for 'Gælder fra'.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const response = await apiFetch(
        `/cinemas/${cinemaId}/payroll-configuration/impact-preview`,
        {
          method: "POST",
          body: JSON.stringify({ mode, validFrom: proposedValidFrom }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, "Konsekvensen kunne ikke beregnes."),
        );
      }
      setImpact((await response.json()) as Impact);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Konsekvensen kunne ikke beregnes.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!impact) {
      setError("Beregn konsekvensen, før lønmodellen gemmes.");
      return;
    }
    if (impact.requiresReason && !reason.trim()) {
      setError("En ændring med en tidligere startdato kræver en begrundelse.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const response = await apiFetch(
        `/cinemas/${cinemaId}/payroll-configuration/versions`,
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            validFrom: proposedValidFrom,
            reason: reason.trim() || null,
            confirmationToken: impact.confirmationToken,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, "Lønmodellen kunne ikke gemmes."),
        );
      }
      await load();
      setImpact(null);
      setReason("");
      setMessage("Lønmodellen er gemt som en ny version.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Lønmodellen kunne ikke gemmes.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
      <h3 className="font-semibold text-slate-950 dark:text-white">Lønmodel</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Aktuel model: <strong>{labels[configuration?.current?.mode ?? "HOURS_ONLY"]}</strong>.
        Ændringer gemmes som nye versioner og kræver en startdato.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="text-sm font-medium">
          <div>{"G\u00e6lder fra dato"}</div>
          <ProjectDatePicker
            value={validFrom}
            onChange={(nextValue) => {
              setValidFrom(nextValue);
              setImpact(null);
            }}
            disabled={busy}
            clearable
            className="mt-2"
            ariaLabel={"V\u00e6lg dato l\u00f8nmodellen g\u00e6lder fra"}
          />
        </div>

        <label className="text-sm font-medium">
          {reasonRequired
            ? "Begrundelse for den tidligere startdato"
            : "Bemærkning til ændringen (valgfri)"}
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            required={reasonRequired}
            placeholder={
              reasonRequired
                ? "Beskriv hvorfor ændringen skal gælde fra en tidligere dato"
                : "Eksempel: Ny lønaftale fra næste måned"
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>

      {reasonRequired && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Startdatoen ligger før i dag. Beskriv hvorfor ændringen skal gælde
          fra denne dato. Låste og eksporterede lønperioder ændres ikke; en
          eventuel forskel håndteres som efterregulering.
        </p>
      )}

      {impact && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <p className="font-semibold">Konsekvens</p>
          <p className="mt-1">
            {impact.openEntryCount} åbne, {impact.lockedEntryCount} låste og {impact.exportedEntryCount} eksporterede tidsregistreringer berøres.
          </p>
          {impact.requiresConfirmation && (
            <p className="mt-1 font-semibold">
              Afsluttede perioder ændres ikke; forskellen oprettes som efterregulering.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 text-sm font-semibold text-green-700 dark:text-green-300">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void preview()}
          disabled={busy}
          className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:text-blue-200"
        >
          Beregn konsekvens
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !impact}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Gem ny version
        </button>
      </div>

      {configuration?.versions?.length ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold">
            Versionshistorik ({configuration.versions.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {configuration.versions
              .slice()
              .reverse()
              .map((version) => (
                <li
                  key={version.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <strong>{labels[version.mode]}</strong> · fra {new Date(version.validFrom).toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" })}
                  {version.validTo
                    ? ` til ${new Date(version.validTo).toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" })}`
                    : ""} · {version.status}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
