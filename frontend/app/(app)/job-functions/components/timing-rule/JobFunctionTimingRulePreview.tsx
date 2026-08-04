"use client";

import { useState } from "react";
import { apiFetch } from "@/app/lib/api";

type Preview = {
  usedFallback: boolean;
  startMinute: number;
  endMinute: number;
  sourceMovieShowings: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
  }>;
  explanation: {
    restrictMovieStartsToWindow: boolean;
    filmWindowStartMinute: number;
    filmWindowEndMinute: number;
    rawStartMinute: number;
    rawEndMinute: number;
    offsetStartMinute: number;
    offsetEndMinute: number;
    limitedStartMinute: number;
    limitedEndMinute: number;
    roundedStartMinute: number;
    roundedEndMinute: number;
  };
};

function todayKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatMinute(minute: number) {
  const dayOffset = Math.floor(minute / 1440);
  const normalized = ((minute % 1440) + 1440) % 1440;
  const text = `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  return dayOffset > 0 ? `${text} (+${dayOffset} dag)` : text;
}

async function readError(response: Response) {
  const body = await response.json().catch(() => null);
  return typeof body?.message === "string" ? body.message : "Forhåndsvisningen kunne ikke beregnes.";
}

export default function JobFunctionTimingRulePreview({
  jobFunctionId,
  disabled,
}: {
  jobFunctionId: number;
  disabled: boolean;
}) {
  const [date, setDate] = useState(todayKey);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`/job-functions/${jobFunctionId}/resolve-time-preview`, {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setPreview(await response.json());
    } catch (previewError) {
      setPreview(null);
      setError(previewError instanceof Error ? previewError.message : "Forhåndsvisningen kunne ikke beregnes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <h3 className="font-semibold text-blue-950 dark:text-blue-100">Forhåndsvis beregnet vagt</h3>
      <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
        Gem tidsreglen først. Vælg derefter en dato for at se filmgrundlag, fallback og den endelige tid.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium text-blue-950 dark:text-blue-100">
          Dato
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={disabled || loading}
            className="mt-1 block rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-950 dark:border-blue-800 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadPreview()}
          disabled={disabled || loading || !date}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Beregner..." : "Beregn vagt"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
      {preview && (
        <div className="mt-3 space-y-2 text-sm text-blue-950 dark:text-blue-100">
          <p><strong>Resultat:</strong> {formatMinute(preview.startMinute)}–{formatMinute(preview.endMinute)}{preview.usedFallback ? " · fallback anvendt" : ""}</p>
          <p><strong>Film:</strong> {preview.sourceMovieShowings.length > 0 ? preview.sourceMovieShowings.map((showing) => showing.title).join(", ") : "Ingen film anvendt"}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              {preview.explanation.restrictMovieStartsToWindow
                ? `Filmstarter fra ${formatMinute(preview.explanation.filmWindowStartMinute)} og før ${formatMinute(preview.explanation.filmWindowEndMinute)}`
                : "Alle filmstarter kan medregnes"}
            </li>
            <li>Før forskydning: {formatMinute(preview.explanation.rawStartMinute)}–{formatMinute(preview.explanation.rawEndMinute)}</li>
            <li>Efter forskydning: {formatMinute(preview.explanation.offsetStartMinute)}–{formatMinute(preview.explanation.offsetEndMinute)}</li>
            <li>Endeligt resultat: {formatMinute(preview.explanation.roundedStartMinute)}–{formatMinute(preview.explanation.roundedEndMinute)}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
