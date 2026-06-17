"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

type CurrentUser = {
  id?: number;
  sub?: number;
  email?: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

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

function getCurrentUserFromStorage() {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem("user");

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser) as CurrentUser;
  } catch {
    return null;
  }
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;

  const cinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;

  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

function getDocumentUrl(fileUrl: string) {
  const uploadsIndex = fileUrl.indexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return `${API_URL}${fileUrl.slice(uploadsIndex)}`;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return `${API_URL}${fileUrl}`;
  }

  return `${API_URL}/${fileUrl}`;
}

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
          <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Medarbejderdokumenter</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Upload og administrer dokumenter.
            </p>
          </section>

          {needsMasterCinemaSelection && (
            <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
              <div className="text-sm font-medium uppercase tracking-wide">
                Biograf mangler
              </div>

              <p className="mt-2 text-sm">
                Vælg først en biograf i MASTER-panelet, før du administrerer
                medarbejderdokumenter.
              </p>

              <a
                href="/master"
                className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
              >
                Gå til MASTER-panel
              </a>
            </section>
          )}

          <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Medarbejder
                </span>
                <select
                  value={selectedUserId ?? ""}
                  onChange={(event) => {
                    const nextUserId = Number(event.target.value);
                    setSelectedUserId(
                      Number.isFinite(nextUserId) && nextUserId > 0
                        ? nextUserId
                        : null,
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  disabled={needsMasterCinemaSelection || users.length === 0}
                >
                  <option value="">Vælg medarbejder</option>

                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Titel
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Fx Ansættelseskontrakt"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  disabled={needsMasterCinemaSelection}
                />
              </label>

              <div className="block md:col-span-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Fil
                </span>

                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-950 sm:flex-row sm:items-center">
                  <label
                    htmlFor="employee-document-file"
                    className={`inline-flex w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      needsMasterCinemaSelection
                        ? "cursor-not-allowed bg-gray-400"
                        : "cursor-pointer bg-blue-700 hover:bg-blue-800"
                    }`}
                  >
                    Vælg fil
                  </label>

                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {file ? file.name : "Ingen fil valgt"}
                  </span>

                  <input
                    key={file ? "file-selected" : "file-empty"}
                    id="employee-document-file"
                    type="file"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] || null)
                    }
                    className="hidden"
                    disabled={needsMasterCinemaSelection}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  uploading || needsMasterCinemaSelection || !selectedUserId
                }
                className={`rounded-xl px-4 py-3 font-semibold text-white md:col-span-2 ${
                  uploading || needsMasterCinemaSelection || !selectedUserId
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-black hover:bg-gray-800 dark:bg-blue-700 dark:hover:bg-blue-800"
                }`}
              >
                {uploading ? "Uploader..." : "Upload dokument"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold">Dokumenter</h2>

            {loading ? (
              <p className="text-gray-600 dark:text-gray-300">
                Indlæser dokumenter...
              </p>
            ) : documents.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Ingen dokumenter fundet.
              </p>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-950/40 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">{document.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {document.fileName}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(document.createdAt).toLocaleDateString(
                          "da-DK",
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={getDocumentUrl(document.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Åbn
                      </a>
                      <button
                        onClick={() => handleDelete(document.id)}
                        className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        Slet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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
