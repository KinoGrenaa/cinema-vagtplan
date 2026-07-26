"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  apiFetch,
} from "@/app/lib/api";

import {
  readErrorMessage,
} from "../../helpers/core/auditLogHelpers";
import type {
  AuditLog,
  AuditLogPageResponse,
} from "../../helpers/core/auditLogTypes";

type AuditLogUserContext = {
  role?: string;
  cinemaId?:
    number | string | null;
} | null | undefined;

type UseAuditLogDataParams = {
  user:
    AuditLogUserContext;
  search: string;
  entityFilter: string;
  showError:
    (
      title: string,
      description: string,
    ) => void;
};

function mergeLogs(
  current:
    AuditLog[],
  incoming:
    AuditLog[],
) {
  const byId =
    new Map<
      number,
      AuditLog
    >();

  for (const log of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      log.id,
      log,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      right.id -
      left.id,
  );
}

export function useAuditLogData({
  user,
  search,
  entityFilter,
  showError,
}: UseAuditLogDataParams) {
  const [
    logs,
    setLogs,
  ] =
    useState<AuditLog[]>(
      [],
    );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);
  const [
    hasMore,
    setHasMore,
  ] = useState(false);
  const [
    nextBeforeId,
    setNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    totalCount,
    setTotalCount,
  ] = useState(0);
  const [
    entityTypes,
    setEntityTypes,
  ] =
    useState<string[]>([]);
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<string | null>(
      null,
    );
  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");
  const showErrorRef =
    useRef(showError);

  showErrorRef.current =
    showError;

  const needsMasterCinemaSelection =
    user?.role ===
      "MASTER" &&
    !user.cinemaId &&
    !selectedMasterCinemaId;

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim(),
          );
        },
        300,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [search]);

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem(
          "masterSelectedCinemaId",
        ),
      );
    }

    updateSelectedMasterCinema();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener(
      "storage",
      updateSelectedMasterCinema,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener(
        "storage",
        updateSelectedMasterCinema,
      );
    };
  }, []);

  const buildEndpoint =
    useCallback(
      (
        beforeId?:
          number | null,
      ) => {
        const params =
          new URLSearchParams();

        params.set(
          "limit",
          "50",
        );

        if (
          user?.role ===
            "MASTER" &&
          !user.cinemaId &&
          selectedMasterCinemaId
        ) {
          params.set(
            "cinemaId",
            selectedMasterCinemaId,
          );
        }

        if (
          debouncedSearch
        ) {
          params.set(
            "search",
            debouncedSearch,
          );
        }

        if (
          entityFilter !==
          "ALL"
        ) {
          params.set(
            "entityType",
            entityFilter,
          );
        }

        if (beforeId) {
          params.set(
            "beforeId",
            String(
              beforeId,
            ),
          );
        }

        return `/audit-logs/page?${params.toString()}`;
      },
      [
        debouncedSearch,
        entityFilter,
        selectedMasterCinemaId,
        user,
      ],
    );

  const fetchLogs =
    useCallback(async () => {
      if (!user) {
        setLogs([]);
        setLoading(false);
        return;
      }

      if (
        needsMasterCinemaSelection
      ) {
        setLogs([]);
        setHasMore(false);
        setNextBeforeId(
          null,
        );
        setTotalCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response =
          await apiFetch(
            buildEndpoint(),
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke hente ændringshistorik.",
            ),
          );
        }

        const data =
          (await response.json()) as
            Partial<AuditLogPageResponse>;

        setLogs(
          Array.isArray(
            data.items,
          )
            ? data.items
            : [],
        );
        setHasMore(
          Boolean(
            data.hasMore,
          ),
        );
        setNextBeforeId(
          Number.isInteger(
            data.nextBeforeId,
          )
            ? data.nextBeforeId ??
              null
            : null,
        );
        setTotalCount(
          Number(
            data.totalCount ||
              0,
          ),
        );
        setEntityTypes(
          Array.isArray(
            data.entityTypes,
          )
            ? data.entityTypes
            : [],
        );
      } catch (error) {
        setLogs([]);
        setHasMore(false);
        setNextBeforeId(
          null,
        );
        setTotalCount(0);
        showErrorRef.current(
          "Kunne ikke hente ændringshistorik",
          error instanceof Error
            ? error.message
            : "Der opstod en uventet fejl under hentning af ændringshistorikken.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      buildEndpoint,
      needsMasterCinemaSelection,
      user,
    ]);

  const loadMore =
    useCallback(async () => {
      if (
        !hasMore ||
        !nextBeforeId ||
        loadingMore
      ) {
        return;
      }

      try {
        setLoadingMore(
          true,
        );

        const response =
          await apiFetch(
            buildEndpoint(
              nextBeforeId,
            ),
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Ældre logposter kunne ikke hentes.",
            ),
          );
        }

        const data =
          (await response.json()) as
            Partial<AuditLogPageResponse>;

        setLogs(
          (current) =>
            mergeLogs(
              current,
              Array.isArray(
                data.items,
              )
                ? data.items
                : [],
            ),
        );
        setHasMore(
          Boolean(
            data.hasMore,
          ),
        );
        setNextBeforeId(
          Number.isInteger(
            data.nextBeforeId,
          )
            ? data.nextBeforeId ??
              null
            : null,
        );
        setTotalCount(
          Number(
            data.totalCount ||
              totalCount,
          ),
        );
      } catch (error) {
        showErrorRef.current(
          "Kunne ikke hente ældre logposter",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl under hentning af ældre logposter.",
        );
      } finally {
        setLoadingMore(
          false,
        );
      }
    }, [
      buildEndpoint,
      hasMore,
      loadingMore,
      nextBeforeId,
      totalCount,
    ]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    entityTypes,
    loadMore,
    needsMasterCinemaSelection,
  };
}
