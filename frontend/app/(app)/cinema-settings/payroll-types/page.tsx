"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import { useConfirm } from "@/app/hooks/useConfirm";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";

type PayrollType = {
  id: number;
  name: string;
  payrollCode: string;
  exportCode?: string | null;
  description?: string | null;
  color?: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export default function PayrollTypesPage() {
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [payrollCode, setPayrollCode] = useState("");
  const [exportCode, setExportCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState("");
  const confirmDialog = useConfirm();

  useEffect(() => {
    fetchPayrollTypes();
  }, []);

  async function fetchPayrollTypes() {
    try {
      setLoading(true);

      const response = await apiFetch("/payroll-types");

      if (!response.ok) {
        throw new Error("Kunne ikke hente lønarter");
      }

      const data = await response.json();
      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setPayrollTypes([]);
    } finally {
      setLoading(false);
    }
  }

  async function createPayrollType() {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch("/payroll-types", {
        method: "POST",
        body: JSON.stringify({
          name,
          payrollCode,
          exportCode,
          description,
          color,
          isDefault,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Kunne ikke oprette lønart";

        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {}

        throw new Error(errorMessage);
      }

      setName("");
      setPayrollCode("");
      setExportCode("");
      setDescription("");
      setColor("#2563eb");
      setIsDefault(false);

      await fetchPayrollTypes();

      setMessage("Lønart oprettet.");
    } catch (error: any) {
      setMessage(error?.message || "Kunne ikke oprette lønart.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(payrollType: PayrollType) {
    try {
      const response = await apiFetch(`/payroll-types/${payrollType.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: !payrollType.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke opdatere lønart");
      }

      await fetchPayrollTypes();
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke opdatere lønart");
    }
  }

  async function setDefault(payrollType: PayrollType) {
    try {
      const response = await apiFetch(`/payroll-types/${payrollType.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isDefault: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke vælge standard lønart");
      }

      await fetchPayrollTypes();
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke vælge standard lønart");
    }
  }

  async function removePayrollType(id: number) {
    confirmDialog.confirm({
      title: "Slet lønart",
      description: "Er du sikker på at du vil slette denne lønart?",
      confirmText: "Slet",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`/payroll-types/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Kunne ikke slette lønart");
          }

          await fetchPayrollTypes();

          toast.success("Lønart slettet");
        } catch (error) {
          console.error(error);
          toast.error("Kunne ikke slette lønart");
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold">Løn setup</h1>
            <p className="mt-2 text-gray-600">
              Administrer lønarter, eksportkoder og standard løntype.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold">Opret lønart</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <input
                type="text"
                placeholder="Navn"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-xl border p-3"
              />

              <input
                type="text"
                placeholder="Lønkode"
                value={payrollCode}
                onChange={(event) => setPayrollCode(event.target.value)}
                className="rounded-xl border p-3"
              />

              <input
                type="text"
                placeholder="Eksportkode"
                value={exportCode}
                onChange={(event) => setExportCode(event.target.value)}
                className="rounded-xl border p-3"
              />

              <input
                type="text"
                placeholder="Beskrivelse"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="rounded-xl border p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border p-3">
                <span className="text-sm font-medium">Farve</span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-16"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => setIsDefault(event.target.checked)}
                />
                <span>Standard lønart</span>
              </label>
            </div>

            <button
              onClick={createPayrollType}
              disabled={saving || !name || !payrollCode}
              className="mt-6 rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Gemmer..." : "Opret lønart"}
            </button>

            {message && (
              <div className="mt-4 rounded-xl bg-gray-100 p-4 text-sm">
                {message}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Lønarter</h2>
              <div className="text-sm text-gray-500">
                {payrollTypes.length} lønarter
              </div>
            </div>

            {loading ? (
              <div>Indlæser...</div>
            ) : payrollTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                Ingen lønarter oprettet endnu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Farve</th>
                      <th className="p-3">Navn</th>
                      <th className="p-3">Lønkode</th>
                      <th className="p-3">Eksportkode</th>
                      <th className="p-3">Beskrivelse</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Handlinger</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payrollTypes.map((payrollType) => (
                      <tr key={payrollType.id} className="border-b">
                        <td className="p-3">
                          <div
                            className="h-6 w-6 rounded-full border"
                            style={{
                              backgroundColor: payrollType.color || "#2563eb",
                            }}
                          />
                        </td>

                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-2">
                            {payrollType.name}

                            {payrollType.isDefault && (
                              <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                STANDARD
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">{payrollType.payrollCode}</td>

                        <td className="p-3">{payrollType.exportCode || "-"}</td>

                        <td className="p-3">
                          {payrollType.description || "-"}
                        </td>

                        <td className="p-3">
                          {payrollType.isActive ? (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                              Aktiv
                            </span>
                          ) : (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                              Inaktiv
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleActive(payrollType)}
                              className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                            >
                              {payrollType.isActive ? "Deaktiver" : "Aktiver"}
                            </button>

                            {!payrollType.isDefault && (
                              <button
                                onClick={() => setDefault(payrollType)}
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                Sæt som standard
                              </button>
                            )}

                            <button
                              onClick={() => removePayrollType(payrollType.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Slet
                            </button>
                          </div>
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
    </AdminGuard>
  );
}
