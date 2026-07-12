import { getDocumentUrl } from "../../helpers/core/employeeDocumentHelpers";

import type { EmployeeDocument } from "../../helpers/core/employeeDocumentTypes";

type EmployeeDocumentsListSectionProps = {
  documents: EmployeeDocument[];
  loading: boolean;
  onDelete: (id: number) => void;
};

export default function EmployeeDocumentsListSection({
  documents,
  loading,
  onDelete,
}: EmployeeDocumentsListSectionProps) {
  return (
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
                  {new Date(document.createdAt).toLocaleDateString("da-DK")}
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
                  onClick={() => onDelete(document.id)}
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
  );
}
