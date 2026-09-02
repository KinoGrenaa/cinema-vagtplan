"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  apiFetch,
} from "@/app/lib/api";

export type TimeEntryMinuteStep =
  | 1
  | 5
  | 15;

export function normalizeTimeEntryMinuteStep(
  value: unknown,
): TimeEntryMinuteStep {
  return value === 5 ||
    value === 15
    ? value
    : 1;
}

export function useTimeEntryMinuteStep(
  cinemaId:
    | number
    | null
    | undefined,
) {
  const [
    minuteStep,
    setMinuteStep,
  ] =
    useState<TimeEntryMinuteStep>(
      1,
    );

  useEffect(() => {
    let active = true;

    setMinuteStep(1);

    if (!cinemaId) {
      return () => {
        active = false;
      };
    }

    async function fetchMinuteStep() {
      try {
        const response =
          await apiFetch(
            `/cinemas/${cinemaId}`,
          );

        if (!response.ok) {
          return;
        }

        const cinema =
          await response.json();

        if (active) {
          setMinuteStep(
            normalizeTimeEntryMinuteStep(
              cinema?.timeEntryMinuteStep,
            ),
          );
        }
      } catch {
        // Bevar 1 minut som sikker standard,
        // hvis biografindstillingen ikke kan hentes.
      }
    }

    void fetchMinuteStep();

    return () => {
      active = false;
    };
  }, [cinemaId]);

  return minuteStep;
}
