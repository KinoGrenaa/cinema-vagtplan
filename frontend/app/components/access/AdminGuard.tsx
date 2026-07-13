"use client";

import { useEffect, useState } from "react";

type AdminGuardProps = {
  children: React.ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/dashboard";
      return;
    }

    const user = JSON.parse(savedUser);
    const isAdmin = user.role === "ADMIN" || user.role === "MASTER";

    if (!isAdmin) {
      setAllowed(false);
      setChecked(true);
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Indlæser adgang...
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-2xl font-bold">Ingen adgang</h1>
          <p className="mt-2">
            Du har ikke rettigheder til at se denne side.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}