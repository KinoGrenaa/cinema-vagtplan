import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/core/staffingRequestHelpers";
import type {
  PendingStaffingRequestPageResponse,
  StaffingRequest,
} from "../../helpers/core/staffingRequestTypes";

type ApiFetch = (
  endpoint: string,
  init?: RequestInit,
) => Promise<Response>;

type Params = {
  apiFetch:
    ApiFetch;
  activeCinemaId:
    number | null;
  initialRequests:
    StaffingRequest[];
  totalCount:
    number;
  needsMasterCinemaSelection:
    boolean;
  showError:
    (
      title: string,
      description: string,
    ) => void;
};

function mergePendingRequests(
  current:
    StaffingRequest[],
  incoming:
    StaffingRequest[],
) {
  const byId =
    new Map<
      number,
      StaffingRequest
    >();

  for (const request of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      request.id,
      request,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) => {
      if (
        right.priority !==
        left.priority
      ) {
        return (
          right.priority -
          left.priority
        );
      }

      const createdDifference =
        new Date(
          right.createdAt,
        ).getTime() -
        new Date(
          left.createdAt,
        ).getTime();

      return (
        createdDifference ||
        right.id -
          left.id
      );
    },
  );
}

export function usePendingStaffingRequestPages({
  apiFetch,
  activeCinemaId,
  initialRequests,
  totalCount,
  needsMasterCinemaSelection,
  showError,
}: Params) {
  const [
    additionalRequests,
    setAdditionalRequests,
  ] =
    useState<
      StaffingRequest[]
    >([]);
  const [
    nextPage,
    setNextPage,
  ] = useState(2);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const initialSignature =
    useMemo(
      () =>
        initialRequests
          .map(
            (request) =>
              request.id,
          )
          .join(","),
      [initialRequests],
    );

  useEffect(() => {
    setAdditionalRequests(
      [],
    );
    setNextPage(2);
    setLoadingMore(false);
  }, [
    activeCinemaId,
    initialSignature,
    needsMasterCinemaSelection,
  ]);

  const requests =
    useMemo(
      () =>
        mergePendingRequests(
          initialRequests,
          additionalRequests,
        ),
      [
        additionalRequests,
        initialRequests,
      ],
    );

  const hasMore =
    requests.length <
    totalCount;

  const loadMore =
    useCallback(async () => {
      if (
        !hasMore ||
        loadingMore ||
        needsMasterCinemaSelection
      ) {
        return;
      }

      try {
        setLoadingMore(true);

        const endpoint =
          appendCinemaId(
            `/staffing-requests/pending-page?limit=50&page=${nextPage}`,
            activeCinemaId,
          );
        const response =
          await apiFetch(
            endpoint,
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Flere åbne bemandingsforespørgsler kunne ikke hentes",
            ),
          );
        }

        const data =
          (await response.json()) as
            Partial<PendingStaffingRequestPageResponse>;
        const items =
          Array.isArray(
            data.items,
          )
            ? data.items
            : [];

        setAdditionalRequests(
          (current) =>
            mergePendingRequests(
              current,
              items,
            ),
        );
        setNextPage(
          Number.isInteger(
            data.page,
          )
            ? Number(
                data.page,
              ) + 1
            : nextPage + 1,
        );
      } catch (error) {
        showError(
          "Kunne ikke hente flere åbne forespørgsler",
          error instanceof Error
            ? error.message
            : "Flere åbne bemandingsforespørgsler kunne ikke hentes.",
        );
      } finally {
        setLoadingMore(false);
      }
    }, [
      activeCinemaId,
      apiFetch,
      hasMore,
      loadingMore,
      needsMasterCinemaSelection,
      nextPage,
      showError,
    ]);

  return {
    requests,
    hasMore,
    loadingMore,
    loadMore,
  };
}
