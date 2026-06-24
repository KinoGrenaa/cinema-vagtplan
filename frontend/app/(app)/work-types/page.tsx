"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import { apiFetch } from "@/app/lib/api";

import WorkTypeFormSection from "./components/WorkTypeFormSection";
import WorkTypesHeader from "./components/WorkTypesHeader";
import WorkTypesListSection from "./components/WorkTypesListSection";
import WorkTypesMasterCinemaRequired from "./components/WorkTypesMasterCinemaRequired";
import {
  appendCinemaId,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "./helpers/workTypeHelpers";
import type { CurrentUser, PayrollType, WorkType } from "./helpers/workTypeTypes";

export default function WorkTypesPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [payrollTypeId, setPayrollTypeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const isMaster = currentUser?.role === "MASTER";

  const activeCinemaId =
    currentUser?.role === "MASTER" && !currentUser.cinemaId
      ? selectedMasterCinemaId
      : (currentUser?.cinemaId ?? null);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

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

  useEffect(() => {
    if (!isMaster && showArchived) {
      setShowArchived(false);
    }
  }, [isMaster, showArchived]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setWorkTypes([]);
      setPayrollTypes([]);
      setLoading(false);
      return;
    }

    fetchWorkTypes();
    fetchPayrollTypes();
  }, [currentUser, activeCinemaId, needsMasterCinemaSelection, showArchived]);

  async function fetchWorkTypes() {
    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId(
          `/work-types?includeArchived=${showArchived}`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente vagttyper"),
        );
      }

      const data = await response.json();

      setWorkTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setWorkTypes([]);

      infoDialog.showError(
        "Kunne ikke hente vagttyper",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagttyper skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayrollTypes() {
    try {
      const response = await apiFetch(
        appendCinemaId("/payroll-types", activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente lønarter"),
        );
      }

      const data = await response.json();

      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrollTypes([]);

      infoDialog.showError(
        "Kunne ikke hente lønarter",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da lønarter skulle hentes. Prøv igen.",
      );
    }
  }

  async function createWorkType() {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du opretter vagttyper.",
      );
      return;
    }

    if (!name.trim()) {
      infoDialog.showError(
        "Navn mangler",
        "Indtast et navn på vagttypen, før du opretter den.",
      );
      return;
    }

    try {
      const response = await apiFetch("/work-types", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          color,
          payrollTypeId: payrollTypeId ? Number(payrollTypeId) : null,
          cinemaId: activeCinemaId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagttype"),
        );
      }

      setName("");
      setColor("#2563eb");
      setPayrollTypeId("");

      await fetchWorkTypes();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagttype",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagttypen skulle oprettes. Prøv igen.",
      );
    }
  }

  function removeWorkType(id: number) {
    confirmDialog.confirm({
      title: "Arkivér vagttype",
      description:
        "Er du sikker på, at du vil arkivere denne vagttype?\n\n" +
        "Historiske vagter, løndata og rapporter bevares.\n\n" +
        "Vagttypen kan genaktiveres senere.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/work-types/${id}`, activeCinemaId),
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(response, "Kunne ikke arkivere vagttype"),
            );
          }

          await fetchWorkTypes();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere vagttype",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagttypen skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  }

  function reactivateWorkType(id: number) {
    confirmDialog.confirm({
      title: "Genaktivér vagttype",
      description:
        "Vil du genaktivere denne vagttype?\n\n" +
        "Vagttypen kan igen bruges ved oprettelse og redigering af vagter.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/work-types/${id}/reactivate`, activeCinemaId),
            {
              method: "PATCH",
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke genaktivere vagttype",
              ),
            );
          }

          await fetchWorkTypes();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke genaktivere vagttype",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagttypen skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl space-y-6">
          <WorkTypesHeader />

          {needsMasterCinemaSelection && <WorkTypesMasterCinemaRequired />}

          <WorkTypeFormSection
            name={name}
            color={color}
            payrollTypeId={payrollTypeId}
            payrollTypes={payrollTypes}
            disabled={needsMasterCinemaSelection}
            onNameChange={setName}
            onColorChange={setColor}
            onPayrollTypeIdChange={setPayrollTypeId}
            onCreate={createWorkType}
          />

          <WorkTypesListSection
            workTypes={workTypes}
            loading={loading}
            isMaster={isMaster}
            showArchived={showArchived}
            disabled={needsMasterCinemaSelection}
            onShowArchivedChange={setShowArchived}
            onRemove={removeWorkType}
            onReactivate={reactivateWorkType}
          />
        </div>
      </main>

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
