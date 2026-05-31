"use client";

import { useEffect, useState } from "react";
import PermissionGuard from "@/app/components/PermissionGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type UserRole = "MASTER" | "ADMIN" | "EMPLOYEE";
type EmploymentType = "HOURLY" | "SALARIED";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<UserFormData>(emptyUser);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

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
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Kunne ikke hente brugere.",
      );
      setUsers([]);
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
      setErrorMessage("");

      const validationError = validateCreateUser();

      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setErrorMessage("Du er ikke logget ind korrekt. Log ud og ind igen.");
        return;
      }

      const currentUser = JSON.parse(savedUser);

      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...newUser,
          firstName: newUser.firstName.trim(),
          lastName: newUser.lastName.trim(),
          email: newUser.email.trim(),
          phone: newUser.phone?.trim() || undefined,
          employmentType: newUser.employmentType || "HOURLY",
          cinemaId: currentUser.cinemaId,
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
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Kunne ikke oprette bruger.",
      );
    }
  }

  async function updateUser() {
    if (!editingUser) return;

    try {
      setErrorMessage("");

      const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Kunne ikke opdatere bruger.",
      );
    }
  }

  async function deactivateUser(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;

    const confirmed = confirm(
      `Er du sikker på, at du vil deaktivere ${fullName}?\n\n` +
        "Brugeren kan ikke længere logge ind.\n\n" +
        "Tidligere vagter, tidsregistreringer, lønhistorik, beskeder og anden historik bevares.\n\n" +
        "Brugeren kan genaktiveres senere.",
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
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
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kunne ikke deaktivere bruger.",
      );
    }
  }

  async function reactivateUser(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;

    const confirmed = confirm(
      `Vil du genaktivere ${fullName}?\n\nBrugeren vil igen kunne logge ind.`,
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");

      const response = await fetch(`${API_URL}/users/${user.id}/reactivate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
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
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kunne ikke genaktivere bruger.",
      );
    }
  }

  const visibleUsers = showInactive
    ? users
    : users.filter((user) => user.isActive !== false);

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="p-6 text-gray-900 dark:text-gray-100">
          Indlæser brugere...
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="p-6 text-gray-900 dark:text-gray-100">
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
              setErrorMessage("");
              setShowCreate(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Opret bruger
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        {showCreate && (
          <UserModal
            title="Opret bruger"
            user={newUser}
            setUser={setNewUser}
            onClose={() => {
              setShowCreate(false);
              setErrorMessage("");
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
              setErrorMessage("");
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
                    Ingen brugere fundet.
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
                          setErrorMessage("");
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
