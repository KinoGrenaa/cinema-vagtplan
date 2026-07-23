import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import {
  getEmployeeName,
  getSuggestedDocumentTitle,
  sortEmployees,
} from "../../helpers/core/employeeDocumentHelpers";
import type { User } from "../../helpers/core/employeeDocumentTypes";

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

const acceptedFileTypes =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.png,.jpg,.jpeg,.gif,.webp";

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
  const sortedUsers = sortEmployees(users);
  const formDisabled = needsMasterCinemaSelection;
  const canSubmit =
    !uploading &&
    !formDisabled &&
    Boolean(selectedUserId) &&
    Boolean(title.trim()) &&
    Boolean(file);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);

    if (nextFile && !title.trim()) {
      setTitle(getSuggestedDocumentTitle(nextFile.name));
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (formDisabled) {
      return;
    }

    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  function handleDropZoneKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (formDisabled || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    event.currentTarget.click();
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 md:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Nyt dokument
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">
          Upload dokument
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Dokumentet tilknyttes den valgte medarbejder og den aktive biograf.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Medarbejder
          </span>
          <select
            value={selectedUserId ?? ""}
            onChange={(event) => {
              const nextUserId = Number(event.target.value);
              setSelectedUserId(
                Number.isInteger(nextUserId) && nextUserId > 0
                  ? nextUserId
                  : null,
              );
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 shadow-sm outline-none transition hover:border-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            disabled={formDisabled || users.length === 0}
          >
            <option value="">Vælg medarbejder</option>
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {getEmployeeName(user)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Dokumenttitel
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Fx Ansættelseskontrakt"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 shadow-sm outline-none transition placeholder:text-gray-500 hover:border-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            disabled={formDisabled}
            maxLength={150}
          />
        </label>

        <div className="lg:col-span-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Fil
          </span>
          <label
            htmlFor="employee-document-file"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onKeyDown={handleDropZoneKeyDown}
            tabIndex={formDisabled ? -1 : 0}
            aria-disabled={formDisabled}
            className={`mt-2 flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center outline-none transition ${
              formDisabled
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 opacity-75 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500"
                : file
                  ? "cursor-pointer border-blue-400 bg-blue-50 text-blue-950 hover:border-blue-600 hover:bg-blue-100/70 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-blue-700 dark:bg-blue-950/35 dark:text-blue-100 dark:hover:border-blue-500 dark:hover:bg-blue-950/55 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
                  : "cursor-pointer border-gray-300 bg-gray-50 text-gray-900 hover:border-blue-500 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-blue-600 dark:hover:bg-blue-950/25 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
            }`}
          >
            <span className="text-base font-bold">
              {file ? file.name : "Træk en fil hertil eller klik for at vælge"}
            </span>
            <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              PDF, billeder og almindelige Office-dokumenter
            </span>

            {file && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectFile(null);
                }}
                className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
              >
                Fjern valgt fil
              </button>
            )}
          </label>

          <input
            key={file ? `selected-${file.name}` : "empty"}
            id="employee-document-file"
            type="file"
            accept={acceptedFileTypes}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            className="sr-only"
            disabled={formDisabled}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 lg:col-span-2"
        >
          {uploading ? "Uploader..." : "Upload dokument"}
        </button>
      </form>
    </section>
  );
}
