"use client";

import { useEffect, useMemo, useState } from "react";
import {
  filterAndSortDocuments,
  formatDocumentDate,
  formatDocumentDateTime,
  getDocumentCategory,
  getDocumentCategoryIcon,
  getDocumentCategoryLabel,
  getDocumentCategoryStyle,
  getDocumentSummary,
  getDocumentUrl,
} from "../../helpers/core/employeeDocumentHelpers";
import type {
  EmployeeDocument,
  EmployeeDocumentSort,
  EmployeeDocumentTypeFilter,
} from "../../helpers/core/employeeDocumentTypes";

type EmployeeDocumentsListSectionProps = {
  documents: EmployeeDocument[];
  loading: boolean;
  selectedUserId: number | null;
  selectedUserName: string | null;
  onDelete: (id: number) => void;
};

const filterControlClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 shadow-sm outline-none transition placeholder:text-gray-500 hover:border-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30";

export default function EmployeeDocumentsListSection({
  documents,
  loading,
  selectedUserId,
  selectedUserName,
  onDelete,
}: EmployeeDocumentsListSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<EmployeeDocumentTypeFilter>("ALL");
  const [sort, setSort] = useState<EmployeeDocumentSort>("NEWEST");

  useEffect(() => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setSort("NEWEST");
  }, [selectedUserId]);

  const visibleDocuments = useMemo(
    () => filterAndSortDocuments(documents, searchQuery, typeFilter, sort),
    [documents, searchQuery, sort, typeFilter],
  );

  const summary = useMemo(() => getDocumentSummary(documents), [documents]);

  if (!selectedUserId) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-xl text-blue-800 dark:border-blue-900 dark:bg-blue-950/45 dark:text-blue-200">
          ↳
        </div>
        <h2 className="mt-4 text-xl font-black text-gray-950 dark:text-white">
          Vælg en medarbejder
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Når en medarbejder er valgt, vises dokumentarkivet og uploadfunktionen
          for personen.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Arkiv
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">
              Dokumentarkiv
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {selectedUserName
                ? `Dokumenter for ${selectedUserName}`
                : "Dokumenter for den valgte medarbejder"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
              {summary.total} i alt
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200">
              {summary.pdf} PDF
            </span>
            <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-2 text-purple-800 dark:border-purple-900 dark:bg-purple-950/35 dark:text-purple-200">
              {summary.images} billeder
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200">
              {summary.office} Office
            </span>
          </div>
        </div>

        {summary.latestCreatedAt && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Seneste upload: {formatDocumentDateTime(summary.latestCreatedAt)}
          </p>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Søg i dokumenter
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Søg på titel eller filnavn"
              className={filterControlClassName}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Filtype
            </span>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as EmployeeDocumentTypeFilter)
              }
              className={filterControlClassName}
            >
              <option value="ALL">Alle filtyper</option>
              <option value="PDF">PDF</option>
              <option value="IMAGE">Billeder</option>
              <option value="OFFICE">Office</option>
              <option value="OTHER">Andre filer</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Sortering
            </span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as EmployeeDocumentSort)
              }
              className={filterControlClassName}
            >
              <option value="NEWEST">Nyeste først</option>
              <option value="OLDEST">Ældste først</option>
              <option value="TITLE">Titel A–Å</option>
            </select>
          </label>
        </div>
      </div>

      <div
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
        aria-live="polite"
      >
        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-300">
            Indlæser dokumenter...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-950/60">
            <h3 className="font-bold text-gray-950 dark:text-white">
              Ingen dokumenter endnu
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Upload det første dokument ovenfor.
            </p>
          </div>
        ) : visibleDocuments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-950/60">
            <h3 className="font-bold text-gray-950 dark:text-white">
              Ingen dokumenter matcher
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Prøv en anden søgning eller filtype.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleDocuments.map((document) => {
              const category = getDocumentCategory(document);
              const documentUrl = getDocumentUrl(document.fileUrl);

              return (
                <article
                  key={document.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 hover:bg-white hover:shadow-sm dark:border-gray-800 dark:bg-gray-950/55 dark:hover:border-gray-700 dark:hover:bg-gray-950"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${getDocumentCategoryStyle(
                          category,
                        )}`}
                        aria-hidden="true"
                      >
                        {getDocumentCategoryIcon(category)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-gray-950 dark:text-white">
                          {document.title}
                        </h3>
                        <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
                          {document.fileName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{getDocumentCategoryLabel(category)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Uploadet {formatDocumentDate(document.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
                      >
                        Åbn
                      </a>
                      <a
                        href={documentUrl}
                        download={document.fileName}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => onDelete(document.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
                      >
                        Slet
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
