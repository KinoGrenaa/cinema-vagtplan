"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import { apiFetch } from "@/app/lib/api";

import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {}

  return fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}


type User = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

type EmployeeDocument = {
  id: number;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  createdAt: string;
};

export default function EmployeeDocumentsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null;

    const savedUser = localStorage.getItem("user");

    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUserId) return;

    fetchDocuments(selectedUserId);
  }, [selectedUserId]);

  async function fetchUsers() {
    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente medarbejdere"),
        );
      }

      const data = await response.json();
      const nextUsers = Array.isArray(data) ? data : [];

      setUsers(nextUsers);

      if (nextUsers.length > 0) {
        setSelectedUserId(nextUsers[0].id);
      } else {
        setSelectedUserId(null);
        setDocuments([]);
        setLoading(false);
      }
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

  async function fetchDocuments(userId: number) {
    try {
      setLoading(true);

      const response = await apiFetch(`/employee-documents/user/${userId}`);

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

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

      await fetchDocuments(selectedUserId);
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
          const response = await apiFetch(`/employee-documents/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Dokumentet kunne ikke slettes.",
              ),
            );
          }

          if (selectedUserId) {
            await fetchDocuments(selectedUserId);
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
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Medarbejder dokumenter</h1>

          <p className="mt-1 text-sm text-gray-500">
            Upload og administrer dokumenter.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <label className="mb-2 block text-sm font-medium">Medarbejder</label>

          <select
            value={selectedUserId || ""}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={handleUpload}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">Titel</label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fx Ansættelseskontrakt"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Fil</label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {uploading ? "Uploader..." : "Upload dokument"}
          </button>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-bold">Dokumenter</h2>

          {loading ? (
            <p className="text-gray-500">Indlæser dokumenter...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-500">Ingen dokumenter fundet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div>
                    <p className="font-medium">{document.title}</p>

                    <p className="text-sm text-gray-500">{document.fileName}</p>

                    <p className="text-xs text-gray-400">
                      {new Date(document.createdAt).toLocaleDateString("da-DK")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`${API_URL}${document.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800"
                    >
                      Åbn
                    </a>

                    <button
                      onClick={() => handleDelete(document.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
                    >
                      Slet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
