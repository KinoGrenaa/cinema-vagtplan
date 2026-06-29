"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import JobFunctionsMasterCinemaRequired from "./components/JobFunctionsMasterCinemaRequired";
import {
  appendCinemaId,
  formatDayPeriod,
  formatUserName,
  getCurrentUserFromToken,
  getJobFunctionEmployeeCount,
  getSelectedMasterCinemaId,
  isAssignableUser,
  normalizeColorValue,
  readErrorMessage,
} from "./helpers/jobFunctionHelpers";
import type {
  CurrentUser,
  DayPeriod,
  JobFunction,
  User,
  UserJobFunction,
} from "./helpers/jobFunctionTypes";

type FormState = {
  name: string;
  description: string;
  color: string;
  sortOrder: string;
  dayPeriodId: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  color: "#2563eb",
  sortOrder: "0",
  dayPeriodId: "",
};

function toFormState(jobFunction: JobFunction): FormState {
  return {
    name: jobFunction.name,
    description: jobFunction.description ?? "",
    color: jobFunction.color || "#2563eb",
    sortOrder: String(jobFunction.sortOrder ?? 0),
    dayPeriodId: jobFunction.dayPeriodId ? String(jobFunction.dayPeriodId) : "",
  };
}

function parseForm(form: FormState) {
  const name = form.name.trim();
  const description = form.description.trim() || null;
  const color = normalizeColorValue(form.color);
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;
  const dayPeriodId = form.dayPeriodId ? Number(form.dayPeriodId) : null;

  if (!name) {
    throw new Error("Indtast et navn på jobfunktionen.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Farve skal være en gyldig hex-farve.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  if (
    form.dayPeriodId &&
    (dayPeriodId === null || !Number.isInteger(dayPeriodId) || dayPeriodId <= 0)
  ) {
    throw new Error("Dagsperiode skal være et gyldigt valg.");
  }

  return {
    name,
    description,
    color,
    sortOrder,
    dayPeriodId,
  };
}

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
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [dayPeriods, setDayPeriods] = useState<DayPeriod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [employeeModalJobFunction, setEmployeeModalJobFunction] =
    useState<JobFunction | null>(null);
  const [assignments, setAssignments] = useState<UserJobFunction[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  const isEditing = editingId !== null;
  const activeCount = jobFunctions.filter((jobFunction) => jobFunction.isActive)
    .length;
  const archivedCount = jobFunctions.length - activeCount;

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);
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

      const [jobFunctionsResponse, dayPeriodsResponse, usersResponse] =
        await Promise.all([
          apiFetch(
            appendCinemaId(
              `/job-functions?includeArchived=${showArchived}`,
              activeCinemaId,
            ),
          ),
          apiFetch(appendCinemaId("/day-periods?includeArchived=false", activeCinemaId)),
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

      if (!usersResponse.ok) {
        throw new Error(
          await readErrorMessage(usersResponse, "Kunne ikke hente medarbejdere"),
        );
      }

      const [jobFunctionsData, dayPeriodsData, usersData] = await Promise.all([
        jobFunctionsResponse.json(),
        dayPeriodsResponse.json(),
        usersResponse.json(),
      ]);

      setJobFunctions(Array.isArray(jobFunctionsData) ? jobFunctionsData : []);
      setDayPeriods(Array.isArray(dayPeriodsData) ? dayPeriodsData : []);
      setUsers(Array.isArray(usersData) ? usersData.filter(isAssignableUser) : []);
    } catch (error) {
      setJobFunctions([]);
      setDayPeriods([]);
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
      setUsers([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

  const fetchAssignments = useCallback(
    async (jobFunction: JobFunction) => {
      try {
        setAssignmentLoading(true);
        const response = await apiFetch(
          appendCinemaId(`/job-functions/${jobFunction.id}/users`, activeCinemaId),
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

  const resetForm = () => {
    setForm(emptyForm);
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

  const openEditModal = (jobFunction: JobFunction) => {
    setEditingId(jobFunction.id);
    setForm(toFormState(jobFunction));
    setFormModalOpen(true);
  };

  const openEmployeeModal = async (jobFunction: JobFunction) => {
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
        ...parseForm(form),
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
          : "Jobfunktionen er oprettet og kan senere bruges til bemanding og vagtønsker.",
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

  const archiveJobFunction = (jobFunction: JobFunction) => {
    confirmDialog.confirm({
      title: "Arkivér jobfunktion",
      description:
        `Vil du arkivere jobfunktionen "${jobFunction.name}"?\n\n` +
        "Historik bevares, og jobfunktionen kan genaktiveres senere.",
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
              await readErrorMessage(response, "Kunne ikke arkivere jobfunktion"),
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
        "Jobfunktionen kan igen bruges til bemanding og vagtønsker senere.",
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

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Vagtplanlægning
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Jobfunktioner
            </h1>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Jobfunktioner beskriver bemandingsroller og kompetencer. De er ikke
              lønarter og ændrer ikke vagtplanen endnu.
            </p>
          </header>

          {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Overblik
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
                    Jobfunktioner
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {loading
                      ? "Henter jobfunktioner..."
                      : `${jobFunctions.length} jobfunktioner vist · ${activeCount} aktive${
                          showArchived ? ` · ${archivedCount} arkiverede` : ""
                        }`}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Opret jobfunktion
                  </button>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Vis arkiverede
                  </label>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    Opdater
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
                  Brug jobfunktioner til at styre hvilke roller en vagt kræver,
                  og hvilke medarbejdere der kan ønskes, tildeles eller foreslås
                  til vagten. Vagtgenerering kommer i senere trin.
                </div>

                {loading && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Indlæser jobfunktioner...
                  </div>
                )}

                {!loading && jobFunctions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Ingen jobfunktioner fundet.
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Opret den første jobfunktion, fx A Vagt, B Vagt eller
                      Personalemøde.
                    </p>
                  </div>
                )}

                {!loading && jobFunctions.length > 0 && (
                  <div className="space-y-3">
                    {jobFunctions.map((jobFunction) => {
                      const employeeCount = getJobFunctionEmployeeCount(jobFunction);
                      return (
                        <article
                          key={jobFunction.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className="h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-gray-300 dark:ring-gray-700"
                                  style={{ backgroundColor: jobFunction.color }}
                                />
                                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
                                  {jobFunction.name}
                                </h3>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    jobFunction.isActive
                                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  }`}
                                >
                                  {jobFunction.isActive ? "Aktiv" : "Arkiveret"}
                                </span>
                              </div>

                              {jobFunction.description && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                  {jobFunction.description}
                                </p>
                              )}

                              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                                    Dagsperiode
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                                    {formatDayPeriod(jobFunction.dayPeriod)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                                    Sortering
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                                    {jobFunction.sortOrder}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                                    Farve
                                  </dt>
                                  <dd className="mt-1 font-mono text-gray-900 dark:text-gray-100">
                                    {jobFunction.color}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                                    Medarbejdere
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                                    {employeeCount}
                                  </dd>
                                </div>
                              </dl>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <button
                                type="button"
                                onClick={() => openEmployeeModal(jobFunction)}
                                className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950"
                              >
                                Medarbejdere
                              </button>
                              {jobFunction.isActive && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(jobFunction)}
                                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                  Redigér
                                </button>
                              )}
                              {jobFunction.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => archiveJobFunction(jobFunction)}
                                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                >
                                  Arkivér
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => reactivateJobFunction(jobFunction)}
                                  className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                                >
                                  Genaktivér
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Stamdata
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
                  {isEditing ? "Redigér jobfunktion" : "Opret jobfunktion"}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Angiv navn, farve og eventuel dagsperiode. Timingregler og
                  vagtgenerering kommer senere.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                disabled={saving}
              >
                Luk
              </button>
            </div>

            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                submitForm();
              }}
              className="space-y-5"
            >
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Navn
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={saving}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Beskrivelse
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Dagsperiode
                </span>
                <select
                  value={form.dayPeriodId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dayPeriodId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={saving}
                >
                  <option value="">Ingen dagsperiode</option>
                  {dayPeriods.map((dayPeriod) => (
                    <option key={dayPeriod.id} value={dayPeriod.id}>
                      {formatDayPeriod(dayPeriod)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Sortering
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={saving}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Farve
                  </span>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                      className="h-12 w-16 rounded-xl border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-800"
                      disabled={saving}
                    />
                    <input
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={saving}
                    />
                  </div>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  disabled={saving}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                >
                  {saving
                    ? "Gemmer..."
                    : isEditing
                      ? "Gem ændringer"
                      : "Opret jobfunktion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {employeeModalJobFunction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Medarbejdere
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
                  {employeeModalJobFunction.name}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Vælg hvilke medarbejdere der kan tage denne jobfunktion.
                  Dette er kompetence/eligibility og ikke løn.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEmployeeModal}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                disabled={assignmentSaving}
              >
                Luk
              </button>
            </div>

            {employeeModalJobFunction.isActive && (
              <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Tilføj medarbejder
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={assignmentSaving || availableUsers.length === 0}
                  >
                    <option value="">
                      {availableUsers.length === 0
                        ? "Alle aktive medarbejdere er tilføjet"
                        : "Vælg medarbejder"}
                    </option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {formatUserName(user)} · {user.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={assignSelectedUser}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      assignmentSaving || !selectedUserId || availableUsers.length === 0
                    }
                  >
                    {assignmentSaving ? "Tilføjer..." : "Tilføj"}
                  </button>
                </div>
              </div>
            )}

            {!employeeModalJobFunction.isActive && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Jobfunktionen er arkiveret. Du kan se og fjerne medarbejdere,
                men nye medarbejdere kan først tilføjes efter genaktivering.
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tildelte medarbejdere
                </h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {assignments.length}
                </span>
              </div>

              {assignmentLoading && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Henter medarbejdere...
                </div>
              )}

              {!assignmentLoading && assignments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Ingen medarbejdere har denne jobfunktion endnu.
                </div>
              )}

              {!assignmentLoading && assignments.length > 0 && (
                <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-3 bg-white p-4 dark:bg-gray-950/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-950 dark:text-white">
                          {formatUserName(assignment.user)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {assignment.user.email}
                        </p>
                        {assignment.assignedByUser && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Tildelt af {formatUserName(assignment.assignedByUser)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignedUser(assignment)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
                        disabled={assignmentSaving}
                      >
                        Fjern
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
