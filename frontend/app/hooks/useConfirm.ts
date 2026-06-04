"use client";

import { useState } from "react";

type ConfirmVariant = "danger" | "success" | "primary";

type ConfirmInput = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmVariant;
  onConfirm: () => Promise<void> | void;
};

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confirmText, setConfirmText] = useState("Bekræft");
  const [cancelText, setCancelText] = useState("Annuller");
  const [confirmVariant, setConfirmVariant] =
    useState<ConfirmVariant>("primary");

  const [onConfirmAction, setOnConfirmAction] = useState<
    (() => Promise<void> | void) | null
  >(null);

  function confirm(input: ConfirmInput) {
    setTitle(input.title);
    setDescription(input.description);
    setConfirmText(input.confirmText ?? "Bekræft");
    setCancelText(input.cancelText ?? "Annuller");
    setConfirmVariant(input.confirmVariant ?? "primary");
    setOnConfirmAction(() => input.onConfirm);
    setOpen(true);
  }

  async function handleConfirm() {
    if (!onConfirmAction) return;

    try {
      setLoading(true);
      await onConfirmAction();
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
    title,
    description,
    confirmText,
    cancelText,
    confirmVariant,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
