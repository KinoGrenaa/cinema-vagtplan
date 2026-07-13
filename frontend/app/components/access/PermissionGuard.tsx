"use client";

import { useEffect, useState } from "react";

type PermissionGuardProps = {
  children: React.ReactNode;
  permission:
    | "canManageSchedule"
    | "canManageUsers"
    | "canManagePayroll"
    | "canManageLeaveRequests"
    | "canManageCinemaSettings"
    | "canSendBroadcastMessages";
};

export default function PermissionGuard({
  children,
  permission,
}: PermissionGuardProps) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      setAllowed(false);
      setChecked(true);
      return;
    }

    const user = JSON.parse(savedUser);

    const isMaster = user.role === "MASTER";
    const isAdmin = user.role === "ADMIN";
    const hasPermission = user[permission] === true;

    setAllowed(isMaster || isAdmin || hasPermission);
    setChecked(true);
  }, [permission]);

  if (!checked) {
    return <div className="p-6">Kontrollerer adgang...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-2xl font-bold">Ingen adgang</h1>
          <p className="mt-2">Du har ikke rettigheder til denne funktion.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
