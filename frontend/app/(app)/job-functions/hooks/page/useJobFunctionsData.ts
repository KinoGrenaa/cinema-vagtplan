import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  isAssignableUser,
  readErrorMessage,
} from "../../helpers/page/jobFunctionHelpers";
import {
  getMissingPayrollTypeWarningData,
  type JobFunctionWithWorkType,
  type PayrollTypeOption,
} from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { DayPeriod, User } from "../../helpers/types/jobFunctionTypes";

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

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const [jobFunctions, setJobFunctions] = useState<JobFunctionWithWorkType[]>([]);
  const [dayPeriods, setDayPeriods] = useState<DayPeriod[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollTypeOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const clearData = useCallback(() => {
    setJobFunctions([]);
    setDayPeriods([]);
    setPayrollTypes([]);
    setUsers([]);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        jobFunctionsResponse,
        dayPeriodsResponse,
        payrollTypesResponse,
        usersResponse,
      ] = await Promise.all([
        apiFetch(
          appendCinemaId(
            `/job-functions?includeArchived=${showArchived}`,
            activeCinemaId,
          ),
        ),
        apiFetch(
          appendCinemaId("/day-periods?includeArchived=false", activeCinemaId),
        ),
        apiFetch(appendCinemaId("/job-functions/payroll-types", activeCinemaId)),
        apiFetch(appendCinemaId("/users", activeCinemaId)),
      ]);

      if (!jobFunctionsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            jobFunctionsResponse,
            "Kunne ikke hente jobfunktioner",
          ),
        );
      }

      if (!dayPeriodsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            dayPeriodsResponse,
            "Kunne ikke hente dagsperioder",
          ),
        );
      }

      if (!payrollTypesResponse.ok) {
        throw new Error(
          await readErrorMessage(
            payrollTypesResponse,
            "Kunne ikke hente løntyper",
          ),
        );
      }

      if (!usersResponse.ok) {
        throw new Error(
          await readErrorMessage(usersResponse, "Kunne ikke hente medarbejdere"),
        );
      }

      const [jobFunctionsData, dayPeriodsData, payrollTypesData, usersData] =
        await Promise.all([
          jobFunctionsResponse.json(),
          dayPeriodsResponse.json(),
          payrollTypesResponse.json(),
          usersResponse.json(),
        ]);

      setJobFunctions(Array.isArray(jobFunctionsData) ? jobFunctionsData : []);
      setDayPeriods(Array.isArray(dayPeriodsData) ? dayPeriodsData : []);
      setPayrollTypes(Array.isArray(payrollTypesData) ? payrollTypesData : []);
      setUsers(
        Array.isArray(usersData) ? usersData.filter(isAssignableUser) : [],
      );
    } catch (error) {
      setJobFunctions([]);
      setDayPeriods([]);
      setPayrollTypes([]);
      setUsers([]);
      showErrorRef.current(
        "Kunne ikke hente jobfunktioner",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da jobfunktioner skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, showArchived]);

  useEffect(() => {
    if (!currentUserReady) {
      return;
    }

    if (needsMasterCinemaSelection) {
      clearData();
      return;
    }

    fetchData();
  }, [clearData, currentUserReady, fetchData, needsMasterCinemaSelection]);

  const activeCount = useMemo(
    () => jobFunctions.filter((jobFunction) => jobFunction.isActive).length,
    [jobFunctions],
  );
  const archivedCount = jobFunctions.length - activeCount;
  const missingPayrollTypeWarning = getMissingPayrollTypeWarningData(
    jobFunctions,
    loading,
  );

  return {
    activeCount,
    archivedCount,
    dayPeriods,
    fetchData,
    jobFunctions,
    loading,
    missingPayrollTypeWarning,
    payrollTypes,
    setShowArchived,
    showArchived,
    users,
  };
}
