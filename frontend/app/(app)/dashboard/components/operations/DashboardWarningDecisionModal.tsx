"use client";

import { useEffect, useState } from "react";
import type { DashboardOperationalWarning } from "../../helpers/dashboardOperationsHorizon";

type Props = {
  warning: DashboardOperationalWarning | null;
  action: "IGNORED" | "REOPENED";
  saving: boolean;
  onClose: () => void;
  onConfirm: (note: string | null) => void | Promise<void>;
};

export default function DashboardWarningDecisionModal({
  warning,
  action,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
  }, [warning?.key, action]);

  if (!warning) return null;

  const ignoring = action === "IGNORED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-warning-decision-title"
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <h2
          id="dashboard-warning-decision-title"
          className="text-xl font-bold text-gray-950 dark:text-white"
        >
          {ignoring ? "Ignorer advarsel" : "Genåbn advarsel"}
        </h2>
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <div className="font-semibold text-gray-950 dark:text-white">
            {warning.label}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {warning.details}
          </p>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {ignoring
            ? "Advarslen fjernes fra Kræver handling, men beslutningen gemmes i historikken."
            : "Advarslen bliver aktiv igen, hvis forholdet stadig findes."}
        </p>
        <label className="mt-4 block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Begrundelse (valgfri)
          <textarea
            value={note}
            maxLength={500}
            disabled={saving}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            placeholder={ignoring ? "Fx ekstra leder er til stede" : "Fx situationen skal vurderes igen"}
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            Annuller
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onConfirm(note.trim() || null)}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {saving
              ? "Gemmer..."
              : ignoring
                ? "Ignorer advarsel"
                : "Genåbn advarsel"}
          </button>
        </div>
      </div>
    </div>
  );
}
