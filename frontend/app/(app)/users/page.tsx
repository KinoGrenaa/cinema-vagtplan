"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";

type UserRole = "MASTER" | "ADMIN" | "EMPLOYEE";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "EMPLOYEE" as UserRole,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Kunne ikke hente brugere");
      }

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    try {
      const token = localStorage.getItem("token");

      const savedUser = localStorage.getItem("user");

      if (!savedUser) return;

      const currentUser = JSON.parse(savedUser);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newUser,
          cinemaId: currentUser.cinemaId,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke oprette bruger");
      }

      const createdUser = await response.json();

      setUsers((prev) => [...prev, createdUser]);

      setShowCreate(false);

      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        role: "EMPLOYEE",
      });
    } catch (error) {
      console.error(error);
      alert("Fejl ved oprettelse");
    }
  }

  async function updateUser() {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            phone: editingUser.phone,
            role: editingUser.role,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Kunne ikke opdatere bruger");
      }

      const updatedUser = await response.json();

      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
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
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Kunne ikke slette bruger");
      }

      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error) {
      console.error(error);
      alert("Fejl ved sletning");
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <div className="p-6">
          <p>Indlæser brugere...</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
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
            user={editingUser}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
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
    </AdminGuard>
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
  user: any;
  setUser: any;
  onClose: () => void;
  onSave: () => void;
  showPassword?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Fornavn"
            value={user.firstName}
            onChange={(e) =>
              setUser({
                ...user,
                firstName: e.target.value,
              })
            }
            className="w-full rounded-lg border p-3"
          />

          <input
            type="text"
            placeholder="Efternavn"
            value={user.lastName}
            onChange={(e) =>
              setUser({
                ...user,
                lastName: e.target.value,
              })
            }
            className="w-full rounded-lg border p-3"
          />

          <input
            type="email"
            placeholder="Email"
            value={user.email}
            onChange={(e) =>
              setUser({
                ...user,
                email: e.target.value,
              })
            }
            className="w-full rounded-lg border p-3"
          />

          {showPassword && (
            <input
              type="password"
              placeholder="Password"
              value={user.password}
              onChange={(e) =>
                setUser({
                  ...user,
                  password: e.target.value,
                })
              }
              className="w-full rounded-lg border p-3"
            />
          )}

          <input
            type="text"
            placeholder="Telefon"
            value={user.phone || ""}
            onChange={(e) =>
              setUser({
                ...user,
                phone: e.target.value,
              })
            }
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
            <option value="EMPLOYEE">EMPLOYEE</option>

            <option value="ADMIN">ADMIN</option>
          </select>
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
