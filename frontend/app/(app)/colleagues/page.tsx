"use client";

import { useCallback, useEffect, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

export default function ColleaguesPage() {
  const infoDialog = useInfoModal();

  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);

        infoDialog.showError(
          "Kollegaer kunne ikke hentes",
          await readErrorMessage(
            response,
            "Der opstod en fejl, da kollegaer skulle hentes.",
          ),
        );

        return;
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);

      infoDialog.showError(
        "Kollegaer kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kollegaer skulle hentes.",
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Kollegaer</h1>

            <p className="text-gray-500">Kontaktinformation for medarbejdere</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-xl p-5 bg-gray-50">
                <div className="text-xl font-bold">
                  {user.firstName} {user.lastName}
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Email:</span> {user.email}
                  </div>

                  <div>
                    <span className="font-semibold">Telefon:</span>{" "}
                    {user.phone || "-"}
                  </div>

                  <div>
                    <span className="font-semibold">Rolle:</span> {user.role}
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-gray-500">Ingen medarbejdere fundet</div>
            )}
          </div>
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
