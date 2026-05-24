"use client";

import type { Shift } from "../../../../shared/types";

type EmergencyReplacement = {
  name: string;
  score: number;
  fatigue: string;
};

type AiSuggestionsPanelProps = {
  shifts: Shift[];
  staffingWarnings: string[];
  staffingSuggestions: string[];
  recommendedEmployees: Record<number, string[]>;
  aiScheduleSuggestions: string[];
  creatingAiShift: number | null;
  liveStaffingAlerts: string[];
  emergencyAiActions: string[];
  autoCreatingEmergencyShift: boolean;
  autoStaffingNotifications: string[];
  suggestedEmergencyReplacements: EmergencyReplacement[];
  sendingEmergencyRequest: string | null;
  autoEscalationQueue: string[];
  sendingRealStaffingMessage: string | null;
  staffingLoopStatus: "IDLE" | "WAITING" | "ACCEPTED" | "DECLINED";
  autonomousStaffingStatus: "IDLE" | "EXECUTING" | "COMPLETED";
  createAiSuggestedShift: (suggestion: string, index: number) => Promise<void>;
  autoCreateEmergencyShift: () => Promise<void>;
  startAutoEscalation: () => Promise<void>;
  sendRealStaffingMessage: (employeeName: string) => Promise<void>;
};

export default function AiSuggestionsPanel({
  shifts,
  staffingWarnings,
  staffingSuggestions,
  recommendedEmployees,
  aiScheduleSuggestions,
  creatingAiShift,
  liveStaffingAlerts,
  emergencyAiActions,
  autoCreatingEmergencyShift,
  autoStaffingNotifications,
  suggestedEmergencyReplacements,
  sendingEmergencyRequest,
  autoEscalationQueue,
  sendingRealStaffingMessage,
  staffingLoopStatus,
  autonomousStaffingStatus,
  createAiSuggestedShift,
  autoCreateEmergencyShift,
  startAutoEscalation,
  sendRealStaffingMessage,
}: AiSuggestionsPanelProps) {
  return (
    <>
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900 dark:bg-green-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl">🤖</div>

          <div>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
              AI Staffing Optimization
            </h2>

            <p className="text-sm text-green-600 dark:text-green-400">
              Systemet foreslår automatisk medarbejdere med lav belastning.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {shifts.slice(0, 5).map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-green-200 bg-white p-4 dark:border-green-900 dark:bg-gray-900"
            >
              <div className="mb-2 text-sm font-semibold">Vagt #{shift.id}</div>

              <div className="space-y-2">
                {(recommendedEmployees[shift.id] || []).map(
                  (recommendation, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
                    >
                      {recommendation}
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl">🔴</div>

          <div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
              LIVE Staffing Alerts
            </h2>

            <p className="text-sm text-red-600 dark:text-red-400">
              Realtidsanalyse af biografens aktuelle staffing pressure.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(liveStaffingAlerts.length > 0
            ? liveStaffingAlerts
            : ["Ingen LIVE staffing alerts lige nu."]
          ).map((alert, index) => (
            <div
              key={index}
              className="rounded-xl border border-red-200 bg-white p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
            >
              {alert}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm dark:border-yellow-900 dark:bg-yellow-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl">🚨</div>

          <div>
            <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              Emergency AI Staffing Actions
            </h2>

            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Systemet anbefaler akut staffing intervention.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(emergencyAiActions.length > 0
            ? emergencyAiActions
            : ["Ingen emergency AI actions lige nu."]
          ).map((action, index) => (
            <div
              key={index}
              className="rounded-xl border border-yellow-200 bg-white p-4 text-sm font-medium text-yellow-700 dark:border-yellow-900 dark:bg-gray-900 dark:text-yellow-300"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>{action}</div>

                <button
                  onClick={autoCreateEmergencyShift}
                  disabled={
                    autoCreatingEmergencyShift ||
                    emergencyAiActions.length === 0
                  }
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  {autoCreatingEmergencyShift
                    ? "Opretter emergency shift..."
                    : emergencyAiActions.length === 0
                      ? "Ingen AI handling nødvendig"
                      : "🚨 Aktivér AI handling"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-300 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl">🤖</div>

          <div>
            <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
              Autonomous Staffing Notifications
            </h2>

            <p className="text-sm text-blue-600 dark:text-blue-400">
              AI-systemet overvåger og reagerer automatisk på driftsbelastning.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(autoStaffingNotifications.length > 0
            ? autoStaffingNotifications
            : ["Ingen autonomous staffing notifications lige nu."]
          ).map((notification, index) => (
            <div
              key={index}
              className="rounded-xl border border-blue-200 bg-white p-4 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
            >
              {notification}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl">🤖</div>

          <div>
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              Suggested Emergency Replacements
            </h2>

            <div className="text-sm text-emerald-600 dark:text-emerald-400">
              AI-systemet foreslår bedst egnede medarbejdere til akut bemanding.
            </div>

            <button
              onClick={startAutoEscalation}
              disabled={
                suggestedEmergencyReplacements.length === 0 ||
                sendingEmergencyRequest !== null
              }
              className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {sendingEmergencyRequest
                ? `Kontakter ${sendingEmergencyRequest}...`
                : "🤖 Start Auto Escalation"}
            </button>
          </div>
        </div>

        {autoEscalationQueue.length > 0 && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900">
            <div className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              AI escalation queue
            </div>

            <div className="mb-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-bold ${
                  staffingLoopStatus === "WAITING"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    : staffingLoopStatus === "ACCEPTED"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : staffingLoopStatus === "DECLINED"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                Staffing loop: {staffingLoopStatus}
              </span>
            </div>

            <div className="mt-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-bold ${
                  autonomousStaffingStatus === "EXECUTING"
                    ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                    : autonomousStaffingStatus === "COMPLETED"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                Autonomous staffing: {autonomousStaffingStatus}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {autoEscalationQueue.map((employee, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {employee}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(suggestedEmergencyReplacements.length > 0
            ? suggestedEmergencyReplacements
            : [
                {
                  name: "Ingen replacements nødvendige",
                  score: 100,
                  fatigue: "LOW",
                },
              ]
          ).map((replacement, index) => (
            <div
              key={index}
              className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {replacement.name}
                  </div>

                  <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    Staffing score: {replacement.score}
                  </div>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    replacement.fatigue === "LOW"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : replacement.fatigue === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  Fatigue: {replacement.fatigue}
                </div>

                <button
                  onClick={() => sendRealStaffingMessage(replacement.name)}
                  disabled={sendingRealStaffingMessage === replacement.name}
                  className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingRealStaffingMessage === replacement.name
                    ? "Sender staffing request..."
                    : "📨 Send Staffing Request"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {staffingWarnings.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">⚠️</div>

            <div>
              <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
                Smart Staffing Warnings
              </h2>

              <p className="text-sm text-red-600 dark:text-red-400">
                Systemet har fundet potentielle bemandingsproblemer.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {staffingWarnings.map((warning, index) => (
              <div
                key={index}
                className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {staffingSuggestions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">🤖</div>

            <div>
              <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                AI Staffing Suggestions
              </h2>

              <p className="text-sm text-blue-600 dark:text-blue-400">
                Systemet foreslår optimeringer af bemandingen.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {staffingSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="rounded-xl border border-blue-200 bg-white p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiScheduleSuggestions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm dark:border-cyan-900 dark:bg-cyan-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">🤖</div>

            <div>
              <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                AI Suggested Schedule Blocks
              </h2>

              <p className="text-sm text-cyan-600 dark:text-cyan-400">
                Systemet foreslår automatiske optimeringer af dagens bemanding.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {aiScheduleSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="rounded-xl border border-cyan-200 bg-white p-4 text-sm text-cyan-700 dark:border-cyan-900 dark:bg-gray-900 dark:text-cyan-300"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>{suggestion}</div>

                  <button
                    onClick={() => createAiSuggestedShift(suggestion, index)}
                    disabled={creatingAiShift === index}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {creatingAiShift === index
                      ? "Opretter..."
                      : "🤖 Opret anbefalet vagt"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
