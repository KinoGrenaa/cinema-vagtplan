"use client";

import {
  buildDashboardWorkspaceUrl,
  type DashboardViewMode,
} from "../../helpers/dashboardWorkspace";

type DashboardAnalysisCollapsedProps = {
  onViewModeChange: (mode: DashboardViewMode) => void;
};

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export default function DashboardAnalysisCollapsed({
  onViewModeChange,
}: DashboardAnalysisCollapsedProps) {
  function showAnalysis() {
    onViewModeChange("complete");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const nextUrl = buildDashboardWorkspaceUrl({
          currentUrl: window.location.href,
          viewMode: "complete",
          sectionId: "dashboard-analysis",
        });
        window.history.replaceState(window.history.state, "", nextUrl);

        const analysisSection = document.getElementById("dashboard-analysis");
        analysisSection?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
        analysisSection?.focus({ preventScroll: true });
      });
    });
  }

  return (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-gray-800 transition-colors dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Driftsvisning
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
            Automatiske vurderinger er skjult
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Alle driftskritiske oplysninger, åbne opgaver, nøgletal og
            bemandingsadvarsler vises fortsat. Skift til fuld visning for at se
            regelgrundlag, belastningsanalyse og beregnede mønstre.
          </p>
        </div>
        <button
          type="button"
          onClick={showAnalysis}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-2 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:focus-visible:ring-gray-300 dark:focus-visible:ring-offset-gray-950"
        >
          Vis fuld analyse
        </button>
      </div>
    </section>
  );
}
