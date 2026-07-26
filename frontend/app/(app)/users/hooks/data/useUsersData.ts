"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { apiFetch } from "@/app/lib/api";

import {
  buildUsersEndpoint,
  getErrorMessage,
  getStoredCurrentUser,
  getStoredMasterCinemaId,
  getStoredMasterCinemaName,
  normalizeUsers,
} from "../../helpers/core/userHelpers";
import type {
  CurrentUser,
  User,
  UserListSort,
  UserPage,
} from "../../helpers/core/userTypes";

type UseUsersDataOptions = {
  showInactive: boolean;
  searchQuery: string;
  sort: UserListSort;
  showError: (
    title: string,
    description: string,
  ) => void;
};

type FetchUsersOptions = {
  page?: number;
  append?: boolean;
  search?: string;
};

export function useUsersData({
  showInactive,
  searchQuery,
  sort,
  showError,
}: UseUsersDataOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [masterUsers, setMasterUsers] =
    useState<User[]>([]);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] = useState<number | null>(null);
  const [
    selectedMasterCinemaName,
    setSelectedMasterCinemaName,
  ] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] =
    useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [loadingMasterUsers, setLoadingMasterUsers] =
    useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(
        searchQuery.trim(),
      );
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const storedUser = getStoredCurrentUser();
    const storedMasterCinemaId =
      getStoredMasterCinemaId();
    const storedMasterCinemaName =
      getStoredMasterCinemaName();

    setCurrentUser(storedUser);
    setSelectedMasterCinemaId(
      storedMasterCinemaId,
    );
    setSelectedMasterCinemaName(
      storedMasterCinemaName,
    );

    if (storedUser?.role === "MASTER") {
      void fetchMasterUsers();
    } else {
      setMasterUsers([]);
    }
  }, []);

  function resetUserPage() {
    requestIdRef.current += 1;
    setUsers([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);
    setLoadingMore(false);
  }

  async function fetchUsers(
    userForRequest = currentUser,
    masterCinemaIdForRequest =
      selectedMasterCinemaId,
    options: FetchUsersOptions = {},
  ) {
    const requestedPage =
      options.page ?? 1;
    const append = options.append ?? false;
    const requestedSearch =
      options.search ?? debouncedSearchQuery;
    const requestId =
      requestIdRef.current + 1;

    requestIdRef.current = requestId;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setUsers([]);
      }

      const baseEndpoint =
        buildUsersEndpoint(
          userForRequest,
          masterCinemaIdForRequest,
        );

      if (!baseEndpoint) {
        resetUserPage();
        setLoading(false);
        return;
      }

      const [basePath, existingQuery = ""] =
        baseEndpoint.split("?");
      const query =
        new URLSearchParams(existingQuery);

      query.set(
        "page",
        String(requestedPage),
      );
      query.set(
        "search",
        requestedSearch,
      );
      query.set(
        "includeInactive",
        String(showInactive),
      );
      query.set("sort", sort);

      const response = await apiFetch(
        `${basePath}/page?${query.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response),
        );
      }

      const data =
        (await response.json()) as UserPage;

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextUsers = normalizeUsers(
        data.items,
      );

      setUsers((currentUsers) => {
        if (!append) {
          return nextUsers;
        }

        return Array.from(
          new Map(
            [
              ...currentUsers,
              ...nextUsers,
            ].map((user) => [
              user.id,
              user,
            ]),
          ).values(),
        );
      });
      setPage(
        Number.isInteger(data.page)
          ? data.page
          : requestedPage,
      );
      setTotal(
        Number.isFinite(data.total)
          ? data.total
          : 0,
      );
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!append) {
        setUsers([]);
        setPage(1);
        setTotal(0);
        setHasMore(false);
      }

      showError(
        "Kunne ikke hente brugere",
        error instanceof Error
          ? error.message
          : "Kunne ikke hente brugere.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function refreshUsers() {
    await fetchUsers(
      currentUser,
      selectedMasterCinemaId,
      {
        page: 1,
        append: false,
        search: debouncedSearchQuery,
      },
    );
  }

  function loadMoreUsers() {
    if (
      loading ||
      loadingMore ||
      !hasMore
    ) {
      return;
    }

    void fetchUsers(
      currentUser,
      selectedMasterCinemaId,
      {
        page: page + 1,
        append: true,
        search: debouncedSearchQuery,
      },
    );
  }

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void fetchUsers(
      currentUser,
      selectedMasterCinemaId,
      {
        page: 1,
        append: false,
        search: debouncedSearchQuery,
      },
    );
  }, [
    currentUser,
    selectedMasterCinemaId,
    debouncedSearchQuery,
    showInactive,
    sort,
  ]);

  async function fetchMasterUsers() {
    try {
      setLoadingMasterUsers(true);

      const response = await apiFetch(
        "/users/masters",
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response),
        );
      }

      setMasterUsers(
        normalizeUsers(
          await response.json(),
        ),
      );
    } catch (error) {
      setMasterUsers([]);
      showError(
        "Kunne ikke hente MASTER-brugere",
        error instanceof Error
          ? error.message
          : "MASTER-brugerne kunne ikke hentes.",
      );
    } finally {
      setLoadingMasterUsers(false);
    }
  }

  return {
    users,
    masterUsers,
    setMasterUsers,
    currentUser,
    selectedMasterCinemaId,
    selectedMasterCinemaName,
    total,
    hasMore,
    loading,
    loadingMore,
    loadingMasterUsers,
    refreshUsers,
    loadMoreUsers,
    fetchMasterUsers,
  };
}
