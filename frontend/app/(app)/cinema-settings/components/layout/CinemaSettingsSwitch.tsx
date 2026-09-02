"use client";

import type { ChangeEventHandler } from "react";

type CinemaSettingsSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export default function CinemaSettingsSwitch({
  checked,
  disabled = false,
  ariaLabel,
  onChange,
}: CinemaSettingsSwitchProps) {
  return (
    <label
      className={`relative inline-flex h-7 w-12 shrink-0 items-center ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed dark:bg-slate-700 dark:peer-checked:bg-blue-500 dark:peer-focus-visible:ring-offset-slate-900"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
      />
    </label>
  );
}
