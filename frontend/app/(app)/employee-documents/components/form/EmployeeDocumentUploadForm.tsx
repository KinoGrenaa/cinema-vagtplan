import type {
  DragEvent,
  FormEvent,
} from "react";
import {
  getEmployeeName,
  getSuggestedDocumentTitle,
  sortEmployees,
} from "../../helpers/core/employeeDocumentHelpers";
import type { User } from "../../helpers/core/employeeDocumentTypes";

type EmployeeDocumentUploadFormProps = {
  users: User[];
  selectedUserId: number | null;
  setSelectedUserId: (
    userId: number | null,
  ) => void;
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
  const sortedUsers =
    sortEmployees(users);
  const formDisabled =
    needsMasterCinemaSelection;
  const canSubmit =
    !uploading &&
    !formDisabled &&
    Boolean(selectedUserId) &&
    Boolean(title.trim()) &&
    Boolean(file);

  function selectFile(
    nextFile: File | null,
  ) {
    setFile(nextFile);

    if (
      nextFile &&
      !title.trim()
    ) {
      setTitle(
        getSuggestedDocumentTitle(
          nextFile.name,
        ),
      );
    }
  }

  function handleDrop(
    event: DragEvent<HTMLLabelElement>,
  ) {
    event.preventDefault();

    if (formDisabled) {
      return;
    }

    selectFile(
      event.dataTransfer.files?.[0] ??
        null,
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="text-xl font-bold">
          Upload dokument
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Dokumentet tilknyttes den valgte
          medarbejder og den aktive
          biograf.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 lg:grid-cols-2"
      >
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Medarbejder
          </span>
          <select
            value={
              selectedUserId ?? ""
            }
            onChange={(event) => {
              const nextUserId = Number(
                event.target.value,
              );

              setSelectedUserId(
                Number.isInteger(
                  nextUserId,
                ) && nextUserId > 0
                  ? nextUserId
                  : null,
              );
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            disabled={
              formDisabled ||
              users.length === 0
            }
          >
            <option value="">
              Vælg medarbejder
            </option>
            {sortedUsers.map((user) => (
              <option
                key={user.id}
                value={user.id}
              >
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
            onChange={(event) =>
              setTitle(
                event.target.value,
              )
            }
            placeholder="Fx Ansættelseskontrakt"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={handleDrop}
            className={`mt-2 flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
              formDisabled
                ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70 dark:border-gray-800 dark:bg-gray-950"
                : file
                  ? "cursor-pointer border-blue-400 bg-blue-50 hover:border-blue-600 dark:border-blue-800 dark:bg-blue-950/30"
                  : "cursor-pointer border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
            }`}
          >
            <span className="text-base font-bold">
              {file
                ? file.name
                : "Træk en fil hertil eller klik for at vælge"}
            </span>
            <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              PDF, billeder og almindelige
              Office-dokumenter
            </span>
            {file && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  selectFile(null);
                }}
                className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Fjern valgt fil
              </button>
            )}
          </label>

          <input
            key={
              file
                ? `selected-${file.name}`
                : "empty"
            }
            id="employee-document-file"
            type="file"
            accept={acceptedFileTypes}
            onChange={(event) =>
              selectFile(
                event.target.files?.[0] ??
                  null,
              )
            }
            className="hidden"
            disabled={formDisabled}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`rounded-xl px-4 py-3 font-semibold text-white lg:col-span-2 ${
            canSubmit
              ? "bg-black hover:bg-gray-800 dark:bg-blue-700 dark:hover:bg-blue-800"
              : "cursor-not-allowed bg-gray-400"
          }`}
        >
          {uploading
            ? "Uploader..."
            : "Upload dokument"}
        </button>
      </form>
    </section>
  );
}
