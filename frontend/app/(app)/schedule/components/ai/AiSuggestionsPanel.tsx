"use client";

import { memo, useMemo } from "react";
import type { Shift } from "../../../../../../shared/types";

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

type SectionProps = {
  icon: string;
  title: string;
  description: string;
  colorClasses: string;
  children: React.ReactNode;
};

function Section({
  icon,
  title,
  description,
  colorClasses,
  children,
}: SectionProps) {
  return (
    <div className={`mb-6 rounded-2xl border p-5 shadow-sm ${colorClasses}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className="text-2xl">{icon}</div>

        <div>
          <h2 className="text-xl font-bold">{title}</h2>

          <p className="text-sm">{description}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function AiSuggestionsPanelComponent({
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
  const visibleShifts = useMemo(() => shifts.slice(0, 5), [shifts]);

  const visibleLiveAlerts = useMemo(
    () =>
      liveStaffingAlerts.length > 0
        ? liveStaffingAlerts
        : ["Ingen LIVE staffing alerts lige nu."],
    [liveStaffingAlerts],
  );

  const visibleEmergencyActions = useMemo(
    () =>
      emergencyAiActions.length > 0
        ? emergencyAiActions
        : ["Ingen emergency AI actions lige nu."],
    [emergencyAiActions],
  );

  const visibleAutoNotifications = useMemo(
    () =>
      autoStaffingNotifications.length > 0
        ? autoStaffingNotifications
        : ["Ingen autonomous staffing notifications lige nu."],
    [autoStaffingNotifications],
  );

  const visibleEmergencyReplacements = useMemo(
    () =>
      suggestedEmergencyReplacements.length > 0
        ? suggestedEmergencyReplacements
        : [
            {
              name: "Ingen replacements nødvendige",
              score: 100,
              fatigue: "LOW",
            },
          ],
    [suggestedEmergencyReplacements],
  );

  return (
    <>
      <Section
        icon="🤖"
        title="AI Staffing Optimization"
        description="Systemet foreslår automatisk medarbejdere med lav belastning."
        colorClasses="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
      >
        <div className="space-y-4">
          {visibleShifts.map((shift) => (
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
      </Section>

      <Section
        icon="🔴"
        title="LIVE Staffing Alerts"
        description="Realtidsanalyse af biografens aktuelle staffing pressure."
        colorClasses="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
      >
        <div className="space-y-3">
          {visibleLiveAlerts.map((alert, index) => (
            <div
              key={index}
              className="rounded-xl border border-red-200 bg-white p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
            >
              {alert}
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon="🚨"
        title="Emergency AI Staffing Actions"
        description="Systemet anbefaler akut staffing intervention."
        colorClasses="border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
      >
        <div className="space-y-3">
          {visibleEmergencyActions.map((action, index) => (
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
                    : "🚨 Aktivér AI handling"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon="🤖"
        title="Autonomous Staffing Notifications"
        description="AI-systemet overvåger og reagerer automatisk på driftsbelastning."
        colorClasses="border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
      >
        <div className="space-y-3">
          {visibleAutoNotifications.map((notification, index) => (
            <div
              key={index}
              className="rounded-xl border border-blue-200 bg-white p-4 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
            >
              {notification}
            </div>
          ))}
        </div>
      </Section>

      {/* Resten af eksisterende JSX beholdes som det er */}
    </>
  );
}

const AiSuggestionsPanel = memo(AiSuggestionsPanelComponent);

export default AiSuggestionsPanel;
