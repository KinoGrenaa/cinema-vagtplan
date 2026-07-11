import { useState } from "react";

export function usePayrollEmployeeExpansion() {
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<number[]>([]);

  const toggleEmployeeGroup = (employeeId: number) => {
    setExpandedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  return {
    expandedEmployeeIds,
    toggleEmployeeGroup,
  };
}
