"use client";

import { useEffect, useState } from "react";
import PermissionGuard from "@/app/components/PermissionGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { EditUserModal, UserModal } from "./components/UserFormModal";
import {
  emptyUser,
  type CurrentUser,
  type User,
  type UserFormData,
} from "./helpers/userTypes";
import {
  buildUsersEndpoint,
  getActiveCinemaId,
  getEditableUser,
  getEmploymentTypeLabel,
  getErrorMessage,
  getRoleLabel,
  getStoredCurrentUser,
  getStoredMasterCinemaId,
  getStoredMasterCinemaName,
  normalizeUser,
  normalizeUsers,
} from "./helpers/userHelpers";

export default function UsersPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [selectedMasterCinemaName, setSelectedMasterCinemaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<UserFormData>(emptyUser);

  useEffect(() => {
    const storedUser = getStoredCurrentUser();
    const storedMasterCinemaId = getStoredMasterCinemaId();
    const storedMasterCinemaName = getStoredMasterCinemaName();

    setCurrentUser(storedUser);
    setSelectedMasterCinemaId(storedMasterCinemaId);
    setSelectedMasterCinemaName(storedMasterCinemaName);

    fetchUsers(storedUser, storedMasterCinemaId);
  }, []);

  async function fetchUsers(
    userForRequest = currentUser,
    masterCinemaIdForRequest = selectedMasterCinemaId,
  ) {
    try {
      setLoading(true);

      const endpoint = buildUsersEndpoint(
        userForRequest,
        masterCinemaIdForRequest,
      );

      if (!endpoint) {
        setUsers([]);
        return;
      }

      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();

      setUsers(normalizeUsers(data));
    } catch (error) {
      setUsers([]);

      infoDialog.showError(
        "Kunne ikke hente brugere",
        error instanceof Error ? error.message : "Kunne ikke hente brugere.",
      );
    } finally {
      setLoading(false);
    }
  }

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
        infoDialog.showError("Bruger kunne ikke oprettes", validationError);
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
        infoDialog.showError(
          "Bruger kunne ikke oprettes",
          "Du er ikke logget ind korrekt. Log ud og ind igen.",
        );
        return;
      }

      if (newUser.role !== "MASTER" && !activeCinemaId) {
        infoDialog.showError(
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

      setUsers((prev) => [
        ...prev,
        normalizeUser(createdUser),
      ]);

      setShowCreate(false);
      setNewUser(emptyUser);
    } catch (error) {
      infoDialog.showError(
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
      infoDialog.showError(
        "Bruger kunne ikke opdateres",
        error instanceof Error ? error.message : "Kunne ikke opdatere bruger.",
      );
    }
  }

  function deactivateUser(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;

    confirmDialog.confirm({
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
          infoDialog.showError(
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

    confirmDialog.confirm({
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
          infoDialog.showError(
            "Bruger kunne ikke genaktiveres",
            error instanceof Error
              ? error.message
              : "Kunne ikke genaktivere bruger.",
          );
        }
      },
    });
  }

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  const visibleUsers = showInactive
    ? users
    : users.filter((user) => user.isActive !== false);

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          Indlæser brugere...
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Brugere</h1>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
              />
              Vis deaktiverede brugere
            </label>
          </div>

          <button
            onClick={() => {
              if (needsMasterCinemaSelection) {
                infoDialog.showError(
                  "Biograf skal vælges",
                  "Gå til MASTER-panelet og vælg hvilken biograf du vil administrere.",
                );
                return;
              }

              setShowCreate(true);
            }}
            className={`rounded-lg px-4 py-2 text-white ${
              needsMasterCinemaSelection
                ? "cursor-not-allowed bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={needsMasterCinemaSelection}
          >
            Opret bruger
          </button>
        </div>

        {needsMasterCinemaSelection && (
          <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="text-sm font-medium uppercase tracking-wide">
              Biograf mangler
            </div>

            <p className="mt-2 text-sm">
              Vælg først en biograf i MASTER-panelet, før du administrerer
              brugere.
            </p>

            <a
              href="/master"
              className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
            >
              Gå til MASTER-panel
            </a>
          </div>
        )}

        {showCreate && (
          <UserModal
            title="Opret bruger"
            user={newUser}
            setUser={setNewUser}
            onClose={() => {
              setShowCreate(false);
            }}
            onSave={createUser}
            showPassword
          />
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            setUser={setEditingUser}
            onClose={() => {
              setEditingUser(null);
            }}
            onSave={updateUser}
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              <tr>
                <th className="p-4">Navn</th>
                <th className="p-4">Email</th>
                <th className="p-4">Telefon</th>
                <th className="p-4">Rolle</th>
                <th className="p-4">Ansættelse</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Handlinger</th>
              </tr>
            </thead>

            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {needsMasterCinemaSelection
                      ? "Vælg en biograf i MASTER-panelet."
                      : "Ingen brugere fundet."}
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-t border-gray-200 dark:border-gray-800 ${
                      user.isActive === false
                        ? "bg-gray-50 dark:bg-gray-950"
                        : ""
                    }`}
                  >
                    <td className="p-4 font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">{user.phone || "-"}</td>
                    <td className="p-4">{getRoleLabel(user.role)}</td>
                    <td className="p-4">
                      {getEmploymentTypeLabel(user.employmentType)}
                    </td>
                    <td className="p-4">
                      {user.isActive === false ? (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Deaktiveret
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Aktiv
                        </span>
                      )}
                    </td>
                    <td className="space-x-2 p-4 text-right">
                      <button
                        onClick={() => {
                          setEditingUser(getEditableUser(user));
                        }}
                        className="rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        Rediger
                      </button>

                      {user.isActive === false ? (
                        <button
                          onClick={() => reactivateUser(user)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          Genaktivér
                        </button>
                      ) : (
                        <button
                          onClick={() => deactivateUser(user)}
                          className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700"
                        >
                          Deaktivér
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ConfirmModal
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.handleConfirm}
          onCancel={confirmDialog.handleCancel}
        />

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </div>
    </PermissionGuard>
  );
}