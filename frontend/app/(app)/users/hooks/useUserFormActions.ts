"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  getActiveCinemaId,
  getEditableUser,
  getErrorMessage,
  getStoredCurrentUser,
  getStoredMasterCinemaId,
  normalizeUser,
} from "../helpers/userHelpers";
import {
  emptyUser,
  type CurrentUser,
  type User,
  type UserFormData,
} from "../helpers/userTypes";

type UseUserFormActionsOptions = {
  currentUser: CurrentUser | null;
  selectedMasterCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  setUsers: Dispatch<SetStateAction<User[]>>;
  showError: (title: string, description: string) => void;
};

export function useUserFormActions({
  currentUser,
  selectedMasterCinemaId,
  needsMasterCinemaSelection,
  setUsers,
  showError,
}: UseUserFormActionsOptions) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<UserFormData>(emptyUser);

  function validateCreateUser() {
    if (!newUser.firstName.trim()) return "Fornavn mangler.";
    if (!newUser.lastName.trim()) return "Efternavn mangler.";
    if (!newUser.email.trim()) return "Email mangler.";
    if (!newUser.email.includes("@")) return "Indtast en gyldig emailadresse.";

    if (!newUser.password || newUser.password.length < 6) {
      return "Password skal være mindst 6 tegn.";
    }

    return "";
  }

  async function createUser() {
    try {
      const validationError = validateCreateUser();

      if (validationError) {
        showError("Bruger kunne ikke oprettes", validationError);
        return;
      }

      const userForRequest = currentUser || getStoredCurrentUser();
      const masterCinemaIdForRequest =
        selectedMasterCinemaId || getStoredMasterCinemaId();
      const activeCinemaId = getActiveCinemaId(
        userForRequest,
        masterCinemaIdForRequest,
      );

      if (!userForRequest) {
        showError(
          "Bruger kunne ikke oprettes",
          "Du er ikke logget ind korrekt. Log ud og ind igen.",
        );
        return;
      }

      if (newUser.role !== "MASTER" && !activeCinemaId) {
        showError(
          "Biograf skal vælges",
          userForRequest.role === "MASTER"
            ? "Gå til MASTER-panelet og vælg hvilken biograf brugeren skal oprettes i."
            : "Din bruger er ikke tilknyttet en biograf. Kontakt en administrator.",
        );
        return;
      }

      const response = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          ...newUser,
          firstName: newUser.firstName.trim(),
          lastName: newUser.lastName.trim(),
          email: newUser.email.trim(),
          phone: newUser.phone?.trim() || undefined,
          employmentType: newUser.employmentType || "HOURLY",
          cinemaId: newUser.role === "MASTER" ? null : activeCinemaId,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const createdUser = await response.json();

      setUsers((prev) => [...prev, normalizeUser(createdUser)]);

      setShowCreate(false);
      setNewUser(emptyUser);
    } catch (error) {
      showError(
        "Bruger kunne ikke oprettes",
        error instanceof Error ? error.message : "Kunne ikke oprette bruger.",
      );
    }
  }

  async function updateUser() {
    if (!editingUser) return;

    try {
      const response = await apiFetch(`/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          phone: editingUser.phone || undefined,
          role: editingUser.role,
          employmentType: editingUser.employmentType || "HOURLY",
          canManageSchedule: editingUser.canManageSchedule || false,
          canManageUsers: editingUser.canManageUsers || false,
          canManagePayroll: editingUser.canManagePayroll || false,
          canManageLeaveRequests: editingUser.canManageLeaveRequests || false,
          canManageCinemaSettings: editingUser.canManageCinemaSettings || false,
          canSendBroadcastMessages:
            editingUser.canSendBroadcastMessages || false,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const updatedUser = await response.json();

      setUsers((prev) =>
        prev.map((user) =>
          user.id === updatedUser.id ? normalizeUser(updatedUser) : user,
        ),
      );

      setEditingUser(null);
    } catch (error) {
      showError(
        "Bruger kunne ikke opdateres",
        error instanceof Error ? error.message : "Kunne ikke opdatere bruger.",
      );
    }
  }

  function openCreateUserModal() {
    if (needsMasterCinemaSelection) {
      showError(
        "Biograf skal vælges",
        "Gå til MASTER-panelet og vælg hvilken biograf du vil administrere.",
      );
      return;
    }

    setShowCreate(true);
  }

  function openEditUserModal(user: User) {
    setEditingUser(getEditableUser(user));
  }

  return {
    showCreate,
    setShowCreate,
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
