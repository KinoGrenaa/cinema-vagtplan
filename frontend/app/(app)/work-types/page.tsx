"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PayrollType = {
  id: number;
  name: string;
  payrollCode: string;
};

type WorkType = {
  id: number;
  name: string;
  color?: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  payrollTypeId?: number | null;
  payrollType?: PayrollType | null;
};

type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number;
};

function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    return decoded;
  } catch {
    return null;
  }
}

export default function WorkTypesPage() {
  const confirmDialog = useConfirm();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [payrollTypeId, setPayrollTypeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const isMaster = currentUser?.role === "MASTER";

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());
  }, []);

  useEffect(() => {
    if (!isMaster && showArchived) {
      setShowArchived(false);
    }
  }, [isMaster, showArchived]);

  useEffect(() => {
    fetchWorkTypes();
  }, [showArchived]);

  useEffect(() => {
    fetchPayrollTypes();
  }, []);

  async function fetchWorkTypes() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/work-types?includeArchived=${showArchived}`,
        {
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setWorkTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setWorkTypes([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayrollTypes() {
    try {
      const response = await fetch(`${API_URL}/payroll-types`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setPayrollTypes([]);
    }
  }

  async function createWorkType() {
    try {
      const response = await fetch(`${API_URL}/work-types`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          color,
          payrollTypeId: payrollTypeId ? Number(payrollTypeId) : null,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      setName("");
      setColor("#2563eb");
      setPayrollTypeId("");

      await fetchWorkTypes();
    } catch (error) {
      console.error(error);
      alert("Kunne ikke oprette vagttype");
    }
  }

  function removeWorkType(id: number) {
    confirmDialog.confirm({
      title: "Arkivér vagttype",
      description:
        "Er du sikker på, at du vil arkivere denne vagttype?\n\n" +
        "Historiske vagter, løndata og rapporter bevares.\n\n" +
        "Vagttypen kan genaktiveres senere.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/work-types/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);

            throw new Error(data?.message || "Kunne ikke arkivere vagttype");
          }

          await fetchWorkTypes();
        } catch (error) {
          console.error(error);

          alert(
            error instanceof Error
              ? error.message
              : "Kunne ikke arkivere vagttype",
          );
        }
      },
    });
  }

  function reactivateWorkType(id: number) {
    confirmDialog.confirm({
      title: "Genaktivér vagttype",
      description:
        "Vil du genaktivere denne vagttype?\n\n" +
        "Vagttypen kan igen bruges ved oprettelse og redigering af vagter.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `${API_URL}/work-types/${id}/reactivate`,
            {
              method: "PATCH",
              headers: getHeaders(),
            },
          );

          if (!response.ok) {
            const data = await response.json().catch(() => null);

            throw new Error(data?.message || "Kunne ikke genaktivere vagttype");
          }

          await fetchWorkTypes();
        } catch (error) {
          console.error(error);

          alert(
            error instanceof Error
              ? error.message
              : "Kunne ikke genaktivere vagttype",
          );
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold">Vagttyper</h1>

            <p className="mt-2 text-gray-600">
              Administrer vagttyper og kobling til lønarter.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold">Opret vagttype</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Navn"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-xl border p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border p-3">
                <span>Farve</span>

                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>

              <select
                value={payrollTypeId}
                onChange={(event) => setPayrollTypeId(event.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="">Ingen lønart</option>

                {payrollTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.payrollCode})
                  </option>
                ))}
              </select>

              <button
                onClick={createWorkType}
                className="rounded-xl bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Opret
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold">Eksisterende vagttyper</h2>

              {isMaster && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Vis arkiverede typer
                </label>
              )}
            </div>

            {loading ? (
              <div>Indlæser...</div>
            ) : workTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                Ingen vagttyper endnu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Farve</th>
                      <th className="p-3">Navn</th>
                      <th className="p-3">Løntype</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Handlinger</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workTypes.map((workType) => (
                      <tr
                        key={workType.id}
                        className={`border-b ${
                          workType.isActive ? "" : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        <td className="p-3">
                          <div
                            className="h-6 w-6 rounded-full border"
                            style={{
                              backgroundColor: workType.color || "#2563eb",
                            }}
                          />
                        </td>

                        <td className="p-3 font-semibold">{workType.name}</td>

                        <td className="p-3">
                          {workType.payrollType
                            ? `${workType.payrollType.name} (${workType.payrollType.payrollCode})`
                            : "-"}
                        </td>

                        <td className="p-3">
                          {workType.isActive ? (
                            <span className="font-semibold text-green-600">
                              Aktiv
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-500">
                              Arkiveret
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {workType.isActive ? (
                            <button
                              onClick={() => removeWorkType(workType.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Arkivér
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateWorkType(workType.id)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Genaktivér
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

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
    </AdminGuard>
  );
}
