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
      window.location.href = "/dashboard";
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, []);

  if (!checked) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}