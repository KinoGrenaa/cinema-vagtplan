"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import DayPeriodsMasterCinemaRequired from "./components/DayPeriodsMasterCinemaRequired";
import {
  appendCinemaId,
  formatMinute,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  minuteToTime,
  readErrorMessage,
  timeToMinute,
} from "./helpers/dayPeriodHelpers";
import type { CurrentUser, DayPeriod } from "./helpers/dayPeriodTypes";

type FormState = {
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: string;
};

const emptyForm: FormState = {
  name: "",
  startTime: "08:00",
  endTime: "17:30",
  sortOrder: "0",
};

function toFormState(dayPeriod: DayPeriod): FormState {
  return {
    name: dayPeriod.name,
    startTime: minuteToTime(dayPeriod.startMinute),
    endTime: minuteToTime(dayPeriod.endMinute),
    sortOrder: String(dayPeriod.sortOrder ?? 0),
  };
}

function parseForm(form: FormState) {
  const name = form.name.trim();
  const startMinute = timeToMinute(form.startTime);
  const endMinute = timeToMinute(form.endTime);
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!name) {
    throw new Error("Indtast et navn på dagsperioden.");
  }

  if (startMinute === null) {
    throw new Error("Starttidspunkt skal være et gyldigt tidspunkt.");
  }

  if (endMinute === null) {
    throw new Error("Sluttidspunkt skal være et gyldigt tidspunkt.");
  }

  if (endMinute <= startMinute) {
    throw new Error("Starttidspunkt skal være før sluttidspunkt.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    name,
    startMinute,
    endMinute,
    sortOrder,
  };
}

function getDurationText(form: FormState) {
  const startMinute = timeToMinute(form.startTime);
  const endMinute = timeToMinute(form.endTime);

  if (startMinute === null || endMinute === null || endMinute <= startMinute) {
    return "Varighed kan beregnes, når start og slut er gyldige.";
  }

  const durationMinutes = endMinute - startMinute;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min.`;
  }

  if (minutes === 0) {
    return `${hours} t.`;
  }

  return `${hours} t. ${minutes} min.`;
}

export default function DayPeriodsPage() {
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
  const activeCount = dayPeriods.filter((dayPeriod) => dayPeriod.isActive).length;
  const archivedCount = dayPeriods.length - activeCount;

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

  const fetchDayPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(
        appendCinemaId(
          `/day-periods?includeArchived=${showArchived}`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente dagsperioder"),
        );
      }

      const data = await response.json();
      setDayPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      setDayPeriods([]);
      infoDialogRef.current.showError(
        "Kunne ikke hente dagsperioder",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da dagsperioder skulle hentes. Prøv igen.",
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
      setDayPeriods([]);
      setLoading(false);
      return;
    }

    fetchDayPeriods();
  }, [currentUser, fetchDayPeriods, needsMasterCinemaSelection]);

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

  const openEditModal = (dayPeriod: DayPeriod) => {
    setEditingId(dayPeriod.id);
    setForm(toFormState(dayPeriod));
    setFormModalOpen(true);
  };

  const submitForm = async () => {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du gemmer dagsperioder.",
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
          ? appendCinemaId(`/day-periods/${editingId}`, activeCinemaId)
          : "/day-periods",
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
              ? "Kunne ikke opdatere dagsperiode"
              : "Kunne ikke oprette dagsperiode",
          ),
        );
      }

      closeFormModal();
      await fetchDayPeriods();
      infoDialog.show({
        title: editingId ? "Dagsperiode opdateret" : "Dagsperiode oprettet",
        description: editingId
          ? "Dagsperioden er gemt."
          : "Dagsperioden er oprettet og kan bruges som beregningsramme for jobfunktioner senere.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        editingId
          ? "Kunne ikke opdatere dagsperiode"
          : "Kunne ikke oprette dagsperiode",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da dagsperioden skulle gemmes. Prøv igen.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveDayPeriod = (dayPeriod: DayPeriod) => {
    confirmDialog.confirm({
      title: "Arkivér dagsperiode",
      description:
        `Vil du arkivere dagsperioden "${dayPeriod.name}"?\n\n` +
        "Historik bevares, og dagsperioden kan genaktiveres senere.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/day-periods/${dayPeriod.id}`, activeCinemaId),
            { method: "DELETE" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(response, "Kunne ikke arkivere dagsperiode"),
            );
          }

          if (editingId === dayPeriod.id) {
            closeFormModal();
          }

          await fetchDayPeriods();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere dagsperiode",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da dagsperioden skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  };

  const reactivateDayPeriod = (dayPeriod: DayPeriod) => {
    confirmDialog.confirm({
      title: "Genaktivér dagsperiode",
      description:
        `Vil du genaktivere dagsperioden "${dayPeriod.name}"?\n\n` +
        "Dagsperioden kan igen bruges som beregningsramme for jobfunktioner senere.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(
              `/day-periods/${dayPeriod.id}/reactivate`,
              activeCinemaId,
            ),
            { method: "PATCH" },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke genaktivere dagsperiode",
              ),
            );
          }

          await fetchDayPeriods();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke genaktivere dagsperiode",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da dagsperioden skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  };

  return (
    <AdminGuard>
      <main className="min-h-screen space-y-6 bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vagtplanlægning
          </p>
          <h1 className="mt-1 text-3xl font-bold">Dagsperioder</h1>
          <p className="mx-auto mt-2 max-w-4xl text-sm text-gray-600 dark:text-gray-300">
            Dagsperioder er hårde beregningsrammer for kommende jobfunktioner.
            De er ikke lønarter og ændrer ikke vagtplanen endnu.
          </p>
        </header>

        {needsMasterCinemaSelection && <DayPeriodsMasterCinemaRequired />}

        {!needsMasterCinemaSelection && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Overblik
                </p>
                <h2 className="mt-1 text-2xl font-bold">Dagsperioder</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {loading
                    ? "Henter dagsperioder..."
                    : `${dayPeriods.length} dagsperioder vist · ${activeCount} aktive${
                        showArchived ? ` · ${archivedCount} arkiverede` : ""
                      }`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  Opret dagsperiode
                </button>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
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
                  onClick={fetchDayPeriods}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  disabled={loading}
                >
                  Opdater
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
              Brug dagsperioder som faste tidsrammer, fx A-vagt weekend eller
              hverdagsaften. De bliver senere brugt som clamp/fallback i
              jobfunktionernes beregning.
            </div>

            {loading && (
              <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Indlæser dagsperioder...
              </div>
            )}

            {!loading && dayPeriods.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Ingen dagsperioder fundet.
              </div>
            )}

            {!loading && dayPeriods.length > 0 && (
              <div className="mt-5 space-y-3">
                {dayPeriods.map((dayPeriod) => (
                  <article
                    key={dayPeriod.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {dayPeriod.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              dayPeriod.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {dayPeriod.isActive ? "Aktiv" : "Arkiveret"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          Beregningsramme for jobfunktioner
                        </p>
                      </div>

                      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:min-w-[520px]">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Tid
                          </dt>
                          <dd className="mt-1 font-semibold">
                            {formatMinute(dayPeriod.startMinute)} -{" "}
                            {formatMinute(dayPeriod.endMinute)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Varighed
                          </dt>
                          <dd className="mt-1 font-semibold">
                            {getDurationText({
                              name: dayPeriod.name,
                              startTime: minuteToTime(dayPeriod.startMinute),
                              endTime: minuteToTime(dayPeriod.endMinute),
                              sortOrder: String(dayPeriod.sortOrder),
                            })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Sortering
                          </dt>
                          <dd className="mt-1 font-semibold">
                            {dayPeriod.sortOrder}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {dayPeriod.isActive && (
                          <button
                            type="button"
                            onClick={() => openEditModal(dayPeriod)}
                            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            Redigér
                          </button>
                        )}
                        {dayPeriod.isActive ? (
                          <button
                            type="button"
                            onClick={() => archiveDayPeriod(dayPeriod)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            Arkivér
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => reactivateDayPeriod(dayPeriod)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                          >
                            Genaktivér
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Stamdata
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {isEditing ? "Redigér dagsperiode" : "Opret dagsperiode"}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Brug tider som kl. 08:00-17:30 eller kl. 16:00-23:59.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                disabled={saving}
              >
                Luk
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitForm();
              }}
            >
              <label className="block space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                <span>Navn</span>
                <input
                  type="text"
                  placeholder="Fx A Vagt Weekend"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  disabled={saving}
                  autoFocus
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <span>Start</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark]"
                    disabled={saving}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <span>Slut</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark]"
                    disabled={saving}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <span>Sortering</span>
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
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  disabled={saving}
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {saving
                    ? "Gemmer..."
                    : isEditing
                      ? "Gem ændringer"
                      : "Opret dagsperiode"}
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
