import type {
  CurrentUser,
  EmployeeDocument,
  EmployeeDocumentCategory,
  EmployeeDocumentSort,
  EmployeeDocumentSummary,
  EmployeeDocumentTypeFilter,
  User,
} from "./employeeDocumentTypes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

const documentDateFormatter =
  new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const documentDateTimeFormatter =
  new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const imageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
]);

const officeExtensions = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
]);

export async function readErrorMessage(
  response: Response,
  fallback: string,
) {
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

export function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

export function getCurrentUserFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedUser =
    localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(
      savedUser,
    ) as CurrentUser;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const cinemaId = Number(
    localStorage.getItem(
      MASTER_SELECTED_CINEMA_ID_KEY,
    ),
  );

  if (
    !Number.isInteger(cinemaId) ||
    cinemaId <= 0
  ) {
    return null;
  }

  return cinemaId;
}

export function appendCinemaId(
  endpoint: string,
  cinemaId: number | null,
) {
  if (!cinemaId) {
    return endpoint;
  }

  const separator = endpoint.includes("?")
    ? "&"
    : "?";

  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

export function getDocumentUrl(
  fileUrl: string,
) {
  const uploadsIndex =
    fileUrl.indexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return `${API_URL}${fileUrl.slice(
      uploadsIndex,
    )}`;
  }

  if (
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://")
  ) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return `${API_URL}${fileUrl}`;
  }

  return `${API_URL}/${fileUrl}`;
}

export function getEmployeeName(
  user: User,
) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function sortEmployees(
  users: User[],
) {
  return [...users].sort((first, second) =>
    getEmployeeName(first).localeCompare(
      getEmployeeName(second),
      "da",
    ),
  );
}

export function getDocumentExtension(
  fileName: string,
) {
  const extension =
    fileName.split(".").pop()?.trim() ?? "";

  return extension.toLocaleLowerCase(
    "da-DK",
  );
}

export function getDocumentCategory(
  document: Pick<
    EmployeeDocument,
    "fileName" | "fileType"
  >,
): EmployeeDocumentCategory {
  const extension = getDocumentExtension(
    document.fileName,
  );
  const fileType =
    document.fileType?.toLocaleLowerCase(
      "da-DK",
    ) ?? "";

  if (
    extension === "pdf" ||
    fileType.includes("pdf")
  ) {
    return "PDF";
  }

  if (
    imageExtensions.has(extension) ||
    fileType.startsWith("image/")
  ) {
    return "IMAGE";
  }

  if (
    officeExtensions.has(extension) ||
    fileType.includes("word") ||
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("presentation")
  ) {
    return "OFFICE";
  }

  return "OTHER";
}

export function getDocumentCategoryLabel(
  category: EmployeeDocumentCategory,
) {
  switch (category) {
    case "PDF":
      return "PDF";
    case "IMAGE":
      return "Billede";
    case "OFFICE":
      return "Office";
    case "OTHER":
      return "Anden fil";
  }
}

export function getDocumentCategoryIcon(
  category: EmployeeDocumentCategory,
) {
  switch (category) {
    case "PDF":
      return "PDF";
    case "IMAGE":
      return "IMG";
    case "OFFICE":
      return "DOC";
    case "OTHER":
      return "FIL";
  }
}

export function getDocumentCategoryStyle(
  category: EmployeeDocumentCategory,
) {
  switch (category) {
    case "PDF":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200";
    case "IMAGE":
      return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/35 dark:text-purple-200";
    case "OFFICE":
      return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200";
    case "OTHER":
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function formatDocumentDate(
  value: string,
) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Ukendt dato"
    : documentDateFormatter.format(date);
}

export function formatDocumentDateTime(
  value: string,
) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Ukendt dato"
    : documentDateTimeFormatter.format(
        date,
      );
}

export function getSuggestedDocumentTitle(
  fileName: string,
) {
  const withoutExtension =
    fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return `${normalized
    .charAt(0)
    .toLocaleUpperCase("da-DK")}${normalized.slice(
    1,
  )}`;
}

export function filterAndSortDocuments(
  documents: EmployeeDocument[],
  searchQuery: string,
  typeFilter: EmployeeDocumentTypeFilter,
  sort: EmployeeDocumentSort,
) {
  const normalizedQuery =
    searchQuery
      .trim()
      .toLocaleLowerCase("da-DK");

  const filtered = documents.filter(
    (document) => {
      if (
        typeFilter !== "ALL" &&
        getDocumentCategory(document) !==
          typeFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        document.title,
        document.fileName,
      ].some((value) =>
        value
          .toLocaleLowerCase("da-DK")
          .includes(normalizedQuery),
      );
    },
  );

  return [...filtered].sort(
    (first, second) => {
      if (sort === "TITLE") {
        return first.title.localeCompare(
          second.title,
          "da",
        );
      }

      const firstTime = new Date(
        first.createdAt,
      ).getTime();
      const secondTime = new Date(
        second.createdAt,
      ).getTime();

      if (sort === "OLDEST") {
        return firstTime - secondTime;
      }

      return secondTime - firstTime;
    },
  );
}

export function getDocumentSummary(
  documents: EmployeeDocument[],
): EmployeeDocumentSummary {
  const categories = documents.map(
    getDocumentCategory,
  );
  const newestDocument = [...documents]
    .sort(
      (first, second) =>
        new Date(
          second.createdAt,
        ).getTime() -
        new Date(
          first.createdAt,
        ).getTime(),
    )
    .at(0);

  return {
    total: documents.length,
    pdf: categories.filter(
      (category) => category === "PDF",
    ).length,
    images: categories.filter(
      (category) =>
        category === "IMAGE",
    ).length,
    office: categories.filter(
      (category) =>
        category === "OFFICE",
    ).length,
    latestCreatedAt:
      newestDocument?.createdAt ?? null,
  };
}
