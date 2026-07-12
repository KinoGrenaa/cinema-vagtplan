import type { FormEvent } from "react";

import type { User } from "../../helpers/employeeDocumentTypes";

type EmployeeDocumentUploadFormProps = {
  users: User[];
  selectedUserId: number | null;
  setSelectedUserId: (userId: number | null) => void;
  title: string;
  setTitle: (title: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  uploading: boolean;
  needsMasterCinemaSelection: boolean;
  onSubmit: (event: FormEvent) => void;
};

export default function EmployeeDocumentUploadForm({
  users,
  selectedUserId,
  setSelectedUserId,
  title,
  setTitle,
  file,
  setFile,
  uploading,
  needsMasterCinemaSelection,
  onSubmit,
}: EmployeeDocumentUploadFormProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
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
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="hidden"
              disabled={needsMasterCinemaSelection}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading || needsMasterCinemaSelection || !selectedUserId}
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
  );
}
