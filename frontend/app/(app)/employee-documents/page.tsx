"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";
import EmployeeDocumentsHeader from "./components/EmployeeDocumentsHeader";
import EmployeeDocumentsListSection from "./components/EmployeeDocumentsListSection";
import EmployeeDocumentsMasterCinemaRequired from "./components/EmployeeDocumentsMasterCinemaRequired";
import EmployeeDocumentUploadForm from "./components/EmployeeDocumentUploadForm";
import {
  appendCinemaId,
  getCurrentUserFromStorage,
  getErrorMessage,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "./helpers/employeeDocumentHelpers";
import type {
  CurrentUser,
  EmployeeDocument,
  User,
} from "./helpers/employeeDocumentTypes";

export default function EmployeeDocumentsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const activeCinemaId = useMemo(() => {
    if (!currentUser) return null;

    if (currentUser.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser.cinemaId;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  useEffect(() => {
    function updateUserContext() {
      setCurrentUser(getCurrentUserFromStorage());
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateUserContext();

    window.addEventListener("storage", updateUserContext);
    window.addEventListener("masterSelectedCinemaChanged", updateUserContext);

    return () => {
      window.removeEventListener("storage", updateUserContext);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateUserContext,
      );
    };
  }, []);

  async function fetchDocuments(userId: number, cinemaId: number | null) {
    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId(`/employee-documents/user/${userId}`, cinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente dokumenter"),
        );
      }

      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      setDocuments([]);

      infoDialog.showError(
        "Kunne ikke hente dokumenter",
        getErrorMessage(error, "Dokumenterne kunne ikke hentes. Prøv igen."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers(
    cinemaId: number | null,
    masterCinemaSelectionMissing: boolean,
  ) {
    if (masterCinemaSelectionMissing) {
      setUsers([]);
      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(appendCinemaId("/users", cinemaId));

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente medarbejdere"),
        );
      }

      const data = await response.json();
      const nextUsers = Array.isArray(data) ? data : [];

      setUsers(nextUsers);

      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);
    } catch (error) {
      setUsers([]);
      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);

      infoDialog.showError(
        "Kunne ikke hente medarbejdere",
        getErrorMessage(error, "Medarbejderne kunne ikke hentes. Prøv igen."),
      );
    }
  }

  useEffect(() => {
    if (!currentUser) return;

    fetchUsers(activeCinemaId, needsMasterCinemaSelection);
  }, [currentUser, activeCinemaId, needsMasterCinemaSelection]);

  useEffect(() => {
    if (!selectedUserId || needsMasterCinemaSelection) return;

    fetchDocuments(selectedUserId, activeCinemaId);
  }, [activeCinemaId, needsMasterCinemaSelection, selectedUserId]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();

    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg en biograf i MASTER-panelet, før du uploader dokumenter.",
      );
      return;
    }

    if (!selectedUserId) {
      infoDialog.showError(
        "Dokumentet kan ikke uploades",
        "Vælg en medarbejder først.",
      );
      return;
    }

    if (!title.trim()) {
      infoDialog.showError(
        "Dokumentet kan ikke uploades",
        "Udfyld en titel først.",
      );
      return;
    }

    if (!file) {
      infoDialog.showError(
        "Dokumentet kan ikke uploades",
        "Vælg en fil først.",
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("userId", String(selectedUserId));

      if (activeCinemaId) {
        formData.append("cinemaId", String(activeCinemaId));
      }

      const response = await apiFetch("/employee-documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Dokumentet kunne ikke uploades."),
        );
      }

      setTitle("");
      setFile(null);
      await fetchDocuments(selectedUserId, activeCinemaId);
      toast.success("Dokument uploadet");
    } catch (error) {
      infoDialog.showError(
        "Upload fejlede",
        getErrorMessage(error, "Dokumentet kunne ikke uploades. Prøv igen."),
      );
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: number) {
    confirmDialog.confirm({
      title: "Slet dokument",
      description: "Er du sikker på, at du vil slette dokumentet?",
      confirmText: "Slet",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/employee-documents/${id}`, activeCinemaId),
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Dokumentet kunne ikke slettes.",
              ),
            );
          }

          if (selectedUserId) {
            await fetchDocuments(selectedUserId, activeCinemaId);
          }

          toast.success("Dokument slettet");
        } catch (error) {
          infoDialog.showError(
            "Dokumentet kunne ikke slettes",
            getErrorMessage(
              error,
              "Der opstod en fejl, da dokumentet skulle slettes. Prøv igen.",
            ),
          );
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-5xl space-y-6">
          <EmployeeDocumentsHeader />

          {needsMasterCinemaSelection && <EmployeeDocumentsMasterCinemaRequired />}

          <EmployeeDocumentUploadForm
            users={users}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            title={title}
            setTitle={setTitle}
            file={file}
            setFile={setFile}
            uploading={uploading}
            needsMasterCinemaSelection={needsMasterCinemaSelection}
            onSubmit={handleUpload}
          />

          <EmployeeDocumentsListSection
            documents={documents}
            loading={loading}
            onDelete={handleDelete}
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
