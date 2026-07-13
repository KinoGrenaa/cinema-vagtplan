"use client";

import { useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  emptyForm,
  parseForm,
  toFormState,
  type FormState,
} from "../../helpers/core/dayPeriodFormHelpers";
import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/core/dayPeriodHelpers";
import type { DayPeriod } from "../../helpers/core/dayPeriodTypes";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "success";
  onConfirm: () => Promise<void>;
};

type ShowInfoOptions = {
  title: string;
  description: string;
  variant: "success";
  buttonText: string;
};

type UseDayPeriodActionsOptions = {
  activeCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  fetchDayPeriods: () => Promise<void>;
  confirm: (options: ConfirmOptions) => void;
  show: (options: ShowInfoOptions) => void;
  showError: (title: string, description: string) => void;
};

export function useDayPeriodActions({
  activeCinemaId,
  needsMasterCinemaSelection,
  fetchDayPeriods,
  confirm,
  show,
  showError,
}: UseDayPeriodActionsOptions) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const isEditing = editingId !== null;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    resetForm();
    setFormModalOpen(false);
  }

  function openCreateModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(dayPeriod: DayPeriod) {
    setEditingId(dayPeriod.id);
    setForm(toFormState(dayPeriod));
    setFormModalOpen(true);
  }

  async function submitForm() {
    if (needsMasterCinemaSelection) {
      showError(
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
      show({
        title: editingId ? "Dagsperiode opdateret" : "Dagsperiode oprettet",
        description: editingId
          ? "Dagsperioden er gemt."
          : "Dagsperioden er oprettet og kan bruges som beregningsramme for jobfunktioner senere.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      showError(
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
  }

  function archiveDayPeriod(dayPeriod: DayPeriod) {
    confirm({
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
          showError(
            "Kunne ikke arkivere dagsperiode",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da dagsperioden skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  }

  function reactivateDayPeriod(dayPeriod: DayPeriod) {
    confirm({
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
          showError(
            "Kunne ikke genaktivere dagsperiode",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da dagsperioden skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  }

  return {
    archiveDayPeriod,
    closeFormModal,
    form,
    formModalOpen,
    isEditing,
    openCreateModal,
    openEditModal,
    reactivateDayPeriod,
    saving,
    setForm,
    submitForm,
  };
}
