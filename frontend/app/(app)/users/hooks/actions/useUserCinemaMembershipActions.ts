"use client";

import { useState } from "react";

import { apiFetch } from "@/app/lib/api";

import type {
  CinemaMembershipEmploymentType,
  CinemaMembershipRole,
  UserCinemaMembershipSettings,
  UserCinemaOption,
} from "../../components/form/UserCinemaMembershipModal";
import type { UserPermissionKey } from "../../helpers/core/userRolePermissions";
import type { User } from "../../helpers/core/userTypes";

const ALL_PERMISSIONS = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
} as const;

const NO_PERMISSIONS = {
  canManageSchedule: false,
  canManageUsers: false,
  canManagePayroll: false,
  canManageLeaveRequests: false,
  canManageCinemaSettings: false,
  canSendBroadcastMessages: false,
} as const;

function createDefaultSettings():
  UserCinemaMembershipSettings {
  return {
    role: "EMPLOYEE",
    employmentType: "HOURLY",
    ...NO_PERMISSIONS,
  };
}

type ManagedMembershipResponse = {
  user: {
    id: number;defaultCinemaId: number | null;
  };
  memberships: Array<
    UserCinemaMembershipSettings & {
      cinemaId: number;

    }
  >;
};

type UseUserCinemaMembershipActionsOptions = {
  showError: (
    title: string,
    description: string,
  ) => void;
};

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  const payload = await response
    .json()
    .catch(() => null);

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
  const [
    membershipSettings,
    setMembershipSettings,
  ] = useState<
    Record<number, UserCinemaMembershipSettings>
  >({});
const [defaultCinemaId, setDefaultCinemaId] =
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
    setMembershipSettings({});
setDefaultCinemaId(null);

    try {
      const [cinemasResponse, membershipsResponse] =
        await Promise.all([
          apiFetch("/cinemas"),
          apiFetch(
            `/users/${user.id}/cinema-memberships`,
          ),
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

      const cinemasPayload =
        await cinemasResponse.json();
      const membershipsPayload =
        (await membershipsResponse.json()) as ManagedMembershipResponse;

      const nextCinemas: UserCinemaOption[] =
        Array.isArray(cinemasPayload)
          ? cinemasPayload
              .map((cinema) => ({
                id: Number(cinema.id),
                name: String(
                  cinema.name ?? "",
                ),
                logoUrl:
                  typeof cinema.logoUrl ===
                  "string"
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
                first.name.localeCompare(
                  second.name,
                  "da",
                ),
              )
          : [];

      const membershipCinemaIds =
        membershipsPayload.memberships.map(
          (membership) =>
            membership.cinemaId,
        );
      const nextSettings =
        membershipsPayload.memberships.reduce<
          Record<
            number,
            UserCinemaMembershipSettings
          >
        >((result, membership) => {
          result[membership.cinemaId] = {
            role: membership.role,
            employmentType:
              membership.employmentType,
            canManageSchedule:
              membership.canManageSchedule,
            canManageUsers:
              membership.canManageUsers,
            canManagePayroll:
              membership.canManagePayroll,
            canManageLeaveRequests:
              membership.canManageLeaveRequests,
            canManageCinemaSettings:
              membership.canManageCinemaSettings,
            canSendBroadcastMessages:
              membership.canSendBroadcastMessages,
          };

          return result;
        }, {});

      setCinemas(nextCinemas);
setDefaultCinemaId(
        membershipsPayload.user
          .defaultCinemaId ??
          membershipCinemaIds[0] ??
          null,
      );
      setSelectedCinemaIds(
        Array.from(
          new Set(membershipCinemaIds),
        ),
      );
      setMembershipSettings(nextSettings);
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
    setMembershipSettings({});
setDefaultCinemaId(null);
    setError("");
  }

  function closeMembershipModal() {
    if (saving) {
      return;
    }

    resetMembershipModal();
  }

  function toggleCinema(cinemaId: number) {
    setSelectedCinemaIds((current) => {
      const next = current.includes(cinemaId)
        ? current.filter(
            (id) => id !== cinemaId,
          )
        : [...current, cinemaId];

      if (!current.includes(cinemaId)) {
        setMembershipSettings(
          (currentSettings) => ({
            ...currentSettings,
            [cinemaId]:
              currentSettings[cinemaId] ??
              createDefaultSettings(),
          }),
        );
      }

      setDefaultCinemaId(
        (currentDefault) => {
          if (next.length === 0) {
            return null;
          }

          if (
            currentDefault !== null &&
            next.includes(currentDefault)
          ) {
            return currentDefault;
          }

          return next[0] ?? null;
        },
      );

      return next;
    });
  }

  function chooseDefaultCinema(
    cinemaId: number,
  ) {
    if (
      !selectedCinemaIds.includes(cinemaId)
    ) {
      return;
    }

    setDefaultCinemaId(cinemaId);
  }

  function changeMembershipRole(
    cinemaId: number,
    role: CinemaMembershipRole,
  ) {
    setMembershipSettings((current) => {
      const existing =
        current[cinemaId] ??
        createDefaultSettings();

      return {
        ...current,
        [cinemaId]: {
          ...existing,
          role,
          ...(role === "ADMIN"
            ? ALL_PERMISSIONS
            : existing.role === "ADMIN"
              ? NO_PERMISSIONS
              : {}),
        },
      };
    });
  }

  function changeEmploymentType(
    cinemaId: number,
    employmentType:
      CinemaMembershipEmploymentType,
  ) {
    setMembershipSettings((current) => ({
      ...current,
      [cinemaId]: {
        ...(current[cinemaId] ??
          createDefaultSettings()),
        employmentType,
      },
    }));
  }

  function toggleMembershipPermission(
    cinemaId: number,
    permission: UserPermissionKey,
  ) {
    setMembershipSettings((current) => {
      const existing =
        current[cinemaId] ??
        createDefaultSettings();

      if (existing.role === "ADMIN") {
        return current;
      }

      return {
        ...current,
        [cinemaId]: {
          ...existing,
          [permission]:
            !existing[permission],
        },
      };
    });
  }

  async function saveMemberships() {
    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);

      const memberships =
        selectedCinemaIds.map(
          (cinemaId) => ({
            cinemaId,
            ...(membershipSettings[
              cinemaId
            ] ?? createDefaultSettings()),
          }),
        );

      const response = await apiFetch(
        `/users/${selectedUser.id}/cinema-memberships/configuration`,
        {
          method: "PUT",
          body: JSON.stringify({
            memberships,
            defaultCinemaId,
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
    membershipSettings,

    defaultCinemaId,
    loading,
    saving,
    error,
    openMembershipModal,
    closeMembershipModal,
    toggleCinema,
    chooseDefaultCinema,
    changeMembershipRole,
    changeEmploymentType,
    toggleMembershipPermission,
    saveMemberships,
  };
}
