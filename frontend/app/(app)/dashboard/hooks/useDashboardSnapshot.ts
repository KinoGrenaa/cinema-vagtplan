"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildDashboardSnapshotCsv,
  buildDashboardSnapshotText,
  createDashboardSnapshotFilename,
  type DashboardSnapshot,
} from "../helpers/dashboardSnapshot";

export type DashboardSnapshotFeedback =
  | "idle"
  | "copied"
  | "downloaded"
  | "error";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Status kunne ikke kopieres");
  }
}

export function useDashboardSnapshot(snapshot: DashboardSnapshot) {
  const [feedback, setFeedback] =
    useState<DashboardSnapshotFeedback>("idle");
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback(
    (nextFeedback: DashboardSnapshotFeedback) => {
      setFeedback(nextFeedback);
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback("idle");
      }, 3000);
    },
    [],
  );

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    },
    [],
  );

  const copySnapshot = useCallback(async () => {
    try {
      await copyText(buildDashboardSnapshotText(snapshot));
      showFeedback("copied");
    } catch {
      showFeedback("error");
    }
  }, [showFeedback, snapshot]);

  const downloadCsv = useCallback(() => {
    try {
      const blob = new Blob([buildDashboardSnapshotCsv(snapshot)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = createDashboardSnapshotFilename(snapshot);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showFeedback("downloaded");
    } catch {
      showFeedback("error");
    }
  }, [showFeedback, snapshot]);

  const printSnapshot = useCallback(() => {
    window.print();
  }, []);

  return {
    feedback,
    copySnapshot,
    downloadCsv,
    printSnapshot,
  };
}
