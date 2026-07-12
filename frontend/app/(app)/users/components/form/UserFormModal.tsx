"use client";

import { useEffect, useState } from "react";

import type {
  EmploymentType,
  User,
  UserFormData,
  UserRole,
} from "../../helpers/userTypes";

export function UserModal({
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
  const preventCreateAutofill = Boolean(showPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Fornavn"
            name={preventCreateAutofill ? "create-user-first-name" : undefined}
            value={user.firstName}
            autoComplete={preventCreateAutofill ? "off" : undefined}
            preventBrowserAutofill={preventCreateAutofill}
            onChange={(value) => setUser({ ...user, firstName: value })}
          />

          <Input
            label="Efternavn"
            name={preventCreateAutofill ? "create-user-last-name" : undefined}
            value={user.lastName}
            autoComplete={preventCreateAutofill ? "off" : undefined}
            preventBrowserAutofill={preventCreateAutofill}
            onChange={(value) => setUser({ ...user, lastName: value })}
          />

          <Input
            label="Email"
            type="email"
            name={preventCreateAutofill ? "create-user-email" : undefined}
            value={user.email}
            autoComplete={preventCreateAutofill ? "off" : undefined}
            preventBrowserAutofill={preventCreateAutofill}
            onChange={(value) => setUser({ ...user, email: value })}
          />

          <Input
            label="Telefon"
            name={preventCreateAutofill ? "create-user-phone" : undefined}
            value={user.phone || ""}
            autoComplete={preventCreateAutofill ? "off" : undefined}
            preventBrowserAutofill={preventCreateAutofill}
            onChange={(value) => setUser({ ...user, phone: value })}
          />

          {showPassword && (
            <div>
              <Input
                label="Password"
                type="password"
                name="create-user-password"
                value={user.password || ""}
                minLength={8}
                autoComplete="new-password"
                preventBrowserAutofill={preventCreateAutofill}
                onChange={(value) => setUser({ ...user, password: value })}
              />

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Adgangskode skal være mindst 8 tegn.
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

export function EditUserModal({
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
  minLength,
  name,
  autoComplete,
  preventBrowserAutofill = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  name?: string;
  autoComplete?: string;
  preventBrowserAutofill?: boolean;
}) {
  const [autofillBlocked, setAutofillBlocked] = useState(
    preventBrowserAutofill,
  );

  useEffect(() => {
    setAutofillBlocked(preventBrowserAutofill);
  }, [preventBrowserAutofill]);

  function allowManualInput() {
    if (autofillBlocked) {
      setAutofillBlocked(false);
    }
  }

  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        minLength={minLength}
        autoComplete={autoComplete}
        readOnly={autofillBlocked}
        onFocus={allowManualInput}
        onPointerDown={allowManualInput}
        onKeyDown={allowManualInput}
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
