"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  changeUserFormRole,
  isPermissionRequiredForRole,
  USER_PERMISSION_FIELDS,
  withRequiredRolePermissions,
} from "../../helpers/core/userRolePermissions";
import type {
  EmploymentType,
  User,
  UserFormData,
  UserRole,
} from "../../helpers/core/userTypes";

type UserModalProps = {
  title: string;
  user: UserFormData;
  setUser: (user: UserFormData) => void;
  onClose: () => void;
  onSave: () => void;
  showPassword?: boolean;
};

export function UserModal({
  title,
  user,
  setUser,
  onClose,
  onSave,
  showPassword,
}: UserModalProps) {
  const preventCreateAutofill =
    Boolean(showPassword);
  const normalizedUser =
    withRequiredRolePermissions(user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-2xl font-bold">
          {title}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Fornavn"
            name={
              preventCreateAutofill
                ? "create-user-first-name"
                : undefined
            }
            value={normalizedUser.firstName}
            autoComplete={
              preventCreateAutofill
                ? "off"
                : undefined
            }
            preventBrowserAutofill={
              preventCreateAutofill
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                firstName: value,
              })
            }
          />

          <Input
            label="Efternavn"
            name={
              preventCreateAutofill
                ? "create-user-last-name"
                : undefined
            }
            value={normalizedUser.lastName}
            autoComplete={
              preventCreateAutofill
                ? "off"
                : undefined
            }
            preventBrowserAutofill={
              preventCreateAutofill
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                lastName: value,
              })
            }
          />

          <Input
            label="Email"
            type="email"
            name={
              preventCreateAutofill
                ? "create-user-email"
                : undefined
            }
            value={normalizedUser.email}
            autoComplete={
              preventCreateAutofill
                ? "off"
                : undefined
            }
            preventBrowserAutofill={
              preventCreateAutofill
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                email: value,
              })
            }
          />

          <Input
            label="Telefon"
            name={
              preventCreateAutofill
                ? "create-user-phone"
                : undefined
            }
            value={normalizedUser.phone || ""}
            autoComplete={
              preventCreateAutofill
                ? "off"
                : undefined
            }
            preventBrowserAutofill={
              preventCreateAutofill
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                phone: value,
              })
            }
          />

          {showPassword && (
            <div>
              <Input
                label="Password"
                type="password"
                name="create-user-password"
                value={
                  normalizedUser.password || ""
                }
                minLength={8}
                autoComplete="new-password"
                preventBrowserAutofill={
                  preventCreateAutofill
                }
                onChange={(value) =>
                  setUser({
                    ...normalizedUser,
                    password: value,
                  })
                }
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Adgangskode skal være mindst 8
                tegn.
              </p>
            </div>
          )}

          <label className="space-y-1">
            <span className="text-sm font-medium">
              Rolle
            </span>
            <select
              value={
                normalizedUser.role === "MASTER"
                  ? "ADMIN"
                  : normalizedUser.role
              }
              onChange={(event) =>
                setUser(
                  changeUserFormRole(
                    normalizedUser,
                    event.target
                      .value as UserRole,
                  ),
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
            >
              <option value="EMPLOYEE">
                Medarbejder
              </option>
              <option value="ADMIN">
                Admin
              </option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">
              Ansættelsestype
            </span>
            <select
              value={
                normalizedUser.employmentType
              }
              onChange={(event) =>
                setUser({
                  ...normalizedUser,
                  employmentType:
                    event.target
                      .value as EmploymentType,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
            >
              <option value="HOURLY">
                Timelønnet
              </option>
              <option value="SALARIED">
                Fastlønnet
              </option>
            </select>
          </label>

          <Input
            label="Ansættelsesdato"
            type="date"
            value={normalizedUser.hireDate}
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                hireDate: value,
              })
            }
          />

          <Input
            label="Medarbejdernummer"
            value={
              normalizedUser.employeeNumber
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                employeeNumber: value,
              })
            }
          />

          <Input
            label="Lønmedarbejder-ID"
            value={
              normalizedUser.payrollEmployeeId
            }
            onChange={(value) =>
              setUser({
                ...normalizedUser,
                payrollEmployeeId: value,
              })
            }
          />
        </div>

        <PermissionFields
          user={normalizedUser}
          setUser={setUser}
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>

          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
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
  const formUser =
    withRequiredRolePermissions<UserFormData>({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      employmentType:
        user.employmentType || "HOURLY",
      hireDate:
        user.hireDate?.slice(0, 10) || "",
      employeeNumber:
        user.employeeNumber || "",
      payrollEmployeeId:
        user.payrollEmployeeId || "",
      canManageSchedule:
        user.canManageSchedule || false,
      canManageUsers:
        user.canManageUsers || false,
      canManagePayroll:
        user.canManagePayroll || false,
      canManageLeaveRequests:
        user.canManageLeaveRequests || false,
      canManageCinemaSettings:
        user.canManageCinemaSettings || false,
      canSendBroadcastMessages:
        user.canSendBroadcastMessages || false,
    });

  function updateForm(
    nextUser: UserFormData,
  ) {
    setUser({
      ...user,
      ...withRequiredRolePermissions(
        nextUser,
      ),
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
  const [
    autofillBlocked,
    setAutofillBlocked,
  ] = useState(
    preventBrowserAutofill,
  );

  useEffect(() => {
    setAutofillBlocked(
      preventBrowserAutofill,
    );
  }, [preventBrowserAutofill]);

  function allowManualInput() {
    if (autofillBlocked) {
      setAutofillBlocked(false);
    }
  }

  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        minLength={minLength}
        value={
          autofillBlocked ? "" : value
        }
        readOnly={autofillBlocked}
        onFocus={allowManualInput}
        onPointerDown={allowManualInput}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
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
  const roleLabel =
    user.role === "ADMIN"
      ? "Admin"
      : user.role;

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
      <h3 className="font-semibold">
        Rettigheder
      </h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Rettigheder, der følger med rollen,
        er markeret og kan ikke fravælges.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {USER_PERMISSION_FIELDS.map(
          (permission) => {
            const requiredByRole =
              isPermissionRequiredForRole(
                user.role,
                permission.key,
              );

            return (
              <label
                key={permission.key}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <input
                  type="checkbox"
                  checked={Boolean(
                    user[permission.key],
                  )}
                  disabled={requiredByRole}
                  onChange={(event) => {
                    if (requiredByRole) {
                      return;
                    }

                    setUser({
                      ...user,
                      [permission.key]:
                        event.target.checked,
                    });
                  }}
                  className="mt-0.5 h-4 w-4 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-80 dark:focus-visible:ring-blue-400"
                />
                <span className="min-w-0 text-sm">
                  {permission.label}
                  {requiredByRole && (
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      Via rollen {roleLabel}
                    </span>
                  )}
                </span>
              </label>
            );
          },
        )}
      </div>
    </div>
  );
}
