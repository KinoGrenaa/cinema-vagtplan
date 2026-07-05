import { useState } from "react";

export function useJobFunctionDetailsExpansion() {
  const [expandedJobFunctionIds, setExpandedJobFunctionIds] = useState<
    Set<number>
  >(() => new Set());

  const toggleJobFunctionDetails = (jobFunctionId: number) => {
    setExpandedJobFunctionIds((current) => {
      const next = new Set(current);
      if (next.has(jobFunctionId)) {
        next.delete(jobFunctionId);
      } else {
        next.add(jobFunctionId);
      }
      return next;
    });
  };

  return {
    expandedJobFunctionIds,
    toggleJobFunctionDetails,
  };
}
