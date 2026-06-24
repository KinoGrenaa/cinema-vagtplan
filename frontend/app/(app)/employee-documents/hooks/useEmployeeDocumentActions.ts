"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";
import {
  appendCinemaId,
  getErrorMessage,
  readErrorMessage,
} from "../helpers/employeeDocumentHelpers";

type ConfirmDialog = {
  confirm: (input: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    confirmVariant: "danger";
    onConfirm: () => Promise<void>;
  }) => void;
};

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseEmployeeDocumentActionsParams = {
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
  needsMasterCinemaSelection: boolean;
  selectedUserId: number | null;
  activeCinemaId: number | null;
  fetchDocuments: (userId: number, cinemaId: number | null) => Promise<void>;
};

export function useEmployeeDocumentActions({
  confirmDialog,
  infoDialog,
  needsMasterCinemaSelection,
  selectedUserId,
  activeCinemaId,
  fetchDocuments,
}: UseEmployeeDocumentActionsParams) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: FormEvent) {
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

  return {
    title,
    setTitle,
    file,
    setFile,
    uploading,
    handleUpload,
    handleDelete,
  };
}
