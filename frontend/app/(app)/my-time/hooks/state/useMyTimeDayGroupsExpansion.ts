import { useCallback, useState } from "react";

export function useMyTimeDayGroupsExpansion() {
  const [expandedDayKeys, setExpandedDayKeys] = useState<string[]>([]);

  const resetExpandedDayKeys = useCallback(() => {
    setExpandedDayKeys([]);
  }, []);

  const toggleDayGroup = useCallback((dayKey: string) => {
    setExpandedDayKeys((current) =>
      current.includes(dayKey)
        ? current.filter((key) => key !== dayKey)
        : [...current, dayKey],
    );
  }, []);

  return {
    expandedDayKeys,
    resetExpandedDayKeys,
    toggleDayGroup,
  };
}
