"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "@/app/lib/api";
import {
  appendCinemaId,
  getCurrentUserFromStorage,
  getErrorMessage,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../../helpers/core/employeeDocumentHelpers";
import type {
  CurrentUser,
  EmployeeDocument,
  EmployeeDocumentPage,
  EmployeeDocumentSort,
  EmployeeDocumentSummary,
  EmployeeDocumentTypeFilter,
  User,
} from "../../helpers/core/employeeDocumentTypes";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseEmployeeDocumentsDataParams = {
  infoDialog: InfoDialog;
};

type FetchDocumentsOptions = {
  page?: number;
  append?: boolean;
  searchQuery?: string;
  typeFilter?: EmployeeDocumentTypeFilter;
  sort?: EmployeeDocumentSort;
};

const emptySummary: EmployeeDocumentSummary = {
  total: 0,
  pdf: 0,
  images: 0,
  office: 0,
  latestCreatedAt: null,
};

export function useEmployeeDocumentsData({
  infoDialog,
}: UseEmployeeDocumentsDataParams) {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<
    EmployeeDocument[]
  >([]);
  const [selectedUserId, setSelectedUserIdState] =
    useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] =
    useState("");
  const [typeFilter, setTypeFilter] =
    useState<EmployeeDocumentTypeFilter>("ALL");
  const [sort, setSort] =
    useState<EmployeeDocumentSort>("NEWEST");
  const [summary, setSummary] =
    useState<EmployeeDocumentSummary>(emptySummary);
  const [documentTotal, setDocumentTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestIdRef = useRef(0);

  const activeCinemaId = useMemo(() => {
    if (!currentUser) return null;

    if (
      currentUser.role === "MASTER" &&
      !currentUser.cinemaId
    ) {
      return selectedMasterCinemaId;
    }

    return currentUser.cinemaId;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  function resetDocumentList() {
    requestIdRef.current += 1;
    setDocuments([]);
    setSummary(emptySummary);
    setDocumentTotal(0);
    setFilteredTotal(0);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
  }

  function setSelectedUserId(userId: number | null) {
    setSelectedUserIdState(userId);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setTypeFilter("ALL");
    setSort("NEWEST");
    resetDocumentList();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    function updateUserContext() {
      setCurrentUser(getCurrentUserFromStorage());
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
      );
    }

    updateUserContext();
    window.addEventListener("storage", updateUserContext);
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateUserContext,
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateUserContext,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateUserContext,
      );
    };
  }, []);

  async function fetchDocuments(
    userId: number,
    cinemaId: number | null,
    options: FetchDocumentsOptions = {},
  ) {
    const requestedPage = options.page ?? 1;
    const append = options.append ?? false;
    const requestedSearch =
      options.searchQuery ?? searchQuery.trim();
    const requestedType =
      options.typeFilter ?? typeFilter;
    const requestedSort = options.sort ?? sort;
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setDocuments([]);
    }

    try {
      const query = new URLSearchParams({
        page: String(requestedPage),
        search: requestedSearch,
        type: requestedType,
        sort: requestedSort,
      });
      const endpoint = appendCinemaId(
        `/employee-documents/user/${userId}/page?${query.toString()}`,
        cinemaId,
      );
      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente dokumenter",
          ),
        );
      }

      const data =
        (await response.json()) as EmployeeDocumentPage;

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextItems = Array.isArray(data.items)
        ? data.items
        : [];
      setDocuments((currentDocuments) => {
        if (!append) {
          return nextItems;
        }

        return Array.from(
          new Map(
            [...currentDocuments, ...nextItems].map(
              (document) => [document.id, document],
            ),
          ).values(),
        );
      });
      setSummary(data.summary ?? emptySummary);
      setDocumentTotal(
        Number.isFinite(data.total) ? data.total : 0,
      );
      setFilteredTotal(
        Number.isFinite(data.filteredTotal)
          ? data.filteredTotal
          : 0,
      );
      setPage(
        Number.isInteger(data.page)
          ? data.page
          : requestedPage,
      );
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!append) {
        setDocuments([]);
        setSummary(emptySummary);
        setDocumentTotal(0);
        setFilteredTotal(0);
        setPage(1);
        setHasMore(false);
      }
      infoDialog.showError(
        "Kunne ikke hente dokumenter",
        getErrorMessage(
          error,
          "Dokumenterne kunne ikke hentes. Prøv igen.",
        ),
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function fetchUsers(
    cinemaId: number | null,
    masterCinemaSelectionMissing: boolean,
  ) {
    if (masterCinemaSelectionMissing) {
      setUsers([]);
      setSelectedUserId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch(
        appendCinemaId("/users", cinemaId),
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente medarbejdere",
          ),
        );
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      setSelectedUserId(null);
      setLoading(false);
    } catch (error) {
      setUsers([]);
      setSelectedUserId(null);
      setLoading(false);
      infoDialog.showError(
        "Kunne ikke hente medarbejdere",
        getErrorMessage(
          error,
          "Medarbejderne kunne ikke hentes. Prøv igen.",
        ),
      );
    }
  }

  function loadMoreDocuments() {
    if (
      !selectedUserId ||
      !hasMore ||
      loading ||
      loadingMore ||
      needsMasterCinemaSelection
    ) {
      return;
    }

    fetchDocuments(selectedUserId, activeCinemaId, {
      page: page + 1,
      append: true,
      searchQuery: debouncedSearchQuery,
      typeFilter,
      sort,
    });
  }

  useEffect(() => {
    if (!currentUser) return;

    fetchUsers(
      activeCinemaId,
      needsMasterCinemaSelection,
    );
  }, [
    currentUser,
    activeCinemaId,
    needsMasterCinemaSelection,
  ]);

  useEffect(() => {
    if (
      !selectedUserId ||
      needsMasterCinemaSelection
    ) {
      return;
    }

    fetchDocuments(selectedUserId, activeCinemaId, {
      page: 1,
      append: false,
      searchQuery: debouncedSearchQuery,
      typeFilter,
      sort,
    });
  }, [
    activeCinemaId,
    debouncedSearchQuery,
    needsMasterCinemaSelection,
    selectedUserId,
    sort,
    typeFilter,
  ]);

  return {
    users,
    documents,
    selectedUserId,
    setSelectedUserId,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sort,
    setSort,
    summary,
    documentTotal,
    filteredTotal,
    hasMore,
    loading,
    loadingMore,
    activeCinemaId,
    needsMasterCinemaSelection,
    fetchDocuments,
    loadMoreDocuments,
  };
}
