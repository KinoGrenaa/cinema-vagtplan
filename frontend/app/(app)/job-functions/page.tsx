"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getCurrentUserFromToken,
  getJobFunctionEmployeeCount,
  getSelectedMasterCinemaId,
  normalizeColorValue,
  readErrorMessage,
} from "./helpers/jobFunctionHelpers";
import type { CurrentUser, DayPeriod, JobFunction } from "./helpers/jobFunctionTypes";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

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

      const [jobFunctionsResponse, dayPeriodsResponse] = await Promise.all([
        apiFetch(
          appendCinemaId(
            `/job-functions?includeArchived=${showArchived}`,
            activeCinemaId,
          ),
        ),
        apiFetch(appendCinemaId("/day-periods?includeArchived=false", activeCinemaId)),
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

      const [jobFunctionsData, dayPeriodsData] = await Promise.all([
        jobFunctionsResponse.json(),
        dayPeriodsResponse.json(),
      ]);

      setJobFunctions(Array.isArray(jobFunctionsData) ? jobFunctionsData : []);
      setDayPeriods(Array.isArray(dayPeriodsData) ? dayPeriodsData : []);
    } catch (error) {
      setJobFunctions([]);
      setDayPeriods([]);
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
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

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

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-950 dark:bg-gray-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              Vagtplanlægning
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Jobfunktioner
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Jobfunktioner beskriver bemandingsroller og kompetencer. De er
              ikke lønarter og ændrer ikke vagtplanen endnu.
            </p>
          </header>

          {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 p-5 dark:border-gray-800 sm:flex sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Overblik
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Jobfunktioner</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {loading
                      ? "Henter jobfunktioner..."
                      : `${jobFunctions.length} jobfunktioner vist · ${activeCount} aktive${
                          showArchived ? ` · ${archivedCount} arkiverede` : ""
                        }`}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:items-end">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    Opret jobfunktion
                  </button>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
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
                      className="rounded-xl border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Opdater
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                  Brug jobfunktioner til at styre hvilke roller en vagt kræver,
                  og hvilke medarbejdere der senere kan ønskes eller foreslås.
                  Medarbejderkobling og vagtgenerering kommer i senere trin.
                </p>

                {loading && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Indlæser jobfunktioner...
                  </div>
                )}

                {!loading && jobFunctions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Ingen jobfunktioner fundet.</h3>
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
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className="h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-gray-300 dark:border-gray-900 dark:ring-gray-700"
                                  style={{ backgroundColor: jobFunction.color }}
                                />
                                <h3 className="text-lg font-semibold">
                                  {jobFunction.name}
                                </h3>
                                <span
                                  className={
                                    jobFunction.isActive
                                      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
                                      : "rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  }
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
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Dagsperiode
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-white">
                                    {formatDayPeriod(jobFunction.dayPeriod)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Sortering
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-white">
                                    {jobFunction.sortOrder}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Farve
                                  </dt>
                                  <dd className="mt-1 font-mono text-gray-900 dark:text-white">
                                    {jobFunction.color}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Medarbejdere
                                  </dt>
                                  <dd className="mt-1 text-gray-900 dark:text-white">
                                    {employeeCount}
                                  </dd>
                                </div>
                              </dl>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:justify-end">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Stamdata
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
                  {isEditing ? "Redigér jobfunktion" : "Opret jobfunktion"}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
              className="space-y-5 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                submitForm();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Navn
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={saving}
                    autoFocus
                  />
                </label>

                <label className="md:col-span-2">
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

                <label>
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

                <label>
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

                <label>
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
