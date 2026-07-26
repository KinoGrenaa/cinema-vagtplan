"use client";

import { apiFetch } from "@/app/lib/api";

import { getErrorMessage } from "../../helpers/core/userHelpers";
import type { User } from "../../helpers/core/userTypes";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant:
    | "danger"
    | "success";
  onConfirm: () => Promise<void>;
};

type UseUserStatusActionsOptions = {
  refreshUsers: () => Promise<void>;
  confirm: (
    options: ConfirmOptions,
  ) => void;
  showError: (
    title: string,
    description: string,
  ) => void;
};

function getMembershipStatusEndpoint(
  user: User,
  action:
    | "deactivate"
    | "reactivate",
) {
  if (!user.cinemaId) {
    throw new Error(
      "Brugeren mangler en biograftilknytning.",
    );
  }

  const path =
    action === "deactivate"
      ? `/users/${user.id}/cinema-membership`
      : `/users/${user.id}/cinema-membership/reactivate`;

  return `${path}?cinemaId=${user.cinemaId}`;
}

export function useUserStatusActions({
  refreshUsers,
  confirm,
  showError,
}: UseUserStatusActionsOptions) {
  function deactivateUser(user: User) {
    const fullName =
      `${user.firstName} ${user.lastName}`.trim();

    confirm({
      title:
        "Deaktivér i denne biograf",
      description:
        `Er du sikker på, at du vil deaktivere ${fullName} i denne biograf?\n\n` +
        "Brugeren mister kun adgangen til denne biograf. " +
        "Andre aktive biograftilknytninger påvirkes ikke.\n\n" +
        "Tidligere vagter, tidsregistreringer, lønhistorik, dokumenter og anden historik " +
        "behandles fortsat efter biografens gældende opbevarings- og slettefrister.",
      confirmText: "Deaktivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response =
            await apiFetch(
              getMembershipStatusEndpoint(
                user,
                "deactivate",
              ),
              {
                method: "DELETE",
              },
            );

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(
                response,
              ),
            );
          }

          await refreshUsers();
        } catch (error) {
          showError(
            "Brugeren kunne ikke deaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke deaktivere brugeren i denne biograf.",
          );
        }
      },
    });
  }

  function reactivateUser(user: User) {
    const fullName =
      `${user.firstName} ${user.lastName}`.trim();

    confirm({
      title:
        "Genaktivér i denne biograf",
      description:
        `Vil du genaktivere ${fullName} i denne biograf?\n\n` +
        "Brugeren får igen adgang med den rolle og de rettigheder, " +
        "der er gemt på biograftilknytningen.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response =
            await apiFetch(
              getMembershipStatusEndpoint(
                user,
                "reactivate",
              ),
              {
                method: "PATCH",
              },
            );

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(
                response,
              ),
            );
          }

          await refreshUsers();
        } catch (error) {
          showError(
            "Brugeren kunne ikke genaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke genaktivere brugeren i denne biograf.",
          );
        }
      },
    });
  }

  return {
    deactivateUser,
    reactivateUser,
  };
}
