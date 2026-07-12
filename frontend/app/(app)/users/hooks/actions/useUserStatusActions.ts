"use client";

import type { Dispatch, SetStateAction } from "react";

import { apiFetch } from "@/app/lib/api";

import { getErrorMessage } from "../../helpers/core/userHelpers";
import type { User } from "../../helpers/core/userTypes";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "success";
  onConfirm: () => Promise<void>;
};

type UseUserStatusActionsOptions = {
  setUsers: Dispatch<SetStateAction<User[]>>;
  confirm: (options: ConfirmOptions) => void;
  showError: (title: string, description: string) => void;
};

export function useUserStatusActions({
  setUsers,
  confirm,
  showError,
}: UseUserStatusActionsOptions) {
  function deactivateUser(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;

    confirm({
      title: "Deaktivér bruger",
      description:
        `Er du sikker på, at du vil deaktivere ${fullName}?\n\n` +
        "Brugeren kan ikke længere logge ind.\n\n" +
        "Tidligere vagter, tidsregistreringer, lønhistorik, beskeder og anden historik bevares.\n\n" +
        "Brugeren kan genaktiveres senere.",
      confirmText: "Deaktivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`/users/${user.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error(await getErrorMessage(response));
          }

          const deactivatedUser = await response.json();

          setUsers((prev) =>
            prev.map((existingUser) =>
              existingUser.id === user.id
                ? {
                    ...existingUser,
                    ...deactivatedUser,
                    isActive: false,
                  }
                : existingUser,
            ),
          );
        } catch (error) {
          showError(
            "Bruger kunne ikke deaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke deaktivere bruger.",
          );
        }
      },
    });
  }

  function reactivateUser(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;

    confirm({
      title: "Genaktivér bruger",
      description: `Vil du genaktivere ${fullName}?\n\nBrugeren vil igen kunne logge ind.`,
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`/users/${user.id}/reactivate`, {
            method: "PATCH",
          });

          if (!response.ok) {
            throw new Error(await getErrorMessage(response));
          }

          const reactivatedUser = await response.json();

          setUsers((prev) =>
            prev.map((existingUser) =>
              existingUser.id === user.id
                ? {
                    ...existingUser,
                    ...reactivatedUser,
                    isActive: true,
                    deactivatedAt: null,
                  }
                : existingUser,
            ),
          );
        } catch (error) {
          showError(
            "Bruger kunne ikke genaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke genaktivere bruger.",
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
