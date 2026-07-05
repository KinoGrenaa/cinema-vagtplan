import { useCallback, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  formatUserName,
  readErrorMessage,
} from "../helpers/jobFunctionHelpers";
import type { JobFunctionWithWorkType } from "../helpers/jobFunctionPayrollHelpers";
import type { User, UserJobFunction } from "../helpers/jobFunctionTypes";

type Confirm = (options: {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "success";
  onConfirm: () => Promise<void> | void;
}) => void;

type ShowError = (title: string, description: string) => void;

type UseJobFunctionEmployeeAssignmentsOptions = {
  activeCinemaId: number | null;
  confirm: Confirm;
  refreshData: () => Promise<void>;
  showError: ShowError;
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
    useState<JobFunctionWithWorkType | null>(null);
  const [assignments, setAssignments] = useState<UserJobFunction[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchAssignments = useCallback(
    async (jobFunction: JobFunctionWithWorkType) => {
      try {
        setAssignmentLoading(true);
        const response = await apiFetch(
          appendCinemaId(
            `/job-functions/${jobFunction.id}/users`,
            activeCinemaId,
          ),
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke hente medarbejdere for jobfunktion",
            ),
          );
        }

        const data = await response.json();
        setAssignments(Array.isArray(data) ? data : []);
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
    async (jobFunction: JobFunctionWithWorkType) => {
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

  const assignedUserIds = useMemo(() => {
    return new Set(assignments.map((assignment) => assignment.user.id));
  }, [assignments]);

  const availableUsers = useMemo(() => {
    return users.filter((user) => !assignedUserIds.has(user.id));
  }, [assignedUserIds, users]);

  const assignSelectedUser = useCallback(async () => {
    if (!employeeModalJobFunction) {
      return;
    }

    const userId = Number(selectedUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      showError(
        "Vælg medarbejder",
        "Vælg en medarbejder, før du tilføjer jobfunktionen.",
      );
      return;
    }

    try {
      setAssignmentSaving(true);
      const response = await apiFetch(
        appendCinemaId(
          `/job-functions/${employeeModalJobFunction.id}/users`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({ userId, cinemaId: activeCinemaId }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke tilføje medarbejder"),
        );
      }

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
            const response = await apiFetch(
              appendCinemaId(
                `/job-functions/${employeeModalJobFunction.id}/users/${assignment.user.id}`,
                activeCinemaId,
              ),
              { method: "DELETE" },
            );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(response, "Kunne ikke fjerne medarbejder"),
              );
            }

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
