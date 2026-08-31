export type CurrentUser = {
  id?: number;
  sub?: number;
  email?: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  role: string;
};

export type EmployeeDocument = {
  id: number;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  createdAt: string;
};

export type EmployeeDocumentCategory =
  | "PDF"
  | "IMAGE"
  | "OFFICE"
  | "OTHER";
export type EmployeeDocumentTypeFilter =
  | "ALL"
  | EmployeeDocumentCategory;

export type EmployeeDocumentSort =
  | "NEWEST"
  | "OLDEST"
  | "TITLE";

export type EmployeeDocumentSummary = {
  total: number;
  pdf: number;
  images: number;
  office: number;
  latestCreatedAt: string | null;
};

export type EmployeeDocumentPage = {
  items: EmployeeDocument[];
  page: number;
  pageSize: number;
  total: number;
  filteredTotal: number;
  hasMore: boolean;
  summary: EmployeeDocumentSummary;
};
