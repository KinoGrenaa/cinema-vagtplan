import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  isAssignableUser,
  readErrorMessage,
} from "../../helpers/page/jobFunctionHelpers";
import {
  getMissingPayrollTypeWarningData,
  type JobFunctionWithJobFunction,
  type PayrollTypeOption,
} from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { User } from "../../helpers/types/jobFunctionTypes";

type ShowError = (title: string, description: string) => void;

type UseJobFunctionsDataOptions = {
  activeCinemaId: number | null;
  currentUserReady: boolean;
  needsMasterCinemaSelection: boolean;
  showError: ShowError;
};

export function useJobFunctionsData({
  activeCinemaId,
  currentUserReady,
  needsMasterCinemaSelection,
  showError,
}: UseJobFunctionsDataOptions) {
  const showErrorRef = useRef(showError);
  useEffect(() => { showErrorRef.current = showError; }, [showError]);

  const [jobFunctions, setJobFunctions] = useState<JobFunctionWithJobFunction[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollTypeOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const clearData = useCallback(() => {
    setJobFunctions([]);
    setPayrollTypes([]);
    setUsers([]);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobFunctionsResponse, payrollTypesResponse, usersResponse] =
        await Promise.all([
          apiFetch(appendCinemaId(`/job-functions?includeArchived=${showArchived}`, activeCinemaId)),
          apiFetch(appendCinemaId("/job-functions/payroll-types", activeCinemaId)),
          apiFetch(appendCinemaId("/users", activeCinemaId)),
        ]);

      if (!jobFunctionsResponse.ok) {
        throw new Error(await readErrorMessage(jobFunctionsResponse, "Kunne ikke hente jobfunktioner"));
      }
      if (!payrollTypesResponse.ok) {
        throw new Error(await readErrorMessage(payrollTypesResponse, "Kunne ikke hente eksportkoder"));
      }
      if (!usersResponse.ok) {
        throw new Error(await readErrorMessage(usersResponse, "Kunne ikke hente medarbejdere"));
      }

      const [jobFunctionsData, payrollTypesData, usersData] = await Promise.all([
        jobFunctionsResponse.json(), payrollTypesResponse.json(), usersResponse.json(),
      ]);
      setJobFunctions(Array.isArray(jobFunctionsData) ? jobFunctionsData : []);
      setPayrollTypes(Array.isArray(payrollTypesData) ? payrollTypesData : []);
      setUsers(Array.isArray(usersData) ? usersData.filter(isAssignableUser) : []);
    } catch (error) {
      clearData();
      showErrorRef.current(
        "Kunne ikke hente jobfunktioner",
        error instanceof Error ? error.message : "Der opstod en fejl, da jobfunktioner skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, clearData, showArchived]);

  useEffect(() => {
    if (!currentUserReady) return;
    if (needsMasterCinemaSelection) { clearData(); return; }
    void fetchData();
  }, [clearData, currentUserReady, fetchData, needsMasterCinemaSelection]);

  const activeCount = useMemo(
    () => jobFunctions.filter((jobFunction) => jobFunction.isActive).length,
    [jobFunctions],
  );
  const archivedCount = jobFunctions.length - activeCount;

  return {
    activeCount,
    archivedCount,
    fetchData,
    jobFunctions,
    loading,
    missingPayrollTypeWarning: getMissingPayrollTypeWarningData(jobFunctions, loading),
    payrollTypes,
    setShowArchived,
    showArchived,
    users,
  };
}
