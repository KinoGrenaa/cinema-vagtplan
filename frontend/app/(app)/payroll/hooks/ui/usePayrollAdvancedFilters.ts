import { useState } from "react";

export function usePayrollAdvancedFilters() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  function toggleAdvancedFilters() {
    setShowAdvancedFilters((value) => !value);
  }

  return {
    showAdvancedFilters,
    toggleAdvancedFilters,
  };
}
