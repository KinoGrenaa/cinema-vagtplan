"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  emptyForm,
  parseForm,
  toFormState,
  type FormState,
} from "../helpers/core/dayPeriodFormHelpers";
import {
  appendCinemaId,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../helpers/core/dayPeriodHelpers";
import type {
  CurrentUser,
  DayPeriod,
} from "../helpers/core/dayPeriodTypes";

export function useDayPeriodsPage() {
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

  return {
    confirmDialog,
    infoDialog,
    dayPeriods,
    loading,
    saving,
    showArchived,
    setShowArchived,
    form,
    setForm,
    formModalOpen,
    needsMasterCinemaSelection,
    isEditing,
    activeCount,
    archivedCount,
    fetchDayPeriods,
    closeFormModal,
    openCreateModal,
    openEditModal,
    submitForm,
    archiveDayPeriod,
    reactivateDayPeriod,
  };
}
