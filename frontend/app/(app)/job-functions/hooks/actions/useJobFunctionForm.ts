import { useCallback, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  emptyJobFunctionForm,
  parseJobFunctionForm,
  toJobFunctionFormState,
} from "../../helpers/form/jobFunctionFormHelpers";
import type { JobFunctionFormState } from "../../helpers/form/jobFunctionFormHelpers";
import type {
  JobFunctionShowError,
  JobFunctionShowInfo,
} from "../../helpers/types/jobFunctionDialogTypes";
import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/page/jobFunctionHelpers";
import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type UseJobFunctionFormOptions = {
  activeCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  refreshData: () => Promise<void>;
  show: JobFunctionShowInfo;
  showError: JobFunctionShowError;
};

export function useJobFunctionForm({
  activeCinemaId,
  needsMasterCinemaSelection,
  refreshData,
  show,
  showError,
}: UseJobFunctionFormOptions) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<JobFunctionFormState>(emptyJobFunctionForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const isEditing = editingId !== null;

  const resetForm = useCallback(() => {
    setForm(emptyJobFunctionForm);
    setEditingId(null);
  }, []);

  const closeFormModal = useCallback(() => {
    if (saving) {
      return;
    }

    resetForm();
    setFormModalOpen(false);
  }, [resetForm, saving]);

  const openCreateModal = useCallback(() => {
    resetForm();
    setFormModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((jobFunction: JobFunctionWithJobFunction) => {
    setEditingId(jobFunction.id);
    setForm(toJobFunctionFormState(jobFunction));
    setFormModalOpen(true);
  }, []);

  const submitForm = useCallback(async () => {
    if (needsMasterCinemaSelection) {
      showError(
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
      await refreshData();
      show({
        title: editingId ? "Jobfunktion opdateret" : "Jobfunktion oprettet",
        description: editingId
          ? "Jobfunktionen er gemt."
          : "Jobfunktionen er oprettet og kan bruges i vagtplanlægning.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      showError(
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
  }, [
    activeCinemaId,
    closeFormModal,
    editingId,
    form,
    needsMasterCinemaSelection,
    refreshData,
    show,
    showError,
  ]);


  const copyJobFunction = useCallback(async (jobFunction: JobFunctionWithJobFunction) => {
    if (needsMasterCinemaSelection) {
      showError("Biograf mangler", "Vælg først en biograf, før jobfunktionen kopieres.");
      return;
    }
    try {
      setSaving(true);
      const response = await apiFetch(
        appendCinemaId(`/job-functions/${jobFunction.id}/copy`, activeCinemaId),
        {
          method: "POST",
          body: JSON.stringify({
            cinemaId: activeCinemaId,
            copyQualifiedUsers: true,
            copySpecialPayRules: true,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Jobfunktionen kunne ikke kopieres."));
      }
      const copy = (await response.json()) as JobFunctionWithJobFunction;
      await refreshData();
      show({
        title: "Jobfunktion kopieret",
        description: `Kopien er oprettet som “${copy.name}”. Planlagte vagter og historik er ikke kopieret.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      showError("Jobfunktionen kunne ikke kopieres", error instanceof Error ? error.message : "Der opstod en fejl under kopieringen.");
    } finally {
      setSaving(false);
    }
  }, [activeCinemaId, needsMasterCinemaSelection, refreshData, show, showError]);

  return {
    closeFormModal,
    copyJobFunction,
    editingId,
    form,
    formModalOpen,
    isEditing,
    openCreateModal,
    openEditModal,
    saving,
    setForm,
    submitForm,
  };
}
