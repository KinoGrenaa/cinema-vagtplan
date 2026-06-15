"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

    return JSON.parse(savedUser);
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

      if (!response.ok) return;

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setSelectedUserId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchDocuments(userId: number) {
    try {
      setLoading(true);

      const response = await apiFetch(`/employee-documents/user/${userId}`);

      if (!response.ok) {
        setDocuments([]);
        return;
      }

      const data = await response.json();

      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !selectedUserId || !title.trim()) return;

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("title", title);
      formData.append("userId", String(selectedUserId));

      const response = await apiFetch("/employee-documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Upload fejlede");
        return;
      }

      setTitle("");
      setFile(null);

      fetchDocuments(selectedUserId);
      toast.success("Dokument uploadet");
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke uploade dokument");
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
            console.error("Kunne ikke slette dokument");
            return;
          }

          if (selectedUserId) {
            fetchDocuments(selectedUserId);
          }
        } catch (error) {
          console.error(error);
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
    </AdminGuard>
  );
}
