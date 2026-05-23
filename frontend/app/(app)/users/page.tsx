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
  phone?: string;
  role: UserRole;
  employmentType?: EmploymentType;
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
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

function getEmploymentTypeLabel(employmentType?: EmploymentType) {
  if (employmentType === "SALARIED") return "Fastlønnet";
  return "Timelønnet";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  const [newUser, setNewUser] = useState<UserFormData>(emptyUser);

  useEffect(() => {
    fetchUsers();
  }, []);

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error("Kunne ikke hente brugere");

      const data = await response.json();

      const normalizedUsers = Array.isArray(data)
        ? data.map((user) => ({
            ...user,
            employmentType: user.employmentType || "HOURLY",
          }))
        : [];

      setUsers(normalizedUsers);
    } catch (error) {
      console.error(error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) return;

      const currentUser = JSON.parse(savedUser);

      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...newUser,
          employmentType: newUser.employmentType || "HOURLY",
          cinemaId: currentUser.cinemaId,
        }),
      });

      if (!response.ok) throw new Error("Kunne ikke oprette bruger");

      const createdUser = await response.json();

      setUsers((prev) => [
        ...prev,
        {
          ...createdUser,
          employmentType: createdUser.employmentType || "HOURLY",
        },
      ]);

      setShowCreate(false);
      setNewUser(emptyUser);
    } catch (error) {
      console.error(error);
      alert("Fejl ved oprettelse");
    }
  }

  async function updateUser() {
    if (!editingUser) return;

    try {
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
          phone: editingUser.phone,
          role: editingUser.role,
          employmentType: editingUser.employmentType || "HOURLY",
          canManageSchedule: editingUser.canManageSchedule,
          canManageUsers: editingUser.canManageUsers,
          canManagePayroll: editingUser.canManagePayroll,
          canManageLeaveRequests: editingUser.canManageLeaveRequests,
          canManageCinemaSettings: editingUser.canManageCinemaSettings,
          canSendBroadcastMessages: editingUser.canSendBroadcastMessages,
        }),
      });

      if (!response.ok) throw new Error("Kunne ikke opdatere bruger");

      const updatedUser = await response.json();

      setUsers((prev) =>
        prev.map((user) =>
          user.id === updatedUser.id
            ? {
                ...updatedUser,
                employmentType: updatedUser.employmentType || "HOURLY",
              }
            : user,
        ),
      );

      setEditingUser(null);
    } catch (error) {
      console.error(error);
      alert("Fejl ved opdatering");
    }
  }

  async function deleteUser(id: number) {
    const confirmed = confirm("Er du sikker på du vil slette brugeren?");

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error("Kunne ikke slette bruger");

      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error) {
      console.error(error);
      alert("Fejl ved sletning");
    }
  }

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="p-6">
          <p>Indlæser brugere...</p>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Brugere</h1>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Opret bruger
          </button>
        </div>

        {showCreate && (
          <UserModal
            title="Opret bruger"
            user={newUser}
            setUser={setNewUser}
            onClose={() => setShowCreate(false)}
            onSave={createUser}
            showPassword
          />
        )}

        {editingUser && (
          <UserModal
            title="Rediger bruger"
            user={{
              ...editingUser,
              employmentType: editingUser.employmentType || "HOURLY",
            }}
            setUser={setEditingUser}
            onClose={() => setEditingUser(null)}
            onSave={updateUser}
          />
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="p-4">Navn</th>
                <th className="p-4">Email</th>
                <th className="p-4">Telefon</th>
                <th className="p-4">Rolle</th>
                <th className="p-4">Ansættelse</th>
                <th className="p-4">Handlinger</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-4">
                    {user.firstName} {user.lastName}
                  </td>

                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.phone || "-"}</td>

                  <td className="p-4">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {user.role}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                      {getEmploymentTypeLabel(user.employmentType)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingUser({
                            ...user,
                            employmentType: user.employmentType || "HOURLY",
                          })
                        }
                        className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800"
                      >
                        Rediger
                      </button>

                      <button
                        onClick={() => deleteUser(user.id)}
                        className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
                      >
                        Slet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Ingen brugere fundet
            </div>
          )}
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
  showPassword = false,
}: {
  title: string;
  user: UserFormData | User;
  setUser: any;
  onClose: () => void;
  onSave: () => void;
  showPassword?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Fornavn"
            value={user.firstName}
            onChange={(e) => setUser({ ...user, firstName: e.target.value })}
            className="w-full rounded-lg border p-3"
          />

          <input
            type="text"
            placeholder="Efternavn"
            value={user.lastName}
            onChange={(e) => setUser({ ...user, lastName: e.target.value })}
            className="w-full rounded-lg border p-3"
          />

          <input
            type="email"
            placeholder="Email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className="w-full rounded-lg border p-3"
          />

          {showPassword && (
            <input
              type="password"
              placeholder="Password"
              value={(user as UserFormData).password || ""}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              className="w-full rounded-lg border p-3"
            />
          )}

          <input
            type="text"
            placeholder="Telefon"
            value={user.phone || ""}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
            className="w-full rounded-lg border p-3"
          />

          <select
            value={user.role}
            onChange={(e) =>
              setUser({
                ...user,
                role: e.target.value as UserRole,
              })
            }
            className="w-full rounded-lg border p-3"
          >
            <option value="EMPLOYEE">Medarbejder</option>
            <option value="ADMIN">Admin</option>
            <option value="MASTER">Master</option>
          </select>

          <select
            value={user.employmentType || "HOURLY"}
            onChange={(e) =>
              setUser({
                ...user,
                employmentType: e.target.value as EmploymentType,
              })
            }
            className="w-full rounded-lg border p-3"
          >
            <option value="HOURLY">Timelønnet</option>
            <option value="SALARIED">Fastlønnet</option>
          </select>

          <div className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Rettigheder</h3>

            <PermissionCheckbox
              label="Kan administrere vagtplan"
              checked={!!user.canManageSchedule}
              onChange={(checked) =>
                setUser({ ...user, canManageSchedule: checked })
              }
            />

            <PermissionCheckbox
              label="Kan administrere brugere"
              checked={!!user.canManageUsers}
              onChange={(checked) =>
                setUser({ ...user, canManageUsers: checked })
              }
            />

            <PermissionCheckbox
              label="Kan administrere løn"
              checked={!!user.canManagePayroll}
              onChange={(checked) =>
                setUser({ ...user, canManagePayroll: checked })
              }
            />

            <PermissionCheckbox
              label="Kan administrere fravær"
              checked={!!user.canManageLeaveRequests}
              onChange={(checked) =>
                setUser({ ...user, canManageLeaveRequests: checked })
              }
            />

            <PermissionCheckbox
              label="Kan administrere biografindstillinger"
              checked={!!user.canManageCinemaSettings}
              onChange={(checked) =>
                setUser({ ...user, canManageCinemaSettings: checked })
              }
            />

            <PermissionCheckbox
              label="Kan sende broadcast beskeder"
              checked={!!user.canSendBroadcastMessages}
              onChange={(checked) =>
                setUser({ ...user, canSendBroadcastMessages: checked })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2"
          >
            Annuller
          </button>

          <button
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Gem
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />

      <span>{label}</span>
    </label>
  );
}
