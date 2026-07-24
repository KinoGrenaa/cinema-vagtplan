"use client";

import {
  type Dispatch,
  type SetStateAction,
  useState,
} from "react";

import { apiFetch } from "@/app/lib/api";

import {
  getActiveCinemaId,
  getEditableUser,
  getErrorMessage,
  getStoredCurrentUser,
  getStoredMasterCinemaId,
  normalizeUser,
} from "../../helpers/core/userHelpers";
import { withRequiredRolePermissions } from "../../helpers/core/userRolePermissions";
import {
  emptyUser,
  type CurrentUser,
  type User,
  type UserFormData,
} from "../../helpers/core/userTypes";

type UseUserFormActionsOptions = {
  currentUser: CurrentUser | null;
  selectedMasterCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  setUsers: Dispatch<
    SetStateAction<User[]>
  >;
  showError: (
    title: string,
    description: string,
  ) => void;
};

export function useUserFormActions({
  currentUser,
  selectedMasterCinemaId,
  needsMasterCinemaSelection,
  setUsers,
  showError,
}: UseUserFormActionsOptions) {
  const [showCreate, setShowCreate] =
    useState(false);
  const [editingUser, setEditingUser] =
    useState<User | null>(null);
  const [newUser, setNewUser] =
    useState<UserFormData>(emptyUser);

  function validateCreateUser() {
    if (!newUser.firstName.trim()) {
      return "Fornavn mangler.";
    }

    if (!newUser.lastName.trim()) {
      return "Efternavn mangler.";
    }

    if (!newUser.email.trim()) {
      return "Email mangler.";
    }

    if (!newUser.email.includes("@")) {
      return "Indtast en gyldig emailadresse.";
    }

    if (
      !newUser.password ||
      newUser.password.length < 8
    ) {
      return "Adgangskode skal være mindst 8 tegn.";
    }

    return "";
  }

  async function createUser() {
    try {
      const validationError =
        validateCreateUser();

      if (validationError) {
        showError(
          "Bruger kunne ikke oprettes",
          validationError,
        );
        return;
      }

      const userForRequest =
        currentUser ||
        getStoredCurrentUser();
      const masterCinemaIdForRequest =
        selectedMasterCinemaId ||
        getStoredMasterCinemaId();
      const activeCinemaId =
        getActiveCinemaId(
          userForRequest,
          masterCinemaIdForRequest,
        );

      if (!userForRequest) {
        showError(
          "Bruger kunne ikke oprettes",
          "Du er ikke logget ind korrekt.\nLog ud og ind igen.",
        );
        return;
      }

      if (
        newUser.role !== "MASTER" &&
        !activeCinemaId
      ) {
        showError(
          "Biograf skal vælges",
          userForRequest.role === "MASTER"
            ? "Gå til MASTER-panelet og vælg hvilken biograf brugeren skal oprettes i."
            : "Din bruger er ikke tilknyttet en biograf.\nKontakt en administrator.",
        );
        return;
      }

      const normalizedNewUser =
        withRequiredRolePermissions(
          newUser,
        );
      const response = await apiFetch(
        "/users",
        {
          method: "POST",
          body: JSON.stringify({
            ...normalizedNewUser,
            firstName:
              normalizedNewUser.firstName.trim(),
            lastName:
              normalizedNewUser.lastName.trim(),
            email:
              normalizedNewUser.email.trim(),
            phone:
              normalizedNewUser.phone?.trim() ||
              undefined,
            employmentType:
              normalizedNewUser.employmentType ||
              "HOURLY",
            cinemaId:
              normalizedNewUser.role ===
              "MASTER"
                ? null
                : activeCinemaId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response),
        );
      }

      const createdUser =
        (await response.json()) as User;

      setUsers((previous) => [
        ...previous,
        normalizeUser(createdUser),
      ]);
      setShowCreate(false);
      resetNewUser();
    } catch (error) {
      showError(
        "Bruger kunne ikke oprettes",
        error instanceof Error
          ? error.message
          : "Kunne ikke oprette bruger.",
      );
    }
  }

  async function updateUser() {
    if (!editingUser) {
      return;
    }

    try {
      const normalizedEditingUser =
        withRequiredRolePermissions(
          editingUser,
        );
      const cinemaId =
        normalizedEditingUser.cinemaId;

      if (!cinemaId) {
        throw new Error(
          "Brugeren mangler den biograf, der skal redigeres.",
        );
      }

      const response = await apiFetch(
        `/users/${normalizedEditingUser.id}/cinema-profile?cinemaId=${cinemaId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            firstName:
              normalizedEditingUser.firstName.trim(),
            lastName:
              normalizedEditingUser.lastName.trim(),
            email:
              normalizedEditingUser.email.trim(),
            phone:
              normalizedEditingUser.phone?.trim() ||
              undefined,
            role:
              normalizedEditingUser.role,
            employmentType:
              normalizedEditingUser.employmentType ||
              "HOURLY",
            canManageSchedule:
              normalizedEditingUser.canManageSchedule ||
              false,
            canManageUsers:
              normalizedEditingUser.canManageUsers ||
              false,
            canManagePayroll:
              normalizedEditingUser.canManagePayroll ||
              false,
            canManageLeaveRequests:
              normalizedEditingUser.canManageLeaveRequests ||
              false,
            canManageCinemaSettings:
              normalizedEditingUser.canManageCinemaSettings ||
              false,
            canSendBroadcastMessages:
              normalizedEditingUser.canSendBroadcastMessages ||
              false,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response),
        );
      }

      const updatedUser =
        (await response.json()) as User;

      setUsers((previous) =>
        previous.map((user) =>
          user.id === updatedUser.id
            ? normalizeUser(updatedUser)
            : user,
        ),
      );
      setEditingUser(null);
    } catch (error) {
      showError(
        "Bruger kunne ikke opdateres",
        error instanceof Error
          ? error.message
          : "Kunne ikke opdatere bruger.",
      );
    }
  }

  function resetNewUser() {
    setNewUser({ ...emptyUser });
  }

  function closeCreateUserModal() {
    setShowCreate(false);
    resetNewUser();
  }

  function openCreateUserModal() {
    if (needsMasterCinemaSelection) {
      showError(
        "Biograf skal vælges",
        "Gå til MASTER-panelet og vælg hvilken biograf du vil administrere.",
      );
      return;
    }

    setEditingUser(null);
    resetNewUser();
    setShowCreate(true);
  }

  function openEditUserModal(user: User) {
    setEditingUser(
      withRequiredRolePermissions(
        getEditableUser(user),
      ),
    );
  }

  return {
    showCreate,
    setShowCreate,
    closeCreateUserModal,
    editingUser,
    setEditingUser,
    newUser,
    setNewUser,
    createUser,
    updateUser,
    openCreateUserModal,
    openEditUserModal,
  };
}
