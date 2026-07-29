"use client";

import type { MouseEvent } from "react";

import type {
  DashboardViewMode,
  DashboardWorkspaceSection,
} from "../../helpers/dashboardWorkspace";
import { useDashboardWorkspaceLocation } from "../../hooks/useDashboardWorkspaceLocation";
import DashboardWorkspaceShareButton from "./DashboardWorkspaceShareButton";

type DashboardWorkspaceNavigationProps = {
  sections: DashboardWorkspaceSection[];
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
};

export default function DashboardWorkspaceNavigation({
  sections,
  viewMode,
  onViewModeChange,
}: DashboardWorkspaceNavigationProps) {
  const workspaceLocation = useDashboardWorkspaceLocation({
    sections,
    viewMode,
    onViewModeChange,
  });

  function changeViewMode(nextMode: DashboardViewMode) {
    onViewModeChange(nextMode);

    if (
      nextMode === "operations" &&
      workspaceLocation.activeSectionId === "dashboard-analysis"
    ) {
      const fallbackSection =
        sections.find((section) => section.id === "dashboard-staffing") ??
        sections.at(-1);

      if (fallbackSection) {
        window.requestAnimationFrame(() => {
          workspaceLocation.navigateToSection(
            fallbackSection.id,
            "replace",
            "operations",
          );
        });
      }
    }
  }

  return (
    <nav
      aria-label="Navigation i driftsoverblikket"
      className="sticky top-3 z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-colors dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            Naviger i overblikket
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {sections.map((section) => {
              const isActive =
                workspaceLocation.activeSectionId === section.id;

              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  title={section.description}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    workspaceLocation.navigateToSection(section.id);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-gray-900 ${
                    isActive
                      ? "border-blue-700 bg-blue-700 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-blue-950"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100"
                  }`}
                >
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.shortLabel}</span>
                  {section.attentionCount ? (
                    <span
                      aria-label={`${section.attentionCount} kræver opmærksomhed`}
                      className={`inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                        isActive
                          ? "bg-white/20 text-current"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200"
                      }`}
                    >
                      {section.attentionCount}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
          <fieldset>
            <legend className="sr-only">Vælg dashboardvisning</legend>
            <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-950 sm:w-auto">
              <button
                type="button"
                aria-pressed={viewMode === "operations"}
                onClick={() => changeViewMode("operations")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-300 sm:flex-none ${
                  viewMode === "operations"
                    ? "bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                Drift
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "complete"}
                onClick={() => changeViewMode("complete")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-300 sm:flex-none ${
                  viewMode === "complete"
                    ? "bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                Fuld visning
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-right">
              {viewMode === "operations"
                ? "Automatiske vurderinger er skjult."
                : "Alle drifts- og analysedetaljer vises."}
            </p>
          </fieldset>

          <DashboardWorkspaceShareButton
            copyState={workspaceLocation.copyState}
            onCopy={workspaceLocation.copyActiveSectionLink}
          />
        </div>
      </div>
    </nav>
  );
}
