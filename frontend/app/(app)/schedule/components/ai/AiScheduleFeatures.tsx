"use client";

import type { ReactNode } from "react";

import {
  useScheduleAi,
  type MovieShowing,
  type UseScheduleAiInput,
} from "../../hooks/ai/useScheduleAi";
import type { Shift, User, JobFunction } from "../../../../../../shared/types";

type AiScheduleData = ReturnType<typeof useScheduleAi>;

type AiScheduleFeatureProps = {
  enabled: boolean;
  selectedDate: string;
  shifts: Shift[];
  users: User[];
  jobFunctions: JobFunction[];
  movieShowings: MovieShowing[];
  createShift: UseScheduleAiInput["createShift"];
  showError: UseScheduleAiInput["showError"];
  children: (ai: AiScheduleData | null) => ReactNode;
};

export default function AiScheduleFeatures({
  enabled,
  selectedDate,
  shifts,
  users,
  jobFunctions,
  movieShowings,
  createShift,
  showError,
  children,
}: AiScheduleFeatureProps) {
  if (!enabled) {
    return <>{children(null)}</>;
  }

  return (
    <AiScheduleFeaturesEnabled
      selectedDate={selectedDate}
      shifts={shifts}
      users={users}
      jobFunctions={jobFunctions}
      movieShowings={movieShowings}
      createShift={createShift}
      showError={showError}
    >
      {children}
    </AiScheduleFeaturesEnabled>
  );
}

function AiScheduleFeaturesEnabled({
  selectedDate,
  shifts,
  users,
  jobFunctions,
  movieShowings,
  createShift,
  showError,
  children,
}: Omit<AiScheduleFeatureProps, "enabled">) {
  const ai = useScheduleAi({
    selectedDate,
    shifts,
    users,
    jobFunctions,
    movieShowings,
    createShift,
    showError,
  });

  return <>{children(ai)}</>;
}
