"use client";

import { useState } from "react";

type InputModalInput = {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  initialValue?: string;
  onConfirm: (value: string) => Promise<void> | void;
};

export function useInputModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState("");

  const [config, setConfig] = useState<InputModalInput | null>(null);

  function prompt(input: InputModalInput) {
    setConfig(input);
    setValue(input.initialValue ?? "");
    setOpen(true);
  }

  async function handleConfirm() {
    if (!config) return;

    try {
      setLoading(true);
      await config.onConfirm(value);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (loading) return;
    setOpen(false);
  }

  return {
    open,
    loading,
    value,
    setValue,
    title: config?.title ?? "",
    description: config?.description,
    label: config?.label,
    placeholder: config?.placeholder,
    confirmText: config?.confirmText,
    cancelText: config?.cancelText,
    required: config?.required,
    prompt,
    handleConfirm,
    handleCancel,
  };
}
