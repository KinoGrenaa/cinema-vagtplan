import { useCallback, useMemo, useState } from "react";

import type {
  JobFunctionConfirm,
  JobFunctionShowError,
} from "../../helpers/types/jobFunctionDialogTypes";
import {
  assignJobFunctionUser,
  fetchJobFunctionAssignments,
  removeJobFunctionUser,
} from "../../helpers/actions/jobFunctionEmployeeAssignmentApi";
import {
  getAvailableJobFunctionUsers,
  parseSelectedAssignmentUserId,
} from "../../helpers/actions/jobFunctionEmployeeAssignmentHelpers";
import { formatUserName } from "../../helpers/page/jobFunctionHelpers";
import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { User, UserJobFunction } from "../../helpers/types/jobFunctionTypes";

type UseJobFunctionEmployeeAssignmentsOptions = {
  activeCinemaId: number | null;
  confirm: JobFunctionConfirm;
  refreshData: () => Promise<void>;
  showError: JobFunctionShowError;
  users: User[];
};

export function useJobFunctionEmployeeAssignments({
  activeCinemaId,
  confirm,
  refreshData,
  showError,
  users,
}: UseJobFunctionEmployeeAssignmentsOptions) {
  const [employeeModalJobFunction, setEmployeeModalJobFunction] =
    useState<JobFunctionWithJobFunction | null>(null);
  const [assignments, setAssignments] = useState<UserJobFunction[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchAssignments = useCallback(
    async (jobFunction: JobFunctionWithJobFunction) => {
      try {
        setAssignmentLoading(true);
        const data = await fetchJobFunctionAssignments(
          jobFunction.id,
          activeCinemaId,
        );
        setAssignments(data);
      } catch (error) {
        setAssignments([]);
        showError(
          "Kunne ikke hente medarbejdere",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da medarbejderlisten skulle hentes.",
        );
      } finally {
        setAssignmentLoading(false);
      }
    },
    [activeCinemaId, showError],
  );

  const openEmployeeModal = useCallback(
    async (jobFunction: JobFunctionWithJobFunction) => {
      setEmployeeModalJobFunction(jobFunction);
      setSelectedUserId("");
      setAssignments([]);
      await fetchAssignments(jobFunction);
    },
    [fetchAssignments],
  );

  const closeEmployeeModal = useCallback(() => {
    if (assignmentSaving) {
      return;
    }

    setEmployeeModalJobFunction(null);
    setAssignments([]);
    setSelectedUserId("");
  }, [assignmentSaving]);

  const availableUsers = useMemo(() => {
    return getAvailableJobFunctionUsers(users, assignments);
  }, [assignments, users]);

  const assignSelectedUser = useCallback(async () => {
    if (!employeeModalJobFunction) {
      return;
    }

    const userId = parseSelectedAssignmentUserId(selectedUserId);
    if (userId === null) {
      showError(
        "Vælg medarbejder",
        "Vælg en medarbejder, før du tilføjer jobfunktionen.",
      );
      return;
    }

    try {
      setAssignmentSaving(true);
      await assignJobFunctionUser(
        employeeModalJobFunction.id,
        userId,
        activeCinemaId,
      );
      setSelectedUserId("");
      await fetchAssignments(employeeModalJobFunction);
      await refreshData();
    } catch (error) {
      showError(
        "Kunne ikke tilføje medarbejder",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da medarbejderen skulle tilføjes.",
      );
    } finally {
      setAssignmentSaving(false);
    }
  }, [
    activeCinemaId,
    employeeModalJobFunction,
    fetchAssignments,
    refreshData,
    selectedUserId,
    showError,
  ]);

  const removeAssignedUser = useCallback(
    (assignment: UserJobFunction) => {
      if (!employeeModalJobFunction) {
        return;
      }

      confirm({
        title: "Fjern jobfunktion fra medarbejder",
        description: `Vil du fjerne "${employeeModalJobFunction.name}" fra ${formatUserName(
          assignment.user,
        )}?`,
        confirmText: "Fjern",
        cancelText: "Annuller",
        confirmVariant: "danger",
        onConfirm: async () => {
          try {
            await removeJobFunctionUser(
              employeeModalJobFunction.id,
              assignment.user.id,
              activeCinemaId,
            );

            await fetchAssignments(employeeModalJobFunction);
            await refreshData();
          } catch (error) {
            showError(
              "Kunne ikke fjerne medarbejder",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl, da medarbejderen skulle fjernes.",
            );
          }
        },
      });
    },
    [
      activeCinemaId,
      confirm,
      employeeModalJobFunction,
      fetchAssignments,
      refreshData,
      showError,
    ],
  );

  return {
    assignmentLoading,
    assignmentSaving,
    assignments,
    availableUsers,
    closeEmployeeModal,
    employeeModalJobFunction,
    openEmployeeModal,
    removeAssignedUser,
    assignSelectedUser,
    selectedUserId,
    setSelectedUserId,
  };
}
