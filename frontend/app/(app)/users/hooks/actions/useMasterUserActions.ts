"use client";

import { useState } from "react";
import type {
  Dispatch,
  SetStateAction,
} from "react";

import { apiFetch } from "@/app/lib/api";

import type { MasterUserFormData } from "../../components/form/MasterUserFormModal";
import {
  getErrorMessage,
  normalizeUser,
} from "../../helpers/core/userHelpers";
import type { User } from "../../helpers/core/userTypes";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "success";
  onConfirm: () => Promise<void>;
};

type UseMasterUserActionsOptions = {
  setMasterUsers: Dispatch<SetStateAction<User[]>>;
  confirm: (options: ConfirmOptions) => void;
  showError: (title: string, description: string) => void;
};

const emptyMasterForm: MasterUserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
};

function sortMasterUsers(users: User[]) {
  return [...users].sort((first, second) =>
    `${first.firstName} ${first.lastName}`.localeCompare(
      `${second.firstName} ${second.lastName}`,
      "da",
    ),
  );
}

export function useMasterUserActions({
  setMasterUsers,
  confirm,
  showError,
}: UseMasterUserActionsOptions) {
  const [mode, setMode] = useState<"create" | "edit" | null>(
    null,
  );
  const [editingUser, setEditingUser] =
    useState<User | null>(null);
  const [form, setForm] =
    useState<MasterUserFormData>(emptyMasterForm);
  const [saving, setSaving] = useState(false);

  function closeModal() {
    if (saving) {
      return;
    }

    setMode(null);
    setEditingUser(null);
    setForm({ ...emptyMasterForm });
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ ...emptyMasterForm });
    setMode("create");
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
    });
    setMode("edit");
  }

  function validateForm() {
    if (!form.firstName.trim()) {
      return "Fornavn mangler.";
    }

    if (!form.lastName.trim()) {
      return "Efternavn mangler.";
    }

    if (!form.email.trim() || !form.email.includes("@")) {
      return "Indtast en gyldig emailadresse.";
    }

    if (mode === "create" && form.password.length < 8) {
      return "Adgangskode skal være mindst 8 tegn.";
    }

    if (
      mode === "edit" &&
      form.password &&
      form.password.length < 8
    ) {
      return "En ny adgangskode skal være mindst 8 tegn.";
    }

    return "";
  }

  async function save() {
    if (!mode) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      showError(
        mode === "create"
          ? "MASTER-bruger kunne ikke oprettes"
          : "MASTER-bruger kunne ikke opdateres",
        validationError,
      );
      return;
    }

    try {
      setSaving(true);

      const isCreate = mode === "create";
      const endpoint = isCreate
        ? "/users"
        : `/users/${editingUser?.id}`;
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: "MASTER",
        employmentType:
          editingUser?.employmentType ?? "HOURLY",
        cinemaId: null,
        ...(isCreate || form.password
          ? { password: form.password }
          : {}),
      };

      const response = await apiFetch(endpoint, {
        method: isCreate ? "POST" : "PATCH",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const savedUser = normalizeUser(
        (await response.json()) as User,
      );

      setMasterUsers((current) =>
        sortMasterUsers(
          isCreate
            ? [...current, savedUser]
            : current.map((user) =>
                user.id === savedUser.id
                  ? savedUser
                  : user,
              ),
        ),
      );

      setSaving(false);
      setMode(null);
      setEditingUser(null);
      setForm({ ...emptyMasterForm });
    } catch (error) {
      showError(
        mode === "create"
          ? "MASTER-bruger kunne ikke oprettes"
          : "MASTER-bruger kunne ikke opdateres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl.",
      );
      setSaving(false);
    }
  }

  function deactivate(user: User) {
    const fullName =
      `${user.firstName} ${user.lastName}`.trim();

    confirm({
      title: "Deaktivér MASTER-bruger",
      description:
        `Er du sikker på, at du vil deaktivere ${fullName}?\n\n` +
        "Brugeren kan ikke længere logge ind, men historikken bevares.",
      confirmText: "Deaktivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            `/users/${user.id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response),
            );
          }

          const updatedUser = normalizeUser(
            (await response.json()) as User,
          );

          setMasterUsers((current) =>
            current.map((existingUser) =>
              existingUser.id === user.id
                ? {
                    ...existingUser,
                    ...updatedUser,
                    isActive: false,
                  }
                : existingUser,
            ),
          );
        } catch (error) {
          showError(
            "MASTER-bruger kunne ikke deaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke deaktivere brugeren.",
          );
        }
      },
    });
  }

  function reactivate(user: User) {
    const fullName =
      `${user.firstName} ${user.lastName}`.trim();

    confirm({
      title: "Genaktivér MASTER-bruger",
      description: `Vil du genaktivere ${fullName}?\n\nBrugeren vil igen kunne logge ind.`,
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            `/users/${user.id}/reactivate`,
            {
              method: "PATCH",
            },
          );

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response),
            );
          }

          const updatedUser = normalizeUser(
            (await response.json()) as User,
          );

          setMasterUsers((current) =>
            current.map((existingUser) =>
              existingUser.id === user.id
                ? {
                    ...existingUser,
                    ...updatedUser,
                    isActive: true,
                    deactivatedAt: null,
                  }
                : existingUser,
            ),
          );
        } catch (error) {
          showError(
            "MASTER-bruger kunne ikke genaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke genaktivere brugeren.",
          );
        }
      },
    });
  }

  return {
    mode,
    form,
    setForm,
    saving,
    openCreate,
    openEdit,
    closeModal,
    save,
    deactivate,
    reactivate,
  };
}
