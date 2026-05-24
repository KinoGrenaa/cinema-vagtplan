"use client";

import { useState } from "react";

export function useConfirm() {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [onConfirmAction, setOnConfirmAction] = useState<
    (() => Promise<void>) | null
  >(null);

  function confirm(input: {
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }) {
    setTitle(input.title);
    setDescription(input.description);
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

    confirm,

    handleConfirm,
    handleCancel,
  };
}
