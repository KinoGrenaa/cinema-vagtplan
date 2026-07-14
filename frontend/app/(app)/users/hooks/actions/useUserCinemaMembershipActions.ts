"use client";

import { useState } from "react";

import { apiFetch } from "@/app/lib/api";

import type { User } from "../../helpers/core/userTypes";
import type { UserCinemaOption } from "../../components/form/UserCinemaMembershipModal";

type ManagedMembershipResponse = {
  user: {
    id: number;
    cinemaId: number | null;
  };
  memberships: Array<{
    cinemaId: number;
    isPrimary: boolean;
  }>;
};

type UseUserCinemaMembershipActionsOptions = {
  showError: (title: string, description: string) => void;
};

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  const payload = await response.json().catch(() => null);

  if (typeof payload?.message === "string") {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    return payload.message.join("\n");
  }

  return fallback;
}

export function useUserCinemaMembershipActions({
  showError,
}: UseUserCinemaMembershipActionsOptions) {
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);
  const [cinemas, setCinemas] = useState<
    UserCinemaOption[]
  >([]);
  const [selectedCinemaIds, setSelectedCinemaIds] =
    useState<number[]>([]);
  const [primaryCinemaId, setPrimaryCinemaId] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function openMembershipModal(user: User) {
    setSelectedUser(user);
    setLoading(true);
    setError("");
    setCinemas([]);
    setSelectedCinemaIds([]);
    setPrimaryCinemaId(user.cinemaId ?? null);

    try {
      const [cinemasResponse, membershipsResponse] =
        await Promise.all([
          apiFetch("/cinemas"),
          apiFetch(`/users/${user.id}/cinema-memberships`),
        ]);

      if (!cinemasResponse.ok) {
        throw new Error(
          await readErrorMessage(
            cinemasResponse,
            "Biograferne kunne ikke hentes.",
          ),
        );
      }

      if (!membershipsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            membershipsResponse,
            "Brugerens biograftilknytninger kunne ikke hentes.",
          ),
        );
      }

      const cinemasPayload = await cinemasResponse.json();
      const membershipsPayload =
        (await membershipsResponse.json()) as ManagedMembershipResponse;

      const nextCinemas: UserCinemaOption[] = Array.isArray(
        cinemasPayload,
      )
        ? cinemasPayload
            .map((cinema) => ({
              id: Number(cinema.id),
              name: String(cinema.name ?? ""),
              logoUrl:
                typeof cinema.logoUrl === "string"
                  ? cinema.logoUrl
                  : null,
            }))
            .filter(
              (cinema) =>
                Number.isInteger(cinema.id) &&
                cinema.id > 0 &&
                cinema.name.trim() !== "",
            )
            .sort((first, second) =>
              first.name.localeCompare(second.name, "da"),
            )
        : [];

      const nextPrimaryCinemaId =
        membershipsPayload.user.cinemaId ??
        user.cinemaId ??
        null;
      const membershipCinemaIds =
        membershipsPayload.memberships.map(
          (membership) => membership.cinemaId,
        );
      const nextSelectedCinemaIds =
        nextPrimaryCinemaId &&
        !membershipCinemaIds.includes(nextPrimaryCinemaId)
          ? [...membershipCinemaIds, nextPrimaryCinemaId]
          : membershipCinemaIds;

      setCinemas(nextCinemas);
      setPrimaryCinemaId(nextPrimaryCinemaId);
      setSelectedCinemaIds(
        Array.from(new Set(nextSelectedCinemaIds)),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Biograftilknytningerne kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetMembershipModal() {
    setSelectedUser(null);
    setCinemas([]);
    setSelectedCinemaIds([]);
    setPrimaryCinemaId(null);
    setError("");
  }

  function closeMembershipModal() {
    if (saving) {
      return;
    }

    resetMembershipModal();
  }

  function toggleCinema(cinemaId: number) {
    if (cinemaId === primaryCinemaId) {
      return;
    }

    setSelectedCinemaIds((current) =>
      current.includes(cinemaId)
        ? current.filter((id) => id !== cinemaId)
        : [...current, cinemaId],
    );
  }

  async function saveMemberships() {
    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);

      const response = await apiFetch(
        `/users/${selectedUser.id}/cinema-memberships`,
        {
          method: "PATCH",
          body: JSON.stringify({
            cinemaIds: selectedCinemaIds,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Biograftilknytningerne kunne ikke gemmes.",
          ),
        );
      }

      resetMembershipModal();
    } catch (saveError) {
      showError(
        "Biograftilknytninger kunne ikke gemmes",
        saveError instanceof Error
          ? saveError.message
          : "Der opstod en fejl under gemningen.",
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    selectedUser,
    cinemas,
    selectedCinemaIds,
    primaryCinemaId,
    loading,
    saving,
    error,
    openMembershipModal,
    closeMembershipModal,
    toggleCinema,
    saveMemberships,
  };
}
