"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import JobFunctionFormModal from "./components/JobFunctionFormModal";
import JobFunctionTimingRuleModal from "./components/JobFunctionTimingRuleModal";
import JobFunctionEmployeeModal from "./components/JobFunctionEmployeeModal";
import JobFunctionsMasterCinemaRequired from "./components/JobFunctionsMasterCinemaRequired";
import JobFunctionsOverviewSection from "./components/JobFunctionsOverviewSection";
import JobFunctionsPageHeader from "./components/JobFunctionsPageHeader";
import {
  emptyJobFunctionForm,
  parseJobFunctionForm,
  toJobFunctionFormState,
} from "./helpers/jobFunctionFormHelpers";
import type { JobFunctionFormState } from "./helpers/jobFunctionFormHelpers";
import { getMissingPayrollTypeWarningData } from "./helpers/jobFunctionPayrollHelpers";
import type {
  JobFunctionWithWorkType,
  PayrollTypeOption,
} from "./helpers/jobFunctionPayrollHelpers";
import {
  emptyTimingRuleForm,
  parseTimingRuleDayPeriodId,
  parseTimingRuleForm,
  toTimingRuleForm,
} from "./helpers/jobFunctionTimingRuleFormHelpers";
import type { TimingRuleFormState } from "./helpers/jobFunctionTimingRuleFormHelpers";
import {
  appendCinemaId,
  formatUserName,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  isAssignableUser,
  readErrorMessage,
} from "./helpers/jobFunctionHelpers";
import type {
  CurrentUser,
  DayPeriod,
  JobFunction,
  JobFunctionTimingRule,
  User,
  UserJobFunction,
} from "./helpers/jobFunctionTypes";

export default function JobFunctionsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const infoDialogRef = useRef(infoDialog);

  useEffect(() => {
    infoDialogRef.current = infoDialog;
  }, [infoDialog]);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionWithWorkType[]>([]);
  const [dayPeriods, setDayPeriods] = useState<DayPeriod[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollTypeOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedJobFunctionIds, setExpandedJobFunctionIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [form, setForm] = useState<JobFunctionFormState>(emptyJobFunctionForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [employeeModalJobFunction, setEmployeeModalJobFunction] =
    useState<JobFunctionWithWorkType | null>(null);
  const [assignments, setAssignments] = useState<UserJobFunction[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [timingModalJobFunction, setTimingModalJobFunction] =
    useState<JobFunctionWithWorkType | null>(null);
  const [timingRule, setTimingRule] = useState<JobFunctionTimingRule | null>(
    null,
  );
  const [timingRuleForm, setTimingRuleForm] =
    useState<TimingRuleFormState>(emptyTimingRuleForm);
  const [timingRuleLoading, setTimingRuleLoading] = useState(false);
  const [timingRuleSaving, setTimingRuleSaving] = useState(false);

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  const isEditing = editingId !== null;
  const activeCount = jobFunctions.filter(
    (jobFunction) => jobFunction.isActive,
  ).length;
  const archivedCount = jobFunctions.length - activeCount;
  const missingPayrollTypeWarning = getMissingPayrollTypeWarningData(
    jobFunctions,
    loading,
  );

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

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );
    window.addEventListener("storage", updateSelectedCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
      window.removeEventListener("storage", updateSelectedCinema);
    };
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
            appendCinemaId(
              "/day-periods?includeArchived=false",
              activeCinemaId,
            ),
          ),
          apiFetch(
            appendCinemaId(
              "/job-functions/payroll-types",
              activeCinemaId,
            ),
          ),
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
          await readErrorMessage(
            usersResponse,
            "Kunne ikke hente medarbejdere",
          ),
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
      infoDialogRef.current.showError(
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
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setJobFunctions([]);
      setDayPeriods([]);
      setPayrollTypes([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

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
        infoDialogRef.current.showError(
          "Kunne ikke hente medarbejdere",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da medarbejderlisten skulle hentes.",
        );
      } finally {
        setAssignmentLoading(false);
      }
    },
    [activeCinemaId],
  );

  const fetchTimingRule = useCallback(
    async (jobFunction: JobFunctionWithWorkType) => {
      try {
        setTimingRuleLoading(true);
        const response = await apiFetch(
          appendCinemaId(
            `/job-functions/${jobFunction.id}/timing-rule?includeInactive=true`,
            activeCinemaId,
          ),
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Kunne ikke hente møde- og fyraftensregel"),
          );
        }

        const rawText = await response.text();
        const data = rawText.trim()
          ? (JSON.parse(rawText) as JobFunctionTimingRule)
          : null;
        setTimingRule(data);
        setTimingRuleForm(toTimingRuleForm(data, jobFunction));
      } catch (error) {
        setTimingRule(null);
        setTimingRuleForm(toTimingRuleForm(null, jobFunction));
        infoDialogRef.current.showError(
          "Kunne ikke hente møde- og fyraftensregel",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da timingreglen skulle hentes.",
        );
      } finally {
        setTimingRuleLoading(false);
      }
    },
    [activeCinemaId],
  );

  const resetForm = () => {
    setForm(emptyJobFunctionForm);
    setEditingId(null);
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    resetForm();
    setFormModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const openEditModal = (jobFunction: JobFunctionWithWorkType) => {
    setEditingId(jobFunction.id);
    setForm(toJobFunctionFormState(jobFunction));
    setFormModalOpen(true);
  };

  const openEmployeeModal = async (jobFunction: JobFunctionWithWorkType) => {
    setEmployeeModalJobFunction(jobFunction);
    setSelectedUserId("");
    setAssignments([]);
    await fetchAssignments(jobFunction);
  };

  const closeEmployeeModal = () => {
    if (assignmentSaving) {
      return;
    }

    setEmployeeModalJobFunction(null);
    setAssignments([]);
    setSelectedUserId("");
  };

  const openTimingRuleModal = async (jobFunction: JobFunctionWithWorkType) => {
    setTimingModalJobFunction(jobFunction);
    setTimingRule(jobFunction.timingRule ?? null);
    setTimingRuleForm(toTimingRuleForm(jobFunction.timingRule, jobFunction));
    await fetchTimingRule(jobFunction);
  };

  const closeTimingRuleModal = () => {
    if (timingRuleSaving) {
      return;
    }

    setTimingModalJobFunction(null);
    setTimingRule(null);
    setTimingRuleForm(emptyTimingRuleForm);
  };

  const submitForm = async () => {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du gemmer jobfunktioner.",
      );
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...parseJobFunctionForm(form),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch(
        editingId
          ? appendCinemaId(`/job-functions/${editingId}`, activeCinemaId)
          : "/job-functions",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            editingId
              ? "Kunne ikke opdatere jobfunktion"
              : "Kunne ikke oprette jobfunktion",
          ),
        );
      }

      closeFormModal();
      await fetchData();
      infoDialog.show({
        title: editingId ? "Jobfunktion opdateret" : "Jobfunktion oprettet",
        description: editingId
          ? "Jobfunktionen er gemt."
          : "Jobfunktionen er oprettet og kan bruges i vagtplanlægning.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        editingId
          ? "Kunne ikke opdatere jobfunktion"
          : "Kunne ikke oprette jobfunktion",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da jobfunktionen skulle gemmes. Prøv igen.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveJobFunction = (jobFunction: JobFunctionWithWorkType) => {
    confirmDialog.confirm({
      title: "Arkivér jobfunktion",
      description:
        `Vil du arkivere jobfunktionen "${jobFunction.name}"?\n\n` +
        "Historik bevares. Jobfunktionen skjules fra aktive valg og kan genaktiveres igen.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/job-functions/${jobFunction.id}`, activeCinemaId),
            { method: "DELETE" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke arkivere jobfunktion",
              ),
            );
          }

          if (editingId === jobFunction.id) {
            closeFormModal();
          }

          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere jobfunktion",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da jobfunktionen skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  };

  const reactivateJobFunction = (jobFunction: JobFunction) => {
    confirmDialog.confirm({
      title: "Genaktivér jobfunktion",
      description:
        `Vil du genaktivere jobfunktionen "${jobFunction.name}"?\n\n` +
        "Jobfunktionen kan igen bruges i vagtplanlægning.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(
              `/job-functions/${jobFunction.id}/reactivate`,
              activeCinemaId,
            ),
            { method: "PATCH" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke genaktivere jobfunktion",
              ),
            );
          }

          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke genaktivere jobfunktion",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da jobfunktionen skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  };

  const assignedUserIds = useMemo(() => {
    return new Set(assignments.map((assignment) => assignment.user.id));
  }, [assignments]);

  const availableUsers = useMemo(() => {
    return users.filter((user) => !assignedUserIds.has(user.id));
  }, [assignedUserIds, users]);

  const assignSelectedUser = async () => {
    if (!employeeModalJobFunction) {
      return;
    }

    const userId = Number(selectedUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      infoDialog.showError(
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
      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tilføje medarbejder",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da medarbejderen skulle tilføjes.",
      );
    } finally {
      setAssignmentSaving(false);
    }
  };

  const removeAssignedUser = (assignment: UserJobFunction) => {
    if (!employeeModalJobFunction) {
      return;
    }

    confirmDialog.confirm({
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
          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke fjerne medarbejder",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da medarbejderen skulle fjernes.",
          );
        }
      },
    });
  };

  const saveTimingRule = async () => {
    if (!timingModalJobFunction) {
      return;
    }

    try {
      setTimingRuleSaving(true);
      const dayPeriodId = parseTimingRuleDayPeriodId(timingRuleForm.dayPeriodId);
      const payload = {
        ...parseTimingRuleForm(timingRuleForm),
        cinemaId: activeCinemaId,
      };

      const dayPeriodResponse = await apiFetch(
        appendCinemaId(
          `/job-functions/${timingModalJobFunction.id}`,
          activeCinemaId,
        ),
        {
          method: "PATCH",
          body: JSON.stringify({ dayPeriodId, cinemaId: activeCinemaId }),
        },
      );

      if (!dayPeriodResponse.ok) {
        throw new Error(
          await readErrorMessage(
            dayPeriodResponse,
            "Kunne ikke gemme dagsperiode for jobfunktion",
          ),
        );
      }

      const response = await apiFetch(
        appendCinemaId(
          `/job-functions/${timingModalJobFunction.id}/timing-rule`,
          activeCinemaId,
        ),
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme møde- og fyraftensregel"),
        );
      }

      const savedRawText = await response.text();
      if (savedRawText.trim()) {
        setTimingRule(JSON.parse(savedRawText) as JobFunctionTimingRule);
      }
      await fetchData();
      setTimingModalJobFunction(null);
      setTimingRule(null);
      setTimingRuleForm(emptyTimingRuleForm);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme møde- og fyraftensregel",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da reglen skulle gemmes.",
      );
    } finally {
      setTimingRuleSaving(false);
    }
  };

  const archiveTimingRule = () => {
    if (!timingModalJobFunction) {
      return;
    }

    confirmDialog.confirm({
      title: "Arkivér møde- og fyraftensregel",
      description:
        `Vil du arkivere reglen for "${timingModalJobFunction.name}"?\n\n` +
        "Reglen kan oprettes igen ved at gemme en ny regel.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(
              `/job-functions/${timingModalJobFunction.id}/timing-rule`,
              activeCinemaId,
            ),
            { method: "DELETE" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke arkivere møde- og fyraftensregel",
              ),
            );
          }

          const data = (await response.json()) as JobFunctionTimingRule;
          setTimingRule(data);
          setTimingRuleForm(toTimingRuleForm(data, timingModalJobFunction));
          await fetchData();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere møde- og fyraftensregel",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da timingreglen skulle arkiveres.",
          );
        }
      },
    });
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <JobFunctionsPageHeader />

          {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <JobFunctionsOverviewSection
              activeCount={activeCount}
              archivedCount={archivedCount}
              expandedJobFunctionIds={expandedJobFunctionIds}
              jobFunctions={jobFunctions}
              loading={loading}
              missingPayrollTypeWarning={missingPayrollTypeWarning}
              showArchived={showArchived}
              onArchive={archiveJobFunction}
              onCreate={openCreateModal}
              onEdit={openEditModal}
              onOpenEmployees={openEmployeeModal}
              onOpenTimingRule={openTimingRuleModal}
              onReactivate={reactivateJobFunction}
              onRefresh={fetchData}
              onShowArchivedChange={setShowArchived}
              onToggleDetails={toggleJobFunctionDetails}
            />
          )}
        </div>
      </main>

      {formModalOpen && (
        <JobFunctionFormModal
          form={form}
          isEditing={isEditing}
          payrollTypes={payrollTypes}
          saving={saving}
          setForm={setForm}
          onClose={closeFormModal}
          onSubmit={submitForm}
        />
      )}

      {timingModalJobFunction && (
        <JobFunctionTimingRuleModal
          dayPeriods={dayPeriods}
          jobFunction={timingModalJobFunction}
          timingRule={timingRule}
          timingRuleForm={timingRuleForm}
          timingRuleLoading={timingRuleLoading}
          timingRuleSaving={timingRuleSaving}
          setTimingRuleForm={setTimingRuleForm}
          onArchive={archiveTimingRule}
          onClose={closeTimingRuleModal}
          onSubmit={saveTimingRule}
        />
      )}

      {employeeModalJobFunction && (
        <JobFunctionEmployeeModal
          jobFunction={employeeModalJobFunction}
          assignments={assignments}
          assignmentLoading={assignmentLoading}
          assignmentSaving={assignmentSaving}
          availableUsers={availableUsers}
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
          onAssignSelectedUser={assignSelectedUser}
          onRemoveAssignedUser={removeAssignedUser}
          onClose={closeEmployeeModal}
        />
      )}
      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
