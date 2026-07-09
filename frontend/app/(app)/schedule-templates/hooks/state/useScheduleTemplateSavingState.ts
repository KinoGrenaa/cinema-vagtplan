import { useState } from "react";

export function useScheduleTemplateSavingState() {
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingJobFunction, setSavingJobFunction] = useState(false);
  const [copyingDay, setCopyingDay] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState(false);
  const [savingAssignmentKey, setSavingAssignmentKey] = useState<string | null>(
    null,
  );

  return {
    savingTemplate,
    setSavingTemplate,
    savingDay,
    setSavingDay,
    savingJobFunction,
    setSavingJobFunction,
    copyingDay,
    setCopyingDay,
    copyingTemplate,
    setCopyingTemplate,
    savingAssignmentKey,
    setSavingAssignmentKey,
  };
}
