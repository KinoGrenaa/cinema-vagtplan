"use client";

import { useEffect, useState } from "react";
import PermissionGuard from "@/app/components/PermissionGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

type UserRole = "MASTER" | "ADMIN" | "EMPLOYEE";
type EmploymentType = "HOURLY" | "SALARIED";

type CurrentUser = {
  id?: number;
  sub?: number;
  role: UserRole;
  cinemaId: number | null;
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  employmentType?: EmploymentType;
  isActive?: boolean;
  deactivatedAt?: string | null;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
  cinemaId?: number | null;
  cinema?: {
    id: number;
    name: string;
  } | null;
};

type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  employmentType: EmploymentType;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
};

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";

const emptyUser: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  role: "EMPLOYEE",
  employmentType: "HOURLY",
  canManageSchedule: false,
  canManageUsers: false,
  canManagePayroll: false,
  canManageLeaveRequests: false,
  canManageCinemaSettings: false,
  canSendBroadcastMessages: false,
};

function getEmploymentTypeLabel(employmentType?: EmploymentType) {
  if (employmentType === "SALARIED") return "Fastlønnet";
  return "Timelønnet";
}

function getRoleLabel(role: UserRole) {
  if (role === "MASTER") return "Master";
  if (role === "ADMIN") return "Admin";
  return "Medarbejder";
}

function translateApiError(message: string) {
  if (
    message.includes("password must be longer than or equal to 6 characters")
  ) {
    return "Password skal være mindst 6 tegn.";
  }

  if (message.includes("email must be an email")) {
    return "Indtast en gyldig emailadresse.";
  }

  if (message.includes("firstName")) return "Fornavn mangler.";
  if (message.includes("lastName")) return "Efternavn mangler.";
  if (message.includes("email")) return "Email mangler eller er ugyldig.";

  return message;
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.map(translateApiError).join("\n");
    }

    if (typeof data.message === "string") {
      return translateApiError(data.message);
    }

    return "Der opstod en ukendt fejl.";
  } catch {
    return "Der opstod en ukendt fejl.";
  }
}

function getStoredCurrentUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as CurrentUser;
  } catch {
    return null;
  }
}

function getStoredMasterCinemaId() {
  const savedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (Number.isInteger(savedCinemaId) && savedCinemaId > 0) {
    return savedCinemaId;
  }

  return null;
}

function getStoredMasterCinemaName() {
  return localStorage.getItem(MASTER_SELECTED_CINEMA_NAME_KEY) || "";
}

function getActiveCinemaId(
  user: CurrentUser | null,
  selectedMasterCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    return selectedMasterCinemaId;
  }

  return user.cinemaId;
}

function buildUsersEndpoint(
  user: CurrentUser | null,
  selectedMasterCinemaId: number | null,
) {
  if (!user) {
    return null;
  }

  if (user.role === "MASTER" && !user.cinemaId) {
    if (!selectedMasterCinemaId) {
      return null;
    }

    return `/users?cinemaId=${selectedMasterCinemaId}`;
  }

  return "/users";
}

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

      const normalizedUsers = Array.isArray(data)
        ? data.map((user) => ({
            ...user,
            employmentType: user.employmentType || "HOURLY",
            isActive: user.isActive !== false,
          }))
        : [];

      setUsers(normalizedUsers);
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
        {
          ...createdUser,
          employmentType: createdUser.employmentType || "HOURLY",
          isActive: createdUser.isActive !== false,
        },
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
          user.id === updatedUser.id
            ? {
                ...updatedUser,
                employmentType: updatedUser.employmentType || "HOURLY",
                isActive: updatedUser.isActive !== false,
              }
            : user,
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
                          setEditingUser({
                            ...user,
                            employmentType: user.employmentType || "HOURLY",
                            canManageSchedule: user.canManageSchedule || false,
                            canManageUsers: user.canManageUsers || false,
                            canManagePayroll: user.canManagePayroll || false,
                            canManageLeaveRequests:
                              user.canManageLeaveRequests || false,
                            canManageCinemaSettings:
                              user.canManageCinemaSettings || false,
                            canSendBroadcastMessages:
                              user.canSendBroadcastMessages || false,
                          });
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

function UserModal({
  title,
  user,
  setUser,
  onClose,
  onSave,
  showPassword,
}: {
  title: string;
  user: UserFormData;
  setUser: (user: UserFormData) => void;
  onClose: () => void;
  onSave: () => void;
  showPassword?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Fornavn"
            value={user.firstName}
            onChange={(value) => setUser({ ...user, firstName: value })}
          />

          <Input
            label="Efternavn"
            value={user.lastName}
            onChange={(value) => setUser({ ...user, lastName: value })}
          />

          <Input
            label="Email"
            type="email"
            value={user.email}
            onChange={(value) => setUser({ ...user, email: value })}
          />

          <Input
            label="Telefon"
            value={user.phone || ""}
            onChange={(value) => setUser({ ...user, phone: value })}
          />

          {showPassword && (
            <div>
              <Input
                label="Password"
                type="password"
                value={user.password || ""}
                onChange={(value) => setUser({ ...user, password: value })}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Password skal være mindst 6 tegn.
              </p>
            </div>
          )}

          <label className="space-y-1">
            <span className="text-sm font-medium">Rolle</span>
            <select
              value={user.role === "MASTER" ? "ADMIN" : user.role}
              onChange={(event) =>
                setUser({ ...user, role: event.target.value as UserRole })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="EMPLOYEE">Medarbejder</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Ansættelsestype</span>
            <select
              value={user.employmentType}
              onChange={(event) =>
                setUser({
                  ...user,
                  employmentType: event.target.value as EmploymentType,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="HOURLY">Timelønnet</option>
              <option value="SALARIED">Fastlønnet</option>
            </select>
          </label>
        </div>

        <PermissionFields user={user} setUser={setUser} />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Annuller
          </button>

          <button
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Gem
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  setUser,
  onClose,
  onSave,
}: {
  user: User;
  setUser: (user: User) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const formUser: UserFormData = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    employmentType: user.employmentType || "HOURLY",
    canManageSchedule: user.canManageSchedule || false,
    canManageUsers: user.canManageUsers || false,
    canManagePayroll: user.canManagePayroll || false,
    canManageLeaveRequests: user.canManageLeaveRequests || false,
    canManageCinemaSettings: user.canManageCinemaSettings || false,
    canSendBroadcastMessages: user.canSendBroadcastMessages || false,
  };

  function updateForm(nextUser: UserFormData) {
    setUser({
      ...user,
      ...nextUser,
    });
  }

  return (
    <UserModal
      title="Rediger bruger"
      user={formUser}
      setUser={updateForm}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
      />
    </label>
  );
}

function PermissionFields({
  user,
  setUser,
}: {
  user: UserFormData;
  setUser: (user: UserFormData) => void;
}) {
  const permissions: {
    key: keyof UserFormData;
    label: string;
  }[] = [
    { key: "canManageSchedule", label: "Kan administrere vagtplan" },
    { key: "canManageUsers", label: "Kan administrere brugere" },
    { key: "canManagePayroll", label: "Kan administrere løn" },
    { key: "canManageLeaveRequests", label: "Kan administrere fravær" },
    {
      key: "canManageCinemaSettings",
      label: "Kan administrere biografindstillinger",
    },
    {
      key: "canSendBroadcastMessages",
      label: "Kan sende fællesbeskeder",
    },
  ];

  return (
    <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="mb-3 font-semibold">Rettigheder</h3>

      <div className="grid gap-3 md:grid-cols-2">
        {permissions.map((permission) => (
          <label key={permission.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(user[permission.key])}
              onChange={(event) =>
                setUser({
                  ...user,
                  [permission.key]: event.target.checked,
                })
              }
              className="h-4 w-4"
            />
            <span className="text-sm">{permission.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
