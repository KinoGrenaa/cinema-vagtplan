"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildDashboardWorkspaceUrl,
  dashboardViewModeFromQueryValue,
  DASHBOARD_VIEW_QUERY_PARAM,
  getDashboardSectionFromHash,
  type DashboardViewMode,
  type DashboardWorkspaceSection,
  type DashboardWorkspaceSectionId,
} from "../helpers/dashboardWorkspace";

type UseDashboardWorkspaceLocationOptions = {
  sections: DashboardWorkspaceSection[];
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
};

type DashboardWorkspaceCopyState = "idle" | "copied" | "error";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function scrollAndFocusSection(sectionId: DashboardWorkspaceSectionId) {
  const element = document.getElementById(sectionId);

  if (!element) {
    return false;
  }

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });

  window.requestAnimationFrame(() => {
    element.focus({ preventScroll: true });
  });

  return true;
}

export function useDashboardWorkspaceLocation({
  sections,
  viewMode,
  onViewModeChange,
}: UseDashboardWorkspaceLocationOptions) {
  const sectionIdKey = sections.map((section) => section.id).join("|");
  const sectionIds = useMemo(
    () =>
      sectionIdKey
        ? (sectionIdKey.split("|") as DashboardWorkspaceSectionId[])
        : [],
    [sectionIdKey],
  );
  const [activeSectionId, setActiveSectionId] =
    useState<DashboardWorkspaceSectionId | null>(() => sectionIds[0] ?? null);
  const [copyState, setCopyState] =
    useState<DashboardWorkspaceCopyState>("idle");

  useEffect(() => {
    setActiveSectionId((current) =>
      current && sectionIds.includes(current)
        ? current
        : (sectionIds[0] ?? null),
    );
  }, [sectionIds]);

  const navigateToSection = useCallback(
    (
      sectionId: DashboardWorkspaceSectionId,
      historyMode: "push" | "replace" = "push",
      viewModeOverride?: DashboardViewMode,
    ) => {
      const effectiveViewMode = viewModeOverride ?? viewMode;
      const requiresCompleteView =
        sectionId === "dashboard-analysis" && effectiveViewMode !== "complete";

      if (requiresCompleteView) {
        onViewModeChange("complete");
      }

      const applyNavigation = () => {
        const nextUrl = buildDashboardWorkspaceUrl({
          currentUrl: window.location.href,
          viewMode: requiresCompleteView ? "complete" : effectiveViewMode,
          sectionId,
        });

        if (historyMode === "replace" || requiresCompleteView) {
          window.history.replaceState(window.history.state, "", nextUrl);
        } else {
          window.history.pushState(window.history.state, "", nextUrl);
        }

        setActiveSectionId(sectionId);
        scrollAndFocusSection(sectionId);
      };

      if (requiresCompleteView) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(applyNavigation);
        });
      } else {
        applyNavigation();
      }
    },
    [onViewModeChange, viewMode],
  );

  useEffect(() => {
    function applyCurrentLocation() {
      const sectionId = getDashboardSectionFromHash(window.location.hash);

      if (!sectionId) {
        return;
      }

      if (
        sectionId !== "dashboard-analysis" &&
        !sectionIds.includes(sectionId)
      ) {
        return;
      }

      const url = new URL(window.location.href);
      const locationViewMode =
        dashboardViewModeFromQueryValue(
          url.searchParams.get(DASHBOARD_VIEW_QUERY_PARAM),
        ) ?? viewMode;

      if (
        sectionId === "dashboard-analysis" &&
        locationViewMode !== "complete"
      ) {
        const nextUrl = buildDashboardWorkspaceUrl({
          currentUrl: window.location.href,
          viewMode: "complete",
          sectionId,
        });
        window.history.replaceState(window.history.state, "", nextUrl);
        onViewModeChange("complete");

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setActiveSectionId(sectionId);
            scrollAndFocusSection(sectionId);
          });
        });
        return;
      }

      setActiveSectionId(sectionId);
      window.requestAnimationFrame(() => scrollAndFocusSection(sectionId));
    }

    window.addEventListener("popstate", applyCurrentLocation);
    window.addEventListener("hashchange", applyCurrentLocation);

    window.requestAnimationFrame(applyCurrentLocation);

    return () => {
      window.removeEventListener("popstate", applyCurrentLocation);
      window.removeEventListener("hashchange", applyCurrentLocation);
    };
  }, [onViewModeChange, sectionIds, viewMode]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const visibleSections = new Map<DashboardWorkspaceSectionId, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as DashboardWorkspaceSectionId;

          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
        }

        const nextActive = [...visibleSections.entries()].sort(
          ([firstId, firstRatio], [secondId, secondRatio]) => {
            if (secondRatio !== firstRatio) {
              return secondRatio - firstRatio;
            }

            return sectionIds.indexOf(firstId) - sectionIds.indexOf(secondId);
          },
        )[0]?.[0];

        if (nextActive) {
          setActiveSectionId(nextActive);
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.05, 0.2, 0.5, 0.8],
      },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);

      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  const copyActiveSectionLink = useCallback(async () => {
    const sectionId = activeSectionId ?? sectionIds[0] ?? null;
    const shareUrl = buildDashboardWorkspaceUrl({
      currentUrl: window.location.href,
      viewMode,
      sectionId,
    });

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    window.setTimeout(() => setCopyState("idle"), 2500);
  }, [activeSectionId, sectionIds, viewMode]);

  return {
    activeSectionId,
    copyState,
    navigateToSection,
    copyActiveSectionLink,
  };
}
